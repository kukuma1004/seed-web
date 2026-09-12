import * as THREE from 'three';

export const LAW_PRESENTATION={
  reflect:{name:'거울 껍질',hint:'벽을 맞혀 돌아오는 각도를 노려보세요',color:0x8ce8ff},
  split:{name:'갈라진 꽃',hint:'앞의 적을 맞혀 뒤쪽 무리로 파편을 보내세요',color:0xffaa8a},
  chain:{name:'번개 가지',hint:'가까이 모인 적들 사이로 번개를 이어보세요',color:0xffdc87}
};

// Persistent, local-space body parts. No collision or extra lights per frame.
export function createSeedEvolution(player,body=player){
  const groups={}, parts={},material={};
  const add=(parent,geometry,mat,x,y,z)=>{
    const m=new THREE.Mesh(geometry,mat);m.position.set(x,y,z);
    m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
  };
  const armor=new THREE.MeshStandardMaterial({color:0xc8d1af,roughness:.48,metalness:.15});
  for(const [id,info] of Object.entries(LAW_PRESENTATION)){
    const g=new THREE.Group();g.visible=false;body.add(g);groups[id]=g;parts[id]=[];
    material[id]=new THREE.MeshStandardMaterial({color:info.color,emissive:info.color,emissiveIntensity:.75,roughness:.24,metalness:.3});
  }
  // REFLECT: broad paired shield petals with cold luminous edges, visible from both sides.
  for(const side of [-1,1]){
    const hinge=new THREE.Group();hinge.position.set(side*.4,.75,0);groups.reflect.add(hinge);
    const shield=add(hinge,new THREE.CylinderGeometry(.34,.21,.12,6),armor,side*.17,0,0);
    shield.rotation.x=Math.PI/2;shield.rotation.z=side*.15;
    for(const z of [-.09,.09]){
      const inset=add(hinge,new THREE.CircleGeometry(.24,6),material.reflect,side*.17,0,z);
      if(z<0)inset.rotation.y=Math.PI;
    }
    parts.reflect.push(hinge);
  }
  // SPLIT: three coral-tipped crown petals and branching buds, a tall forked silhouette.
  for(let i=-1;i<=1;i++){
    const petal=new THREE.Group();petal.position.set(i*.27,1.13,-.03);petal.rotation.z=-i*.3;groups.split.add(petal);
    add(petal,new THREE.ConeGeometry(.18,.72,5),armor,0,.34,0);
    add(petal,new THREE.OctahedronGeometry(.15),material.split,0,.64,0);
    parts.split.push(petal);
  }
  for(const side of [-1,1]){
    const bud=add(groups.split,new THREE.OctahedronGeometry(.23),material.split,side*.57,.7,-.05);
    bud.scale.set(.75,1.4,.85);parts.split.push(bud);
  }
  // CHAIN: an open gold conducting arch behind the shoulders, nodes joined by real struts.
  const nodes=[[-.66,.73,-.2],[-.56,1.2,-.2],[0,1.57,-.2],[.56,1.2,-.2],[.66,.73,-.2]];
  nodes.forEach((p,i)=>{
    parts.chain.push(add(groups.chain,new THREE.OctahedronGeometry(i===2?.16:.12),material.chain,...p));
    if(i){const a=new THREE.Vector3(...nodes[i-1]),b=new THREE.Vector3(...p),d=b.clone().sub(a);
      const wire=add(groups.chain,new THREE.CylinderGeometry(.027,.027,d.length(),5),armor,...a.clone().add(b).multiplyScalar(.5).toArray());
      wire.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());}
  });
  const surgeMaterial=new THREE.MeshBasicMaterial({color:0xb6ffdc,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide});
  const surge=add(player,new THREE.TorusGeometry(.7,.045,5,48),surgeMaterial,0,.08,0);surge.rotation.x=Math.PI/2;surge.visible=false;
  let laws=[],upgrades=new Set(),recoil=0,progress=1;
  return {
    select(ids,mutations=[]){upgrades=new Set(mutations);laws=[...ids];for(const id of Object.keys(groups)){groups[id].visible=laws.includes(id);groups[id].scale.setScalar(laws[0]===id?1:.78);}progress=0;},
    reset(){laws=[];upgrades.clear();recoil=0;progress=1;for(const g of Object.values(groups))g.visible=false;surge.visible=false;player.scale.setScalar(1.35);},
    fire(){recoil=1;},
    update(dt,time,evolving,p=1){
      recoil=Math.max(0,recoil-dt*6);progress=p;
      const pulse=evolving?Math.sin(Math.PI*p):0;
      player.scale.set(1.35*(1+pulse*.13),1.35*(1-pulse*.09),1.35*(1+pulse*.13));
      for(const [id,g] of Object.entries(groups)){
        if(!g.visible)continue;
        const reveal=evolving?THREE.MathUtils.smoothstep(p,.12,.75):1;
        g.scale.setScalar((laws[0]===id?1:.78)*(.25+.75*reveal)*(upgrades.has(id)?1.18:1));
        material[id].emissiveIntensity=(upgrades.has(id)?1.1:.7)+recoil*1.8+pulse*2.4;
      }
      parts.reflect.forEach((g,i)=>g.rotation.y=(i?1:-1)*(recoil*.35+Math.sin(time*2)*.035));
      parts.split.forEach((m,i)=>m.rotation.x=Math.sin(time*2.5+i)*.045-recoil*.13);
      parts.chain.forEach((m,i)=>m.rotation.y=time*.7+i*.6);
      surge.visible=evolving;surge.scale.setScalar(.6+p*1.8);surgeMaterial.opacity=pulse*.65;
      if(laws.length)surgeMaterial.color.setHex(LAW_PRESENTATION[laws.at(-1)].color);
    },
    state(){return {forms:[...laws],primary:laws[0]||null,progress,visible:Object.keys(groups).filter(id=>groups[id].visible)};}
  };
}

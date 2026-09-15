import * as THREE from 'three';

import {LAWS} from './laws.js';
export const LAW_PRESENTATION=Object.fromEntries(Object.entries(LAWS).map(([id,v])=>[id,{name:v.form,hint:v.hint,color:v.color}]));

// Law growth on the seed. The painted body art (seed-body.js) shows what the seed has become; the old 3D law ornaments
// (petals, octahedrons, rings around the seed) were removed on 2026-09-15 because they looked broken beside the 2D sprite.
// What stays: the squash-and-stretch pulse and the coloured ring under the seed while it evolves.
export function createSeedEvolution(player){
  const surgeMaterial=new THREE.MeshBasicMaterial({color:0xb6ffdc,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide,forceSinglePass:true});
  const surge=new THREE.Mesh(new THREE.TorusGeometry(.7,.045,5,48),surgeMaterial);surge.position.y=.08;surge.rotation.x=Math.PI/2;surge.visible=false;player.add(surge);
  let laws=[],progress=1;
  return {
    select(ids){laws=[...ids];progress=0;},
    reset(){laws=[];progress=1;surge.visible=false;player.scale.setScalar(1.35);},
    fire(){},
    update(dt,time,evolving,p=1){
      progress=p;
      const pulse=evolving?Math.sin(Math.PI*p):0;
      player.scale.set(1.35*(1+pulse*.13),1.35*(1-pulse*.09),1.35*(1+pulse*.13));
      surge.visible=evolving;surge.scale.setScalar(.6+p*1.8);surgeMaterial.opacity=pulse*.65;
      if(laws.length)surgeMaterial.color.setHex(LAW_PRESENTATION[laws.at(-1)].color);
    },
    // visible: the laws the seed currently shows through its art (kept for saves, tests and inspection).
    state(){return {forms:[...laws],primary:laws[0]||null,progress,visible:[...laws]};}
  };
}

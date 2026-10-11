import * as THREE from 'three';
// Local siege review uses eleven persistent sprites and four build rings.
// All combat ownership stays in crystal-siege-rules; no lights or per-frame DOM.
export function createCrystalSiegeView(scene,loader,base,{onBuild,onStart}={}){
 const world=new THREE.Group();world.name='crystal-siege-review';world.visible=false;scene.add(world);
 const owned=[],textures=[],rings=[];let disposed=false,uiKey='',buildKey='',padId=null,menuOpen=false,interactiveNow=false,nearestPad=null,currentResources=0;
 const facilityCodes=new Uint8Array(4),plantTime=new Float32Array(4);let facilitiesSeen=false;
 const facilityCode={turret:1,snare:3,wall:5};
 const load=path=>{const t=loader.load(base+'assets/'+path);t.colorSpace=THREE.SRGBColorSpace;textures.push(t);return t;};
 const crystal=load('mobile/mirror-crystal-v1.webp'),turret=load('cute/enemy-turret-v4.webp'),plants=load('garden-growth-atlas-v3.webp');
 const plantCell=cell=>{const t=plants.clone();t.repeat.set(.25,1/3);t.offset.set(cell%4/4,(2-Math.floor(cell/4))/3);t.needsUpdate=true;textures.push(t);return t;};
 const coreTexture=plantCell(4),snareTexture=plantCell(8),wallTexture=plantCell(2);
 const sprite=(texture,size)=>{const material=new THREE.SpriteMaterial({map:texture,transparent:true,alphaTest:.12,depthWrite:false,toneMapped:false});owned.push(material);const o=new THREE.Sprite(material);o.scale.set(size,size,1);o.center.set(.5,.14);world.add(o);return o;};
 const heart=sprite(coreTexture,3),nodes=Array.from({length:6},()=>sprite(crystal,1.15)),facilities=Array.from({length:4},()=>sprite(turret,1.55));
 facilities.forEach((o,i)=>{o.name='crystal-siege-facility-'+i;});
 const geometry=new THREE.RingGeometry(.63,.72,32);owned.push(geometry);
 for(let i=0;i<4;i++){const material=new THREE.MeshBasicMaterial({color:0xe1d2a1,transparent:true,opacity:.65,depthWrite:false,side:THREE.DoubleSide});owned.push(material);const ring=new THREE.Mesh(geometry,material);ring.rotation.x=-Math.PI/2;world.add(ring);rings.push(ring);}
 const hud=document.createElement('div');hud.id='crystal-siege-ui';hud.hidden=true;hud.setAttribute('role','status');
 const menu=document.createElement('div');menu.id='crystal-siege-build';menu.hidden=true;
 menu.innerHTML='<div data-choices hidden role="group" aria-label="이 화단에 심을 시설"><strong>이 화단에 심기</strong><button data-kind="turret"><i class="siege-art turret" aria-hidden="true"></i><b>씨앗 포탑</b><small>적 공격 · 수정 3</small></button><button data-kind="snare"><i class="siege-art snare" aria-hidden="true"></i><b>덩굴 덫</b><small>적 둔화 · 수정 2</small></button><button data-kind="wall"><i class="siege-art wall" aria-hidden="true"></i><b>잎 울타리</b><small>심장 보호 · 수정 2</small></button><button data-close aria-label="시설 선택 닫기">×</button></div><div data-dock><button data-context hidden></button><button data-start>습격 시작</button></div>';
 document.body.append(hud,menu);
 const buildButtons=[...menu.querySelectorAll('[data-kind]')],choices=menu.querySelector('[data-choices]'),contextButton=menu.querySelector('[data-context]'),startButton=menu.querySelector('[data-start]');
 const names={turret:'씨앗 포탑',snare:'덩굴 덫',wall:'잎 울타리'},costs={turret:3,snare:2,wall:2};
 for(const b of buildButtons){const kind=b.dataset.kind;b.setAttribute('aria-label',`${names[kind]} · 수정 ${costs[kind]}`);const icon=b.querySelector('i');icon.style.backgroundImage=`url("${base}assets/${kind==='turret'?'cute/enemy-turret-v4.webp':'garden-growth-atlas-v3.webp'}")`;b.onclick=()=>{if(interactiveNow&&menuOpen&&padId!==null&&!b.disabled){onBuild?.(padId,kind);menuOpen=false;choices.hidden=true;contextButton.setAttribute('aria-expanded','false');b.blur();}};}
 contextButton.onclick=()=>{if(!interactiveNow||!nearestPad||contextButton.disabled)return;if(nearestPad.kind){onBuild?.(padId,nearestPad.kind);}else{menuOpen=!menuOpen;choices.hidden=!menuOpen;contextButton.setAttribute('aria-expanded',String(menuOpen));}contextButton.blur();};
 menu.querySelector('[data-close]').onclick=()=>{menuOpen=false;choices.hidden=true;contextButton.setAttribute('aria-expanded','false');};
 startButton.onclick=()=>{if(interactiveNow){menuOpen=false;choices.hidden=true;onStart?.();startButton.blur();}};
 function update(s,player,{visible=false,interactive=false,boss=false,bossCleared=false,coreDefense=false,roundCount=5,prepDuration=20,prepRemaining=null,dt=0}={}){
  if(disposed)return;world.visible=visible&&!!s;hud.hidden=!world.visible;menu.hidden=true;interactiveNow=false;if(!world.visible){menuOpen=false;choices.hidden=true;padId=null;nearestPad=null;facilitiesSeen=false;plantTime.fill(0);return;}
  heart.position.set(s.core.x,.04,s.core.z);
  for(let i=0;i<nodes.length;i++){const n=s.nodes[i];nodes[i].visible=!boss&&s.phase==='prep'&&!!n&&!n.harvested; if(n)nodes[i].position.set(n.x,.02,n.z);}
  let nearest=null,best=Infinity;for(let i=0;i<rings.length;i++){const p=s.pads[i];rings[i].position.set(p.x,.05,p.z);facilities[i].visible=!!p.kind&&p.hp>0;facilities[i].position.set(p.x,.04,p.z);facilities[i].material.map=p.kind==='snare'?snareTexture:p.kind==='wall'?wallTexture:turret;const d=Math.hypot(player.x-p.x,player.z-p.z);rings[i].material.opacity=d<=1.7?.95:.4;rings[i].material.color.setHex(d<=1.7?0xffe7a8:0xb7c6a1);if(d<=1.7&&d<best){best=d;nearest=p;}}
  // Four existing sprites settle briefly after a paid build/upgrade. No new
  // particles, lights, geometry or combat hitboxes are created for this cue.
  const step=Number.isFinite(dt)?Math.max(0,Math.min(.1,dt)):0;
  for(let i=0;i<4;i++){
   const p=s.pads[i],code=p.kind&&p.hp>0?(facilityCode[p.kind]||0)+p.level:0;
   if(facilitiesSeen&&code>0&&code!==facilityCodes[i])plantTime[i]=.24;
   facilityCodes[i]=code;plantTime[i]=Math.max(0,plantTime[i]-step);
   const bump=Math.sin(Math.PI*plantTime[i]/.24)*.16;
   facilities[i].scale.set(1.55*(1+bump),1.55*(1+bump),1);
  }
  facilitiesSeen=true;
  const phase=boss?(bossCleared?' 결전 승리 · 출구로 이동':coreDefense?' 보스 결전 · 재생 습격대에서 심장을 지키세요':' 보스 결전 · 심어 둔 포탑과 함께'):s.phase==='prep'?' 낮 · 채집과 준비':s.phase==='defense'?' 밤 · 정원의 심장을 지키세요':s.phase==='clear'?' 습격을 막았습니다':' 심장이 꺼졌습니다';const remaining=Math.max(0,Math.ceil(prepRemaining??prepDuration-s.elapsed));const text=`${s.room+1}/${roundCount}${phase}|${remaining}|${Math.ceil(s.core.hp)}|${s.resources}`;
  if(text!==uiKey){hud.innerHTML='<strong>'+phase+'</strong><span>심장 '+Math.ceil(s.core.hp)+'/100 · 수정 '+s.resources+' · '+(boss?(bossCleared?'출구로 다음 진행':coreDefense?'보스와 습격대를 막기':'보스 결전'):s.phase==='prep'?remaining+'초 뒤 습격':'습격 '+(s.room+1)+'/'+roundCount)+'</span><small>'+(!boss&&s.phase==='prep'?'빛나는 수정에 다가가 채집 · 원 안에서 시설 심기':'')+'</small>';uiKey=text;}
  if(!boss&&s.phase==='prep'&&interactive){
   interactiveNow=true;menu.hidden=false;const nextId=nearest?.id??null;if(nextId!==padId)menuOpen=false;padId=nextId;nearestPad=nearest;currentResources=s.resources;
   const key=padId+'|'+nearest?.kind+'|'+nearest?.level+'|'+(nearest?.hp>0)+'|'+currentResources;
   if(key!==buildKey){buildKey=key;contextButton.hidden=!nearest;contextButton.disabled=Boolean(nearest?.kind&&(nearest.level>=2&&nearest.hp>0||s.resources<costs[nearest.kind]));contextButton.textContent=nearest?.kind?(nearest.level>=2&&nearest.hp>0?`${names[nearest.kind]} · 최대 강화`:`${names[nearest.kind]} ${nearest.hp>0?'강화':'다시 심기'} · 수정 ${costs[nearest.kind]}${s.resources<costs[nearest.kind]?' 필요':''}`):'이 화단에 심기';for(const b of buildButtons)b.disabled=!nearest||Boolean(nearest.kind)||s.resources<costs[b.dataset.kind];}
   if(nearest?.kind)menuOpen=false;choices.hidden=!menuOpen;contextButton.setAttribute('aria-expanded',String(menuOpen));
  }else{menuOpen=false;choices.hidden=true;padId=null;nearestPad=null;buildKey='';}
 }
 return {update,hide(){world.visible=false;hud.hidden=menu.hidden=true;menuOpen=false;choices.hidden=true;interactiveNow=false;padId=null;nearestPad=null;buildKey='';facilitiesSeen=false;plantTime.fill(0);},dispose(){if(disposed)return;disposed=true;world.removeFromParent();owned.forEach(o=>o.dispose());textures.forEach(t=>t.dispose());hud.remove();menu.remove();}};
}

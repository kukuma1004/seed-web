import * as THREE from 'three';
import {CRYSTAL_GARDEN_ART,CRYSTAL_GARDEN_MOBILE_ART,CRYSTAL_TURRET_ART,CRYSTAL_TURRET_MOBILE_ART,crystalTurretTexture,crystalGardenTexture,crystalGardenArtStyle,crystalGardenFloorContactTexture} from './crystal-garden-art.js';
import {CRYSTAL_SIEGE_PACKETS,crystalSiegeBuildCost,crystalSiegeMaxLevel,crystalSiegeFacilityMaxHp} from './crystal-siege-rules.js';
import {journeySignatureHint} from './journey-act-signatures.js';
export const CRYSTAL_SIEGE_PRESENTATION=Object.freeze({heart:2.85,node:2.15,facility:2.05,levelStep:.06});
// Eleven actor sprites, four grounded plinths and one contact-shadow batch.
// All combat ownership stays in crystal-siege-rules; no lights or per-frame DOM.
export function createCrystalSiegeView(scene,loader,base,{onBuild,onStart,mobile=false}={}){
 const world=new THREE.Group();world.name='crystal-siege-review';world.visible=false;scene.add(world);
 const owned=[],textures=[],rings=[];let disposed=false,uiKey='',buildKey='',padId=null,menuOpen=false,interactiveNow=false,nearestPad=null,currentResources=0;
 const facilityCodes=new Uint8Array(4),plantTime=new Float32Array(4);let facilitiesSeen=false;
 const padPreviousHp=new Float32Array(4),padHitTime=new Float32Array(4),supportTime=new Float32Array(4);
 const supportX=new Float32Array(4),supportZ=new Float32Array(4);
 let feedbackState=null,corePreviousHp=NaN,coreHitTime=0,receipt='',receiptTime=0;
 const facilityCode={turret:1,snare:3,wall:5};
 const load=path=>{const t=loader.load(base+'assets/'+path);t.colorSpace=THREE.SRGBColorSpace;textures.push(t);return t;};
 const artFile=mobile?CRYSTAL_GARDEN_MOBILE_ART:CRYSTAL_GARDEN_ART,facilityAtlas=load(artFile.slice(7));
 const artCell=kind=>{const t=crystalGardenTexture(facilityAtlas,kind);textures.push(t);return t;};
 const crystal=artCell('crystal'),turret=artCell('turret'),coreTexture=artCell('heart'),snareTexture=artCell('snare'),wallTexture=artCell('wall'),plinthTexture=artCell('plinth');
 const growthAtlas=load((mobile?CRYSTAL_TURRET_MOBILE_ART:CRYSTAL_TURRET_ART).slice(7)),turretStages=[turret];for(let level=2;level<=5;level++){const t=crystalTurretTexture(growthAtlas,level);textures.push(t);turretStages.push(t);}
 const sprite=(texture,size,solid=true)=>{const material=new THREE.SpriteMaterial({map:texture,transparent:true,alphaTest:.12,depthWrite:solid,toneMapped:false});owned.push(material);const o=new THREE.Sprite(material);o.scale.set(size,size,1);o.center.set(.5,.14);world.add(o);return o;};
 const heart=sprite(coreTexture,CRYSTAL_SIEGE_PRESENTATION.heart),nodes=Array.from({length:6},()=>sprite(crystal,CRYSTAL_SIEGE_PRESENTATION.node)),facilities=Array.from({length:4},()=>sprite(turret,CRYSTAL_SIEGE_PRESENTATION.facility));
 const plinths=Array.from({length:4},()=>sprite(plinthTexture,2.15,false));for(const p of plinths){p.center.y=.13;p.name='crystal-garden-build-plinth';}
 const shadowTexture=crystalGardenFloorContactTexture();textures.push(shadowTexture);
 const shadowGeometry=new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2),shadowMaterial=new THREE.MeshBasicMaterial({map:shadowTexture,transparent:true,depthWrite:false,toneMapped:false});owned.push(shadowGeometry,shadowMaterial);
 const contacts=new THREE.InstancedMesh(shadowGeometry,shadowMaterial,11),shadowMatrix=new THREE.Matrix4();contacts.name='crystal-garden-ground-contacts';contacts.frustumCulled=false;world.add(contacts);
 const contactCache=new Float64Array(44).fill(NaN);let contactCount=0,contactDirty=false;
 function contact(x,z,w,d){
  const index=contactCount++,offset=index*4;
  if(contactCache[offset]===x&&contactCache[offset+1]===z&&contactCache[offset+2]===w&&contactCache[offset+3]===d)return;
  shadowMatrix.makeScale(w,1,d);shadowMatrix.setPosition(x,.032,z);contacts.setMatrixAt(index,shadowMatrix);contactDirty=true;
  contactCache[offset]=x;contactCache[offset+1]=z;contactCache[offset+2]=w;contactCache[offset+3]=d;
 }
 const harvested=new Uint8Array(6),harvestTime=new Float32Array(6);
 const barGeometry=new THREE.PlaneGeometry(1,1),barBackMaterial=new THREE.MeshBasicMaterial({color:0x142d23,depthWrite:false,toneMapped:false}),barFillMaterial=new THREE.MeshBasicMaterial({color:0xffffff,depthWrite:false,toneMapped:false});owned.push(barGeometry,barBackMaterial,barFillMaterial);
 const barBack=new THREE.InstancedMesh(barGeometry,barBackMaterial,4),barFill=new THREE.InstancedMesh(barGeometry,barFillMaterial,4),barPose=new THREE.Object3D(),barColor=new THREE.Color();barBack.name='crystal-garden-facility-hp-background';barFill.name='crystal-garden-facility-hp-fill';barBack.frustumCulled=barFill.frustumCulled=false;barPose.rotation.x=-Math.atan2(22,18);world.add(barBack,barFill);
 const barCache=new Float64Array(16).fill(NaN);
 heart.name='crystal-siege-heart';heart.center.y=.035;
 facilities.forEach(o=>{o.center.y=.06;});nodes.forEach((o,i)=>{o.center.y=.035;o.name='crystal-garden-harvest-'+i;});
 facilities.forEach((o,i)=>{o.name='crystal-siege-facility-'+i;});
 const geometry=new THREE.RingGeometry(.63,.72,32);owned.push(geometry);
 for(let i=0;i<4;i++){const material=new THREE.MeshBasicMaterial({color:0xe1d2a1,transparent:true,opacity:.65,depthWrite:false,side:THREE.DoubleSide});owned.push(material);const ring=new THREE.Mesh(geometry,material);ring.name='crystal-garden-build-ring-'+i;ring.rotation.x=-Math.PI/2;world.add(ring);rings.push(ring);}
 const hud=document.createElement('div');hud.id='crystal-siege-ui';hud.hidden=true;hud.setAttribute('role','status');
 const menu=document.createElement('div');menu.id='crystal-siege-build';menu.hidden=true;
 menu.innerHTML='<div data-choices hidden role="group" aria-label="이 화단에 심을 시설"><strong>이 화단에 심기</strong><button data-kind="turret"><i class="siege-art turret" aria-hidden="true"></i><b>씨앗 포탑</b><small><span>적 공격</span><span>수정 3</span></small></button><button data-kind="snare"><i class="siege-art snare" aria-hidden="true"></i><b>덩굴 덫</b><small><span>주변 무리 둔화</span><span>수정 2</span></small></button><button data-kind="wall"><i class="siege-art wall" aria-hidden="true"></i><b>잎 울타리</b><small><span>근처 적 유인</span><span>수정 2</span></small></button><button data-close aria-label="시설 선택 닫기">×</button></div><div data-dock><button data-context hidden></button><button data-start>습격 시작</button></div>';
 document.body.append(hud,menu);
 const buildButtons=[...menu.querySelectorAll('[data-kind]')],choices=menu.querySelector('[data-choices]'),contextButton=menu.querySelector('[data-context]'),startButton=menu.querySelector('[data-start]');
 const names={turret:'씨앗 포탑',snare:'덩굴 덫',wall:'잎 울타리'},costs={turret:3,snare:2,wall:2};
 for(const b of buildButtons){const kind=b.dataset.kind;b.setAttribute('aria-label',`${names[kind]} · 수정 ${costs[kind]}`);const icon=b.querySelector('i');icon.style.backgroundImage=`url("${base}${artFile}")`;Object.assign(icon.style,crystalGardenArtStyle(kind));b.onclick=()=>{if(interactiveNow&&menuOpen&&padId!==null&&!b.disabled){onBuild?.(padId,kind);menuOpen=false;choices.hidden=true;contextButton.setAttribute('aria-expanded','false');b.blur();}};}
 contextButton.onclick=()=>{if(!interactiveNow||!nearestPad||contextButton.disabled)return;if(nearestPad.kind){onBuild?.(padId,nearestPad.kind);}else{menuOpen=!menuOpen;choices.hidden=!menuOpen;contextButton.setAttribute('aria-expanded',String(menuOpen));}contextButton.blur();};
 menu.querySelector('[data-close]').onclick=()=>{menuOpen=false;choices.hidden=true;contextButton.setAttribute('aria-expanded','false');};
 startButton.onclick=()=>{if(interactiveNow){menuOpen=false;choices.hidden=true;onStart?.();startButton.blur();}};
 function resetFeedback(next=null){feedbackState=next;corePreviousHp=NaN;coreHitTime=0;padPreviousHp.fill(NaN);padHitTime.fill(0);supportTime.fill(0);receipt='';receiptTime=0;heart.material.color.setHex(0xffffff);for(const o of facilities)o.material.color.setHex(0xffffff);}
 function recordSupport(appliedDamage,facilityId,target=null){
  if(disposed||!world.visible||!feedbackState||!['defense','clear','boss'].includes(feedbackState.phase)||!Number.isFinite(appliedDamage)||appliedDamage<=0||appliedDamage>1e6)return false;
  const index=feedbackState.pads.findIndex(p=>p.id===facilityId),pad=feedbackState.pads[index];
  if(index<0||index>=4||pad.kind!=='turret'||pad.hp<=0)return false;
  const dx=target?.x-pad.x,dz=target?.z-pad.z,n=Math.hypot(dx,dz);
  supportX[index]=Number.isFinite(n)&&n>0?dx/n:0;supportZ[index]=Number.isFinite(n)&&n>0?dz/n:0;
  supportTime[index]=.24;if(coreHitTime<=0){receipt=`포탑 적중 · 피해 ${Math.round(appliedDamage*10)/10}`;receiptTime=.8;}return true;
 }
 function update(s,player,{visible=false,interactive=false,boss=false,bossCleared=false,coreDefense=false,roundCount=5,prepDuration=20,prepRemaining=null,liveEnemies=null,signature=null,dt=0}={}){
  if(disposed)return;world.visible=visible&&!!s;hud.hidden=!world.visible;menu.hidden=true;interactiveNow=false;if(!world.visible){menuOpen=false;choices.hidden=true;padId=null;nearestPad=null;facilitiesSeen=false;plantTime.fill(0);resetFeedback();return;}
  if(feedbackState!==s){resetFeedback(s);facilitiesSeen=false;plantTime.fill(0);harvested.fill(0);harvestTime.fill(0);}
  heart.position.set(s.core.x,.04,s.core.z);
  const step=Number.isFinite(dt)?Math.max(0,Math.min(.1,dt)):0;
  contactCount=0;contactDirty=false;contact(s.core.x,s.core.z,2.65,1.55);
  for(let i=0;i<nodes.length;i++){
   const n=s.nodes[i];if(n?.harvested&&!harvested[i])harvestTime[i]=.2;harvested[i]=n?.harvested?1:0;harvestTime[i]=Math.max(0,harvestTime[i]-step);
   const visible=!boss&&s.phase==='prep'&&!!n&&(!n.harvested||harvestTime[i]>0);nodes[i].visible=visible;
   if(n){nodes[i].position.set(n.x,.025,n.z);nodes[i].scale.setScalar(CRYSTAL_SIEGE_PRESENTATION.node*(n.harvested?harvestTime[i]/.2:1));if(visible)contact(n.x,n.z,1.8,1.1);}
  }
  for(let i=0;i<4;i++){const p=s.pads[i];plinths[i].position.set(p.x,.036,p.z);plinths[i].material.color.setHex(Math.hypot(player.x-p.x,player.z-p.z)<=1.7?0xfff1cf:0xcad3ca);if(p.kind&&p.hp>0)contact(p.x,p.z,2.15,1.3);}
  contacts.count=contactCount;if(contactDirty)contacts.instanceMatrix.needsUpdate=true;
  let nearest=null,best=Infinity;for(let i=0;i<rings.length;i++){const p=s.pads[i];rings[i].position.set(p.x,.05,p.z);facilities[i].visible=!!p.kind&&p.hp>0;facilities[i].position.set(p.x,.04,p.z);facilities[i].material.map=p.kind==='snare'?snareTexture:p.kind==='wall'?wallTexture:turretStages[Math.max(0,Math.min(4,p.level-1))];const d=Math.hypot(player.x-p.x,player.z-p.z);rings[i].material.opacity=d<=1.7?.7:0;rings[i].material.color.setHex(d<=1.7?0xffe7a8:0xb7c6a1);if(d<=1.7&&d<best){best=d;nearest=p;}}
  // Four existing sprites settle briefly after a paid build/upgrade. No new
  // particles, lights, geometry or combat hitboxes are created for this cue.
  coreHitTime=Math.max(0,coreHitTime-step);if(Number.isFinite(corePreviousHp)&&s.core.hp<corePreviousHp){coreHitTime=.3;receipt='심장이 공격받고 있어요 · 가까운 습격대부터 끊으세요';receiptTime=1.2;}corePreviousHp=s.core.hp;
  heart.material.color.setHex(coreHitTime>0?0xff8777:0xffffff);
  receiptTime=Math.max(0,receiptTime-step);if(!receiptTime)receipt='';
  for(let i=0;i<4;i++){
   const p=s.pads[i];facilities[i].center.y=p.kind==='snare'?.13:p.kind==='wall'?.14:.03;const code=p.kind&&p.hp>0?(facilityCode[p.kind]||0)+p.level:0;
   padHitTime[i]=Math.max(0,padHitTime[i]-step);supportTime[i]=Math.max(0,supportTime[i]-step);
   if(Number.isFinite(padPreviousHp[i])&&p.hp<padPreviousHp[i])padHitTime[i]=.3;padPreviousHp[i]=p.hp;
   facilities[i].material.color.setHex(padHitTime[i]>0?0xff8777:supportTime[i]>0?0xb5ffd7:0xffffff);
   if(supportTime[i]>0){const recoil=Math.sin(Math.PI*supportTime[i]/.24)*.12;facilities[i].position.x-=supportX[i]*recoil;facilities[i].position.z-=supportZ[i]*recoil;rings[i].material.color.setHex(0xb5ffd7);rings[i].material.opacity=Math.max(rings[i].material.opacity,supportTime[i]*2);}
   if(padHitTime[i]>0||p.kind&&p.hp<=0){rings[i].material.color.setHex(0xff8777);rings[i].material.opacity=.75;}if(p.kind&&p.hp<=0)plinths[i].material.color.setHex(0x9a796a);
   if(facilitiesSeen&&code>0&&code!==facilityCodes[i])plantTime[i]=.24;
   facilityCodes[i]=code;plantTime[i]=Math.max(0,plantTime[i]-step);
   const bump=Math.sin(Math.PI*plantTime[i]/.24)*.16;
   const size=CRYSTAL_SIEGE_PRESENTATION.facility+(p.kind==='turret'?Math.max(0,p.level-1)*CRYSTAL_SIEGE_PRESENTATION.levelStep:0);facilities[i].scale.set(size*(1+bump),size*(1+bump),1);
  }
  let barCount=0,barDirty=false;for(let i=0;i<4;i++){
   const p=s.pads[i],maxHp=crystalSiegeFacilityMaxHp(p);if(!p.kind||p.hp<=0||p.hp>=maxHp)continue;
   const ratio=Math.max(0,Math.min(1,p.hp/maxHp)),y=p.kind==='snare'?1.05:p.kind==='wall'?1.55:1.95;
   const offset=barCount*4;if(barCache[offset]!==p.x||barCache[offset+1]!==p.z||barCache[offset+2]!==y||barCache[offset+3]!==ratio){
    barPose.position.set(p.x,y,p.z);barPose.scale.set(1.55,.13,1);barPose.updateMatrix();barBack.setMatrixAt(barCount,barPose.matrix);
    barPose.position.set(p.x-.7*(1-ratio),y+.025,p.z+.018);barPose.scale.set(1.4*ratio,.065,1);barPose.updateMatrix();barFill.setMatrixAt(barCount,barPose.matrix);barColor.setHex(ratio<.35?0xff927f:0xe9d28b);barFill.setColorAt(barCount,barColor);barDirty=true;
    barCache[offset]=p.x;barCache[offset+1]=p.z;barCache[offset+2]=y;barCache[offset+3]=ratio;
   }barCount++;
  }
  barBack.count=barFill.count=barCount;if(barDirty){barBack.instanceMatrix.needsUpdate=barFill.instanceMatrix.needsUpdate=true;if(barFill.instanceColor)barFill.instanceColor.needsUpdate=true;}
  facilitiesSeen=true;
  const phase=boss?(bossCleared?' 결전 승리 · 출구로 이동':coreDefense?' 보스 결전 · 재생 습격대에서 심장을 지키세요':s.journeyCircuit&&!s.journeyCircuit.wardenCleared?' 문지기 결전 · 심어 둔 포탑과 함께':' 보스 결전 · 심어 둔 포탑과 함께'):s.phase==='prep'?' 낮 · 채집과 준비':s.phase==='defense'?' 밤 · 정원의 심장을 지키세요':s.phase==='clear'?' 습격을 막았습니다':' 심장이 꺼졌습니다';const remaining=Math.max(0,Math.ceil(prepRemaining??prepDuration-s.elapsed));
  const liveText=Number.isInteger(liveEnemies)&&liveEnemies>=0?`남은 적 ${liveEnemies}`:'';
  // Survival owns a different wave ledger. Only the five-night Journey uses
  // this finite packet count; an empty arena never invents a clear receipt.
  const packetTotal=CRYSTAL_SIEGE_PACKETS[s.room],packetRemaining=roundCount===5&&Number.isInteger(s.spawnIndex)&&Number.isInteger(packetTotal)?Math.max(0,packetTotal-s.spawnIndex):null;
  const pressure=!boss&&s.phase==='defense'?(packetRemaining!==null?`남은 습격 ${packetRemaining}${liveText?' · '+liveText:''}`:liveText):'';
  const defenseHint=packetRemaining===0?(liveText?(liveEnemies>0?'마지막 적을 처치하면 다음 전장이 열려요':'습격 정산 중'):'남은 적을 확인하세요'):packetRemaining!==null?'다가오는 습격대를 심장 전에 끊으세요':'';
  const command=signature?.act==='crystalGorge'&&(signature.rallyPad||signature.repairPad)?journeySignatureHint(signature,s):'';
  const detail=command||(!boss&&s.phase==='prep'?'수정 채집 → 화단에서 심기':!boss&&s.phase==='defense'?defenseHint:'');
  const phaseKey=boss?'boss':s.phase,alertKey=coreHitTime>0?'danger':receipt?'feedback':'none',commandKey=command?'active':'none',cleanupKey=packetRemaining===0?'true':'false';
  if(hud.dataset.phase!==phaseKey)hud.dataset.phase=phaseKey;if(hud.dataset.alert!==alertKey)hud.dataset.alert=alertKey;
  if(hud.dataset.command!==commandKey)hud.dataset.command=commandKey;if(hud.dataset.cleanup!==cleanupKey)hud.dataset.cleanup=cleanupKey;
  const text=`${s.room+1}/${roundCount}${phase}|${remaining}|${Math.ceil(s.core.hp)}|${s.resources}|${pressure}|${detail}|${receipt}`;
  const choosing=menuOpen&&interactive&&s.phase==='prep'&&!boss;
  if(text+'|'+choosing!==uiKey){hud.innerHTML='<strong>'+phase+'</strong><span>심장 '+Math.ceil(s.core.hp)+'/100 · 수정 '+s.resources+' · '+(boss?(bossCleared?'출구로 다음 진행':coreDefense?'보스와 습격대를 막기':s.journeyCircuit&&!s.journeyCircuit.wardenCleared?'문지기 격파':'보스 결전'):s.phase==='prep'?(choosing?'시설 선택 중 · 준비 시간 멈춤':remaining+'초 뒤 습격'):pressure||'습격 '+(s.room+1)+'/'+roundCount)+'</span><small>'+(receipt||detail)+'</small>';uiKey=text+'|'+choosing;}
  if(!boss&&s.phase==='prep'&&interactive){
   interactiveNow=true;menu.hidden=false;const nextId=nearest?.id??null;if(nextId!==padId)menuOpen=false;padId=nextId;nearestPad=nearest;currentResources=s.resources;
   const key=padId+'|'+nearest?.kind+'|'+nearest?.level+'|'+(nearest?.hp>0)+'|'+currentResources;
   if(key!==buildKey){
    buildKey=key;contextButton.hidden=!nearest;const cap=crystalSiegeMaxLevel(nearest?.kind),cost=nearest?.kind?crystalSiegeBuildCost(nearest,nearest.kind):0,capped=nearest?.kind&&nearest.hp>0&&nearest.level>=cap;
    contextButton.disabled=Boolean(nearest?.kind&&(capped||cost<=0||s.resources<cost));
    contextButton.textContent=nearest?.kind?`${names[nearest.kind]} Lv.${nearest.level}/${cap} · ${nearest.hp<=0?'파괴됨 · 다시 심기':capped?'최대 강화':'강화'}${nearest.kind==='turret'?(nearest.level>=3?' · 근처 지휘 시 고급 화력':nearest.level>=2?' · 심장 우선 공격':' · 심장 우선'):''}${capped?'':` · 수정 ${cost}${s.resources<cost?' 필요':''}`}`:'이 화단에 심기';
    for(const b of buildButtons)b.disabled=!nearest||Boolean(nearest.kind)||s.resources<costs[b.dataset.kind];
   }
   if(nearest?.kind)menuOpen=false;choices.hidden=!menuOpen;contextButton.setAttribute('aria-expanded',String(menuOpen));
  }else{menuOpen=false;choices.hidden=true;padId=null;nearestPad=null;buildKey='';}
 }
 return {update,recordSupport,notice(text,seconds=1.2){if(disposed||!world.visible||coreHitTime>0||typeof text!=='string')return false;receipt=text.replace(/[<>&]/g,'').slice(0,100);receiptTime=Math.max(.2,Math.min(3,Number(seconds)||1.2));return true;},preparationHeld(){return !disposed&&interactiveNow&&menuOpen&&!menu.hidden&&!choices.hidden;},hide(){world.visible=false;hud.hidden=menu.hidden=true;menuOpen=false;choices.hidden=true;interactiveNow=false;padId=null;nearestPad=null;buildKey='';facilitiesSeen=false;plantTime.fill(0);resetFeedback();},dispose(){if(disposed)return;disposed=true;interactiveNow=false;menuOpen=false;nearestPad=null;padId=null;resetFeedback();world.removeFromParent();contacts.dispose();barBack.dispose();barFill.dispose();owned.forEach(o=>o.dispose());textures.forEach(t=>t.dispose());hud.remove();menu.remove();}};
}

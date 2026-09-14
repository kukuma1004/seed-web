import {createPauseBuild} from './pause-build.js';
import {advanceFrame} from './frame-time.js';
import {formArt} from './form-art.js';
import {buildCoverArt} from './world-art.js';
import {FORMS,eligibleForms,formUpgradeLine} from './forms.js';
// Forms that fly as a projectile can be stopped by a shield's face; area and orbit forms go around it.
const DIRECT_FORMS=new Set(['returnblade','prism','thunderlance','seedstorm','mirrorguard']);
import {readDiscoveries,recordDiscovery,growthGuide,rerollUnlocked} from './discoveries.js';
import {createFormCombat} from './form-combat.js';
import {formCard,discoveryBook,formLawHint} from './form-ui.js';
import {buildArenaBoundary,arenaFor,constrainToArena,reflectArenaBoundary,safeArenaSpawn} from './arena.js';
import {escortWave,escortTypes} from './boss-escorts.js';
import './forms.css';
import {attachActorArt} from './actor-art.js';
import {createShield,tickShield,blocksShield} from './shield.js';
import {readCheckpoint,writeCheckpoint,clearCheckpoint,difficulty,replaceLaw,REGION_NAMES} from './run-save.js';
import {createSeedBody} from './seed-body.js';
import {lawArt} from './law-art.js';
import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import './style.css';
import './journey.css';
import {ROOMS,EXIT,LAW_NAMES,rewardOptions,canUseExit} from './journey.js';
import {createWarden,tickWarden,wardenVariantFor,WARDEN_VARIANTS,SEAL} from './warden.js';
import {AUSTIN,AUSTIN_ARENA,AUSTIN_ART,createAustin,tickAustin,austinHint,createClockFloor} from './austin.js';
import {killPoints,roomPoints,submitScore,readRanking,lastName,rankingTable,formatScore,NAME_MAX,RANKING_SIZE} from './score.js';
import {ITEMS,emptyInventory,normalizeInventory,addItem,drinkPotion} from './inventory.js';
import './ranking.css';
import {SLOT_CAP,killsForChoice,levelOf,damageScale,lawStats,offerChoices,chooseLaw,levelsFromSave,levelsToSave,upgradeLine,offeredForm,slotsUsed,fusionLevel,canFuse,fuse,effectiveLevels,buildLevel} from './progression.js';
import {createTurret,tickTurret,turretSpots,copiedLaws,TURRET} from './turret.js';
import {trapsFor,tickTrap,createTrapVisual,trapPhase} from './traps.js';
import './feedback.css';
import './mobile.css';
import './choice.css';
import {setupMobileApp} from './mobile-app.js';
import {createTouchControls} from './touch.js';
const mobileDevice=matchMedia('(any-pointer: coarse)').matches||navigator.maxTouchPoints>0||(typeof location!=='undefined'&&['localhost','127.0.0.1'].includes(location.hostname)&&new URLSearchParams(location.search).has('touchPreview'));
import {createMotion} from './motion.js';
import {createVFX,FX_COLORS} from './vfx.js';
import {LAWS,synergyHint,hitBudget,acquireTarget} from './laws.js';
import {CROWD_TOTALS,CROWD_CAP,safeSpawn} from './crowd.js';
import {segmentHitsCover} from './collision.js';
import {disposeObject} from './resources.js';
import {createSeedEvolution,LAW_PRESENTATION} from './evolution.js';
// Elements are looked up once and reused; a replaced element is found again automatically.
const domCache=new Map();const $=s=>{let e=domCache.get(s);if(!e||!e.isConnected){e=document.querySelector(s);if(e)domCache.set(s,e);else domCache.delete(s);}return e;}, V=THREE.Vector3;
// Frame-rate HUD writes compare first, so an unchanged number never dirties layout.
const setText=(e,v)=>{if(e&&e.textContent!==v)e.textContent=v;},setWidth=(e,v)=>{if(e&&e.__width!==v){e.style.width=v;e.__width=v;}},setHidden=(e,v)=>{if(e&&e.hidden!==v)e.hidden=v;};
let canvasRect={left:0,top:0,width:1,height:1};
const localInspection=['127.0.0.1','localhost'].includes(location.hostname)&&new URLSearchParams(location.search).has('inspect');
const inspection=localInspection?document.createElement('pre'):null;if(inspection){inspection.id='seed-inspection';inspection.hidden=true;document.body.append(inspection);}
const renderer=new THREE.WebGLRenderer({canvas:$('#game'),antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,mobileDevice?1:1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=mobileDevice?THREE.PCFShadowMap:THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
const scene=new THREE.Scene();scene.background=new THREE.Color('#2a4550');scene.fog=new THREE.FogExp2('#2d4a55',.011);
const vfx=createVFX(scene,{mobile:mobileDevice});
const camera=new THREE.PerspectiveCamera(39,1,.1,100);const look=new V(0,0,0);camera.position.set(16,22,22);camera.lookAt(look);
const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));const bloomPass=new UnrealBloomPass(new THREE.Vector2(1,1),.42,.5,1.1);composer.addPass(bloomPass);composer.addPass(new OutputPass());
const pmrem=new THREE.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(new RoomEnvironment(),.04).texture;scene.environmentIntensity=.35;
scene.add(new THREE.HemisphereLight(0xcfe3ea,0x44564a,1.5));let sun=new THREE.DirectionalLight(0xffedcf,2.2);sun.position.set(-9,17,6);sun.castShadow=true;sun.shadow.mapSize.set(mobileDevice?1024:2048,mobileDevice?1024:2048);Object.assign(sun.shadow.camera,{left:-16,right:16,top:16,bottom:-16,far:50});sun.shadow.normalBias=.035;scene.add(sun);
const texloader=new THREE.TextureLoader(), stone=texloader.load(import.meta.env.BASE_URL+'assets/garden-stone-v4.png'),normal=texloader.load(import.meta.env.BASE_URL+'assets/garden-stone-normal.png');stone.colorSpace=THREE.SRGBColorSpace;for(let t of [stone,normal]){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(.34,.34);t.anisotropy=8;}
const mats={stone:new THREE.MeshStandardMaterial({color:0xb8c9c3,map:stone,roughness:.88,metalness:.02}),dark:new THREE.MeshStandardMaterial({color:0x667c75,roughness:.9,map:stone}),root:new THREE.MeshStandardMaterial({color:0x3b3528,roughness:.9}),leaf:new THREE.MeshStandardMaterial({color:0x3e6242,roughness:.72,side:THREE.DoubleSide}),jade:new THREE.MeshStandardMaterial({color:0x91f2c0,emissive:0x38ffb0,emissiveIntensity:2.8,roughness:.2}),amber:new THREE.MeshStandardMaterial({color:0xffdb83,emissive:0xff970f,emissiveIntensity:3}),armor:new THREE.MeshStandardMaterial({color:0xd7cbae,map:stone,roughness:.57}),enemy:new THREE.MeshStandardMaterial({color:0xa48969,map:stone,roughness:.7}),black:new THREE.MeshStandardMaterial({color:0x536160,map:stone,roughness:.5}),cover:new THREE.MeshStandardMaterial({color:0xa1a28c,map:stone,roughness:.85}),enemyBolt:new THREE.MeshStandardMaterial({color:0x3a0710,emissive:0xff2a3c,emissiveIntensity:2.4,roughness:.35}),enemyHalo:new THREE.MeshBasicMaterial({color:0xff4050,transparent:true,opacity:.85,side:THREE.DoubleSide,depthWrite:false,toneMapped:false}),bossBolt:new THREE.MeshStandardMaterial({color:0x22021a,emissive:0xd21cff,emissiveIntensity:2.8,roughness:.3}),bossHalo:new THREE.MeshBasicMaterial({color:0xff3cc8,transparent:true,opacity:.9,side:THREE.DoubleSide,depthWrite:false,toneMapped:false}),frostBolt:new THREE.MeshStandardMaterial({color:0x0a2436,emissive:0x5fd8ff,emissiveIntensity:2.4,roughness:.3})};
for(const id of ['seed',...Object.keys(LAWS)])mats['shot-'+id]=new THREE.MeshBasicMaterial({color:new THREE.Color(FX_COLORS[id]).multiplyScalar(2),toneMapped:false});
// The real boss's bell rings fire dozens of bolts at once, so they share one geometry and material each.
mats.austinBolt=new THREE.MeshBasicMaterial({color:new THREE.Color(0xffc94a).multiplyScalar(2),toneMapped:false});mats.austinHalo=new THREE.MeshBasicMaterial({color:0xffe7a0,transparent:true,opacity:.75,side:THREE.DoubleSide,depthWrite:false,toneMapped:false});
const austinGeo={core:new THREE.OctahedronGeometry(.27,0),halo:new THREE.RingGeometry(.33,.44,12)};
const sharedDynamicMaterials=new Set(Object.values(mats));
const sharedGeometries=new Set(Object.values(austinGeo));
function release(object){disposeObject(object,sharedDynamicMaterials,sharedGeometries);}
function releaseEnemy(e){release(e.g);if(e.world)release(e.world);}
function mesh(geo,mat,parent,x=0,y=0,z=0){let m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
const box=(p,x,y,z,w,h,d,m=mats.stone)=>mesh(new THREE.BoxGeometry(w,h,d),m,p,x,y,z);
const orb=(p,x,y,z,r,m)=>mesh(new THREE.IcosahedronGeometry(r,1),m,p,x,y,z);
function limb(p,a,b,r,m=mats.root,r2=r*.65){let av=new V(...a),bv=new V(...b),v=bv.clone().sub(av);let ob=mesh(new THREE.CylinderGeometry(r2,r,v.length(),7),m,p);ob.position.copy(av.add(bv).multiplyScalar(.5));ob.quaternion.setFromUnitVectors(new V(0,1,0),v.normalize());return ob;}
function path(points,r,mat,parent=terrain){return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new V(...p))),Math.max(10,points.length*6),r,5,false),mat,parent);}
let randseed=487;function rng(){randseed=(randseed*1664525+1013904223)>>>0;return randseed/4294967296;}
const terrain=new THREE.Group();scene.add(terrain);box(terrain,0,-.7,0,22,1.4,18,mats.dark);
for(let x=-10.5;x<11;x+=1.5)for(let z=-8.5;z<9;z+=1.5){let t=box(terrain,x,-.035+rng()*.025,z,1.47,.2,1.47);t.rotation.y=(rng()-.5)*.035;}
const watermat=new THREE.MeshStandardMaterial({color:0x59777f,roughness:.08,metalness:.82,transparent:true,opacity:.42});for(let i=0;i<45;i++){let p=mesh(new THREE.CircleGeometry(.3+rng()*1.2,16),watermat,terrain,(rng()-.5)*20,.08,(rng()-.5)*16);p.rotation.x=-Math.PI/2;p.scale.y=.35+rng()*.6;}
const leafShape=new THREE.Shape();leafShape.moveTo(0,0);leafShape.bezierCurveTo(-.17,.2,-.16,.42,0,.62);leafShape.bezierCurveTo(.16,.42,.17,.2,0,0);const leafGeo=new THREE.ShapeGeometry(leafShape,5);const leafMats=[0x183f31,0x395b36,0x17372c,0x516443].map(color=>new THREE.MeshStandardMaterial({color,roughness:.87,side:THREE.DoubleSide}));const petalMat=new THREE.MeshStandardMaterial({color:0xe7e9d5,roughness:.65});
function foliage(x,z,scale=1){let g=new THREE.Group();g.position.set(x,.16,z);terrain.add(g);for(let i=0;i<9;i++){let a=i*2.4+rng()*.4;let l=mesh(leafGeo,leafMats[i%4],g,0,.02,0);l.rotation.set(-1.05-rng()*.45,a,(rng()-.5)*.8);l.scale.setScalar(.45+rng()*.6);if(i===0&&rng()>.55){for(let j=0;j<5;j++){let a=j*6.28/5;let petal=mesh(new THREE.SphereGeometry(.065,5,3),petalMat,g,Math.cos(a)*.065,.3,Math.sin(a)*.065);petal.scale.set(.6,.25,1);}orb(g,0,.3,0,.025,mats.armor);}}g.scale.setScalar(scale);return g;}
for(let i=0;i<660;i++){let x=(rng()-.5)*23,z=(rng()-.5)*19;if(Math.abs(x)>9||Math.abs(z)>7||rng()<.07)foliage(x,z,.6+rng()*.75);}
function wall(x,z,axis,count,height=1){for(let row=0;row<height;row++)for(let i=0;i<count;i++){let xx=x+(axis==='x'?i*1.05:0),zz=z+(axis==='z'?i*1.05:0);let b=box(terrain,xx,row*.56+.35,zz,axis==='x'?1:.67,.53,axis==='z'?1:.67);b.rotation.y=(rng()-.5)*.09;}}
wall(-11,-9,'x',22,3);wall(-11,-8,'z',17,2);wall(11,-8,'z',17,2);wall(-10,9,'x',21,1);
for(let x of [-10,-5,0,5,10]){box(terrain,x,1.35,-9,.9,2.7,.9);box(terrain,x,2.75,-9,1.08,.22,1.08);}for(let z of [-5,0,5,9])for(let x of [-11,11]){box(terrain,x,1.05,z,.9,2.1,.9);box(terrain,x,2.15,z,1.1,.2,1.1);}
const obstacles=[],roomCover=new THREE.Group(),arenaGroup=new THREE.Group(),trapGroup=new THREE.Group();scene.add(roomCover,arenaGroup,trapGroup);let traps=[],trapClock=0;
for(let i=0;i<27;i++){let x=(rng()-.5)*21,z=(i%2?1:-1)*8.7;path([[x,0,z],[x+.6,.12,z-1],[x+.1,.17,z-2],[x+1,.15,z-2.4]],.06+rng()*.07,mats.root);}
function lantern(x,z,y=.6){let g=new THREE.Group();g.position.set(x,y,z);terrain.add(g);box(g,0,.15,0,.44,.12,.44,mats.black);box(g,0,.77,0,.5,.12,.5,mats.black);for(let a of [-1,1])for(let b of [-1,1])limb(g,[a*.18,.2,b*.18],[a*.18,.72,b*.18],.025,mats.black);orb(g,0,.45,0,.14,mats.amber);if(!mobileDevice){let light=new THREE.PointLight(0xffad45,7,5,2);light.position.y=.55;g.add(light);}return g;}
for(let p of [[-10,-7],[-6,-8],[1,-8],[9,-7],[-10,4],[10,5],[7,8]])lantern(...p);
// Ruined shrine, distant bridges and silhouettes frame the playable stone garden.
for(let x of [-7.8,-4.7]){box(terrain,x,2.2,-10,1,4.4,1.3);box(terrain,x,4.5,-10,1.4,.4,1.5);}let arch=mesh(new THREE.TorusGeometry(1.55,.42,7,12,Math.PI),mats.stone,terrain,-6.25,3.8,-10);arch.rotation.z=0;
let statue=new THREE.Group();statue.position.set(-6.25,.4,-9.8);terrain.add(statue);mesh(new THREE.ConeGeometry(.6,2.1,7),mats.armor,statue,0,1.05,0);orb(statue,0,2.4,0,.32,mats.armor);limb(statue,[-.5,1.7,0],[-.2,1.1,.3],.15,mats.armor);limb(statue,[.5,1.7,0],[.2,1.1,.3],.15,mats.armor);
for(let i=0;i<9;i++){let x=-18+rng()*36,z=-14-rng()*10;path([[x,-2,z],[x+.5,2,z],[x-.6,6,z],[x+1,10,z]],.32,mats.root);for(let k=0;k<5;k++){let crown=orb(terrain,x+(rng()-.5)*5,7+rng()*4,z+(rng()-.5)*4,1.8,mats.leaf);crown.scale.y=.6;}}
for(let x=3;x<22;x+=3.4){box(terrain,x,-.8,-18,1,8,1,mats.dark);box(terrain,x,3.3,-18,3.5,.6,2,mats.stone);}
// Broken edges, engraved garden seals and climbing roots give the garden a history.
for(let i=0;i<190;i++){let x=(rng()-.5)*22,z=(rng()-.5)*18;if(Math.abs(x)>9.3||Math.abs(z)>7.5){let rock=orb(terrain,x,.14,z,.1+rng()*.2,mats.stone);rock.scale.set(1,.6,1.3);rock.rotation.set(rng(),rng(),rng());}}
for(let radius of [.52,.63,.82,1.06]){let seal=mesh(new THREE.TorusGeometry(radius,.016,4,64),mats.armor,terrain,0,.09,.5);seal.rotation.x=Math.PI/2;}
for(let i=0;i<12;i++){let a=i*Math.PI/6;limb(terrain,[Math.cos(a)*.85,.09,.5+Math.sin(a)*.85],[Math.cos(a)*1.02,.09,.5+Math.sin(a)*1.02],.012,mats.armor);}
for(let x of [-10,-5,0,5,10]){for(let j=0;j<3;j++){let z=-9.4+j*.22;path([[x-.3,-.8,z],[x+.3,.5,z],[x-.2,1.2,z],[x+.3,2.5,z]],.035+j*.015,mats.root);for(let k=0;k<5;k++){let leaf=mesh(leafGeo,leafMats[k%4],terrain,x+Math.sin(k*2)*.3,k*.42,z+.45);leaf.rotation.set(.1,k,1);leaf.scale.setScalar(.6);}}}
// Terrace foundation continues down into the ravine rather than ending as a floating slab.
for(let x=-11;x<11;x+=1.4){box(terrain,x,-1.7,9,1.3,2.8,.8);if(Math.round(x)%3===0)path([[x,.6,9.4],[x+.3,-1,9.6],[x-.4,-3.1,9.3]],.12,mats.root);}
for(let z=-9;z<9;z+=1.4)for(let x of [-11,11])box(terrain,x,-1.7,z,.8,2.8,1.3);
const pool=mesh(new THREE.PlaneGeometry(65,65),new THREE.MeshStandardMaterial({color:0x172d35,normalMap:normal,normalScale:new THREE.Vector2(.015,.015),roughness:.68,metalness:.12}),scene,0,-3.4,0);pool.rotation.x=-Math.PI/2;
// Overhanging garden growth softens the square terrace and catches the moonlight.
for(let side of [-1,1])for(let j=0;j<8;j++){
 let x=side*(11.6+rng()*1.8),z=-8+j*2.7;
 path([[x,-3,z],[x-.35*side,.4,z],[x-side*.9,2.3,z+.4],[x-side*1.3,3.6,z+.8]],.10+rng()*.08,mats.root,terrain);
 for(let k=0;k<22;k++){
  let l=mesh(leafGeo,leafMats[k%4],terrain,x+(rng()-.5)*2,1.3+rng()*2.4,z+(rng()-.5)*2.4);
  l.rotation.set(-.5-rng(),rng()*6.28,rng()*2);l.scale.set(1.1+rng()*.9,1+rng()*1.6,1);
 }
}
for(let j=0;j<17;j++){
 let x=-11+rng()*22,z=-9-rng()*1.4;
 for(let k=0;k<12;k++){let l=mesh(leafGeo,leafMats[k%4],terrain,x+(rng()-.5),.5+rng()*2.7,z+(rng()-.5));l.rotation.set(rng()*2,rng()*6.28,rng());l.scale.setScalar(.7+rng());}
}
const bannerMat=new THREE.MeshStandardMaterial({color:0x193e3b,roughness:1,side:THREE.DoubleSide});
for(let x of [-8.5,-3.8]){let cloth=new THREE.PlaneGeometry(.95,2.1,5,10);let a=cloth.attributes.position;for(let i=0;i<a.count;i++)a.setZ(i,Math.sin(a.getY(i)*5+a.getX(i)*2)*.07);cloth.computeVertexNormals();mesh(cloth,bannerMat,terrain,x,2,-9.05);limb(terrain,[x-.6,3.05,-9],[x+.6,3.05,-9],.035,mats.armor);let sigil=mesh(new THREE.TorusGeometry(.22,.025,4,20),mats.armor,terrain,x,2,-8.94);for(let side of [-1,1])limb(terrain,[x,1.5,-8.94],[x+side*.26,2.3,-8.94],.018,mats.armor);}
// Batch immovable masonry and plants by material, retaining lantern lights.
terrain.updateMatrixWorld(true);const batches=new Map(),staticMeshes=[];terrain.traverse(o=>{if(o.isMesh){staticMeshes.push(o);let geo=o.geometry.clone();if(geo.index)geo=geo.toNonIndexed();geo.applyMatrix4(o.matrixWorld);if(!batches.has(o.material))batches.set(o.material,[]);batches.get(o.material).push(geo);}});for(let o of staticMeshes)o.removeFromParent();for(let [mat,geos]of batches){let merged=mergeGeometries(geos,false);if(merged){let ob=new THREE.Mesh(merged,mat);ob.castShadow=ob.receiveShadow=true;scene.add(ob);}for(let geo of geos)geo.dispose();}
const motes=[],moteGeometry=new THREE.IcosahedronGeometry(.025,1),moteMeshes=[new THREE.InstancedMesh(moteGeometry,mats.jade,30),new THREE.InstancedMesh(moteGeometry,mats.amber,15)],moteMatrix=new THREE.Matrix4();
for(let i=0,counts=[0,0];i<45;i++){const x=(rng()-.5)*28,y=rng()*4,z=(rng()-.5)*23,kind=i%3?0:1;motes.push({x,y,z,seed:rng()*9,kind,index:counts[kind]++});}
for(const m of moteMeshes){m.frustumCulled=false;m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(m);}
const player=createSeedBody(scene);player.scale.setScalar(1.35);player.position.set(0,0,5);let hp=100,dash=0,invuln=0,shootCD=0,elapsed=0,stage=0,mode='ready',paused=false,kills=0;const chosen=new Set(),mutated=new Set(),levels=new Map();let LS=lawStats(levels),choicesTaken=0,choiceKills=0;let dashLock=0,cachedTarget=null,targetTimer=0;const pulls=[],orbitHits=new Map();let cycle=0,region='garden';let roomCleared=false,exitOpen=false,roomStartKills=0,midReward=false,crowdLeft=0,crowdTimer=0,crowdIndex=0,autoAttack=true,playerSlow=0,orbitTime=0,orbitHitCD=0;const wells=[];const orbitGroup=new THREE.Group();scene.add(orbitGroup);for(let i=0;i<7;i++){const o=orb(orbitGroup,0,.65,0,.26,mats['shot-orbit']);o.scale.set(1.5,.55,.9);o.castShadow=false;}orbitGroup.visible=false;let enemies=[],shots=[],effects=[],enemyShots=[];const keys=new Set(),lastMove=new V(0,0,1);let keyboardDash=false;const aim=new V(0,0,-3);
const heldForms=new Map(),formCombats=new Map(),formCooldowns=new Map();let guideTarget=null,rerollUsed=false;const promptedForms=new Set();let arena=arenaFor(0),escortWaves=0,bossDefeated=false;const pendingEscorts=[];
// Score, boss counts and potions live for one run. Every fifth warden opens the way to the real boss.
let score=0,wardensDefeated=0,austinsDefeated=0,austinRoom=false,inventory=emptyInventory(),clockFloor=null,potionCD=0;const fallen=[];const JOURNEY_HEAL=25;
const isBoss=e=>e.type==='warden'||e.type==='austin';
function inAustinRoom(){return austinRoom&&stage===4;}
function austinAhead(){return !austinRoom&&Math.floor(wardensDefeated/5)>austinsDefeated;}
const appShell=setupMobileApp();
const touch=createTouchControls(()=>mode==='playing'&&!paused);
const playerMotion=createMotion(player,player.userData.legs);const growth=createSeedEvolution(player,playerMotion.body);let evolutionTime=0;const evolutionDuration=1.4;
function ring(parent,r,color){let mat=new THREE.MeshBasicMaterial({color,transparent:true,opacity:.75,side:THREE.DoubleSide});let m=mesh(new THREE.RingGeometry(r-.035,r,48),mat,parent);m.castShadow=false;m.rotation.x=-Math.PI/2;m.position.y=.12;return m;}
function enemy(type,x,z){let g=new THREE.Group();scene.add(g);g.position.set(x,0,z);let legs=[],arms=[];if(type==='hound'){let body=orb(g,0,.68,0,.56,mats.enemy);body.scale.set(.8,.75,1.5);orb(g,0,.66,.7,.36,mats.enemy);let snout=orb(g,0,.52,1,.21,mats.enemy);snout.scale.z=1.5;for(let side of [-1,1]){orb(g,side*.18,.76,.95,.055,mats.amber);for(let zz of [-.5,.5]){let l=new THREE.Group();l.position.set(side*.35,.55,zz);g.add(l);limb(l,[0,0,0],[side*.16,-.28,.03],.12,mats.enemy);limb(l,[side*.16,-.28,.03],[side*.2,-.5,.21],.09,mats.enemy);legs.push(l);}}for(let i=0;i<6;i++){let s=mesh(new THREE.ConeGeometry(.12,.58,5),mats.enemy,g,0,1.04,-.65+i*.23);s.rotation.x=-.6;}path([[0,.65,-.65],[.2,.7,-1.2],[.5,.9,-1.5]],.09,mats.root,g);}else{mesh(new THREE.ConeGeometry(.52,1.45,6,1,true),mats.black,g,0,.98,0);orb(g,0,1.85,0,.22,mats.enemy);for(let side of [-1,1]){const leg=new THREE.Group();leg.position.set(side*.17,.65,0);g.add(leg);limb(leg,[0,0,0],[side*.15,-.53,.13],.075,mats.black);legs.push(leg);const arm=new THREE.Group();arm.position.set(side*.28,1.5,0);g.add(arm);limb(arm,[0,0,0],[side*.18,-.45,.3],.1,mats.enemy);arms.push(arm);let horn=mesh(new THREE.ConeGeometry(.09,.75,4),mats.amber,g,side*.17,2.2,0);horn.rotation.z=-side*.3;}orb(g,0,1.16,.37,.18,mats.amber);limb(g,[.6,.05,.25],[.6,2,.25],.035,mats.root);}if(type==='hound'){for(let side of [-1,1]){for(let i=0;i<4;i++){let plate=orb(g,side*.3,.92,-.45+i*.29,.22,mats.enemy);plate.scale.set(.8,.32,1.25);plate.rotation.z=side*.4;let spike=mesh(new THREE.ConeGeometry(.07,.36,5),mats.armor,g,side*.36,1.05,-.4+i*.3);spike.rotation.z=-side*.7;}for(let tooth=0;tooth<3;tooth++){let fang=mesh(new THREE.ConeGeometry(.026,.12,4),mats.armor,g,side*.13,.45,.91+tooth*.09);fang.rotation.z=Math.PI;}}}else{for(let side of [-1,1]){let shoulder=orb(g,side*.3,1.53,0,.21,mats.enemy);shoulder.scale.set(.8,.55,1.4);for(let i=0;i<2;i++){let crown=mesh(new THREE.ConeGeometry(.055,.45+i*.2,4),mats.amber,g,side*(.06+i*.18),2.24-i*.13,.05);crown.rotation.z=-side*(.12+i*.25);}}}g.scale.setScalar(type==='hound'?1.3:1.22);let e={g,type,hp:type==='hound'?78+stage*10:92+stage*12,timer:.35+rng()*.7,state:'stalk',dir:new V(),legs,phase:rng()*6,hit:0};e.motion=createMotion(g,legs,arms);e.ring=ring(g,type==='hound'?.9:1.1,0xed7d30);e.ring.material.opacity=.25;
let tellMat=new THREE.MeshBasicMaterial({color:0xff932d,transparent:true,opacity:.2,depthWrite:false,side:THREE.DoubleSide});
let tell=mesh(type==='hound'?new THREE.PlaneGeometry(.9,4.8):new THREE.RingGeometry(1.1,1.3,48),tellMat,g,0,.095,type==='hound'?2.7:0);tell.castShadow=false;tell.rotation.x=-Math.PI/2;tell.visible=false;e.tell=tell;
attachActorArt(e,camera,release,{file:type==='hound'?'enemy-hound-v4.png':'enemy-caster-v4.png',size:type==='hound'?1.75:2.2,directional:true});enemies.push(e);return e;}
function swarm(x,z){
 const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);
 const body=orb(g,0,.33,0,.3,mats.root);body.scale.set(1,.75,1.3);body.castShadow=false;
 const eye=orb(g,0,.43,.23,.085,mats.amber);eye.castShadow=false;
 for(const side of [-1,1]){const leaf=mesh(new THREE.ConeGeometry(.11,.38,4),mats.leaf,g,side*.2,.5,0);leaf.rotation.z=-side*.65;leaf.castShadow=false;}
 const e={g,type:'swarm',hp:(26+stage*5)*difficulty(cycle,region).hp*levelPressure(),state:'stalk',timer:0,phase:Math.random()*6,hit:0,slow:0};attachActorArt(e,camera,release,{file:'enemy-hound-v4.png',size:.95,directional:true});enemies.push(e);
}
function spawnCrowd(n){for(let i=0;i<n&&crowdLeft>0&&enemies.length<CROWD_CAP;i++){const p=safeArenaSpawn(player.position,obstacles,crowdIndex++,arena);if(!p)break;swarm(p.x,p.z);crowdLeft--;}}
function applyLawHit(e,amount,secondary=false){
 damageEnemy(e,amount*(secondary&&isBoss(e)?.65:1),!secondary);
 if(chosen.has('frost'))e.slow=Math.max(e.slow||0,LS.frostTime);
 if(secondary)return;
 if(chosen.has('burst')){
  const radius=LS.burstRadius;vfx.pulse(e.g.position,'burst',radius*.45,.35);vfx.burst(e.g.position,'burst',12);
  for(const other of enemies)if(other!==e&&!other.dead&&other.g.position.distanceTo(e.g.position)<radius)applyLawHit(other,amount*.5,true);
 }
 if(chosen.has('gravity')){if(wells.length>=6)wells.shift();wells.push({pos:e.g.position.clone(),life:1.6,pulse:0});}
}
const gate=new THREE.Group();gate.position.set(EXIT.x,0,EXIT.z);scene.add(gate);
const gateRing=ring(gate,1,0xa9ffda);const gateHalo=mesh(new THREE.TorusGeometry(.7,.08,6,40),mats.jade,gate,0,1.1,0);gate.visible=false;
document.body.insertAdjacentHTML('beforeend','<button id="exit-room" hidden>다음 방으로 · E</button><div id="boss-hud" hidden><strong>기억의 문지기</strong><div><i></i></div><small></small></div><div id="score-hud" hidden><small>점수</small><b>0</b></div><button id="use-potion" hidden aria-label="시간의 물약 마시기"><i class="potion-icon" aria-hidden="true"></i><b>×0</b><small>Q</small></button>');
$('#use-potion').onclick=()=>{usePotion();$('#use-potion').blur();};
$('#rules').innerHTML=Object.entries(LAWS).map(([id,v])=>`<div data-rule="${id}" title="${v.name}">${lawArt(id)}<span>${v.name}</span></div>`).join('');
document.body.insertAdjacentHTML('beforeend','<div id="growth-progress"><span></span><div><i></i></div></div><div id="overhead" hidden><div class="oh-hp"><i></i></div><div class="oh-dash"><i></i></div><b class="oh-lock" hidden>회피 봉인</b></div>');
$('#exit-room').onclick=useExit;$('#stages').innerHTML=ROOMS.map(()=>'<span>♧</span>').join('<i></i>');
function drawRoom(){const clockRoom=inAustinRoom();arena=clockRoom?AUSTIN_ARENA:arenaFor(stage,cycle,region);for(const child of [...arenaGroup.children])release(child);buildRoomBoundary();clockFloor=clockRoom?createClockFloor(arenaGroup):null;for(const child of [...roomCover.children])release(child);obstacles.splice(0,obstacles.length,...(clockRoom?[]:ROOMS[stage].covers).map(o=>({...o})));buildCoverArt(roomCover,obstacles,mats);for(const child of [...trapGroup.children])release(child);traps=clockRoom?[]:trapsFor(stage,cycle);for(const t of traps)t.visual=createTrapVisual(trapGroup,t,mats);}
let runStorage;try{runStorage=window.localStorage;}catch{runStorage=null;}
let saveOK=false,profile=readDiscoveries(runStorage);
function buildRoomBoundary(){buildArenaBoundary(arenaGroup,arena,mats);}
function remember(kind,id){const result=recordDiscovery(runStorage,profile,kind,id);profile=result.profile;if(!result.saved)$('#toast').textContent='발견은 이번 접속에만 남습니다 · 브라우저 저장 불가';return result;}
function syncLaws(){chosen.clear();mutated.clear();for(const [id,v] of levels){chosen.add(id);if(v>=2)mutated.add(id);}LS=lawStats(levels);document.querySelectorAll('#rules>div').forEach(n=>{const lv=levelOf(levels,n.dataset.rule);n.classList.toggle('active',lv>0);n.querySelector('span:not(.law-art)').textContent=LAWS[n.dataset.rule].name+(lv?' Lv.'+lv:'');});}
function levelPressure(){return 1+.07*Math.max(0,buildLevel(levels,heldForms)-1);}
function effectiveLaws(){return [...effectiveLevels(levels,heldForms).keys()];}
function syncForms(reset=false){
 for(const [id,combat] of formCombats)if(!heldForms.has(id)){combat.dispose();formCombats.delete(id);formCooldowns.delete(id);}
 for(const [id,level] of heldForms){let combat=formCombats.get(id);if(!combat){combat=createFormCombat(scene,formOptions());formCombats.set(id,combat);formCooldowns.set(id,0);}if(reset)combat.clear();combat.set(id,level);}
 updateFormLabel();
}
function clearForms(){syncForms(true);}
function syncForm(){syncForms();}
function finishChoice(){mode='playing';$('#overlay').hidden=true;invuln=Math.max(invuln,.7);shootCD=0;if(roomCleared)openExit();}
function offerForm(force=false,onDone=finishChoice){
 const candidates=eligibleForms(chosen).filter(f=>force||!promptedForms.has(f.id));
 if(!candidates.length)return false;
 mode='forms';touch.reset();keys.clear();keyboardDash=false;$('#overlay').hidden=false;$('#overlay').classList.remove('intro');
 candidates.forEach(f=>promptedForms.add(f.id));
 $('#overlay').innerHTML=`<p>두 법칙을 하나로 합치기</p><h2>완성 진화</h2><p>재료 두 법칙이 사라지고 진화가 한 칸을 차지합니다. 기본 탄환은 남은 법칙으로 계속 나갑니다.</p><div class="form-cards">${candidates.map(f=>formCard(f,[...chosen],profile.forms.includes(f.id),true,(heldForms.get(f.id)||0)+fusionLevel(levels,f.id),heldForms.get(f.id)||0)).join('')}</div><p class="form-note">합칠 때 두 법칙의 레벨이 진화 레벨이 됩니다(레벨 합 - 1). 이미 가진 진화를 또 합치면 그 진화가 강해집니다.<br>진화는 이후 선택지에서 따로 강화할 수 있고, 빈 칸에는 새 법칙을 다시 받을 수 있어요.</p><button id="keep-form" class="primary">지금은 합치지 않기</button>`;
 document.querySelectorAll('[data-form]').forEach(b=>b.onclick=()=>{if(mode!=='forms')return;const id=b.dataset.form;if(!fuse(levels,heldForms,id))return;remember('forms',id);syncLaws();syncForms();growth.select(effectiveLaws(),mutated);vfx.evolution(player.position,FORMS[id].requires[0]);onDone();$('#toast').textContent=`${FORMS[id].name} Lv.${heldForms.get(id)} · 두 법칙이 한 칸으로 합쳐졌습니다`;});
 $('#keep-form').onclick=onDone;return true;
}
function formHit(e,amount,meta){
 if(DIRECT_FORMS.has(meta.kind)&&!meta.indirect&&blocksShield(e,meta.direction)){e.block=.18;vfx.pulse(e.g.position,'reflect',.65,.18);return false;}
 const consumed=FORMS[meta.kind].requires;
 const supports=id=>chosen.has(id)&&!consumed.includes(id);
 damageEnemy(e,amount*damageScale(levels),false);
 if(supports('frost'))e.slow=Math.max(e.slow||0,LS.frostTime);
 if(supports('chain'))for(const other of enemies.filter(o=>o!==e&&!o.dead&&o.g.position.distanceTo(e.g.position)<4).sort((a,b)=>a.g.position.distanceTo(e.g.position)-b.g.position.distanceTo(e.g.position)).slice(0,LS.chainTargets)){line(e.g.position,other.g.position);damageEnemy(other,amount*.18,false);}
 if(supports('burst')){vfx.pulse(e.g.position,'burst',.7,.25);for(const other of enemies)if(other!==e&&!other.dead&&other.g.position.distanceTo(e.g.position)<LS.burstRadius)damageEnemy(other,amount*.18,false);}
 if(supports('gravity')){if(wells.length>=6)wells.shift();wells.push({pos:e.g.position.clone(),life:1.2,pulse:0});}
 return true;
}
function formOptions(){return {player,enemies:()=>enemies,hit:formHit,blocked:(a,b)=>segmentHitsCover(a,b,obstacles,.1),boundary:(a,b,d)=>reflectArenaBoundary(a,b,d,arena),constrain:collide,vfx,enemyShots:()=>enemyShots};}
function clearEscorts(){for(const p of pendingEscorts)release(p.marker);pendingEscorts.length=0;}
function updateEscorts(dt){
 const boss=enemies.find(e=>e.type==='warden');if(stage!==4||!boss)return;
 if(boss.dead){clearEscorts();if(!bossDefeated){bossDefeated=true;remember('bosses','warden');for(const e of enemies)if(e.escort&&!e.dead){e.dead=true;release(e.g);}}return;}
 const wave=escortWave(boss.hp,boss.maxHp,escortWaves);
 if(wave>=0&&pendingEscorts.length===0){escortWaves++;let free=4-enemies.filter(e=>e.escort&&!e.dead).length;for(const type of escortTypes(wave)){if(free--<=0)break;const pos=safeArenaSpawn(player.position,obstacles,crowdIndex++,arena);if(!pos)continue;const marker=ring(scene,1,0xffa95f);marker.position.set(pos.x,.15,pos.z);pendingEscorts.push({type,pos,marker,wait:1});}}
 for(let i=pendingEscorts.length-1;i>=0;i--){const p=pendingEscorts[i];p.wait-=dt;p.marker.material.opacity=.45+Math.sin(p.wait*18)*.2;if(p.wait>0)continue;
 if(Math.hypot(p.pos.x-player.position.x,p.pos.z-player.position.z)>2){let e;if(p.type==='shield'){e=createShield(scene);e.g.position.set(p.pos.x,0,p.pos.z);attachActorArt(e,camera,release,{file:'enemy-shield-v4.png',size:2.05,directional:true,baseline:.06});enemies.push(e);}else e=enemy('caster',p.pos.x,p.pos.z);e.escort=true;e.hp*=difficulty(cycle,region).hp;if(e.maxHp)e.maxHp=e.hp;}
 release(p.marker);pendingEscorts.splice(i,1);
 }
}

function saveBoundary(nextStage=stage,saveMode='entry',over={}){
 saveOK=writeCheckpoint(runStorage,{version:1,cycle,region,stage:nextStage,mode:saveMode,hp,rules:[...chosen],mutated:[...mutated],levels:levelsToSave(levels),choicesTaken,choiceKills,kills,elapsed,forms:Object.fromEntries(heldForms),guideTarget,rerollUsed,score,wardens:wardensDefeated,austins:austinsDefeated,inventory:{...inventory},...over});
 return saveOK;
}
// After a warden the journey simply continues: a little health back, and every enemy a little faster.
function nextJourney(){austinRoom=false;cycle++;rerollUsed=false;stage=0;const before=hp;hp=Math.min(100,hp+JOURNEY_HEAL);wave();$('#toast').textContent=`여정 ${cycle+1} · 생명력 +${hp-before} · 적이 조금 더 빨라집니다`;}
function enterAustin(){austinRoom=true;wave();$('#toast').textContent=`${AUSTIN.name} 등장 · 바닥 시계의 침이 다음 종소리의 빈틈을 가리킵니다`;}
function saveAfterBoss(){if(austinAhead())return saveBoundary(4,'austin');return saveBoundary(0,'entry',{cycle:cycle+1,hp:Math.min(100,hp+JOURNEY_HEAL),rerollUsed:false});}
document.body.insertAdjacentHTML('beforeend','<button id="save-exit" hidden>저장된 방 입구부터 나중에 이어하기</button>');
const pauseBuild=createPauseBuild($('#save-exit'),()=>togglePause());
$('#save-exit').onclick=()=>{if(!readCheckpoint(runStorage)){$('#toast').textContent='저장 기록이 없습니다. 이 브라우저의 저장 공간을 확인해 주세요.';return;}touch.reset();keys.clear();paused=false;$('#save-exit').hidden=true;showIntro();};
function wave(){
 for(const f of fallen)releaseEnemy(f.e);fallen.length=0;potionCD=0;
 clearForms();cachedTarget=null;targetTimer=0;clearEscorts();escortWaves=0;bossDefeated=false;vfx.clear();wells.length=0;roomStartKills=kills;midReward=false;trapClock=0;pulls.length=0;orbitHits.clear();dashLock=0;crowdLeft=CROWD_TOTALS[stage];crowdTimer=0;crowdIndex=0;orbitHitCD=0;
 roomCleared=false;exitOpen=false;gate.visible=false;$('#exit-room').hidden=true;$('#toast').textContent='';
 for(const p of [...shots,...enemyShots,...effects])release(p.ob);shots=[];enemyShots=[];effects=[];
 drawRoom();player.position.set(0,0,5);playerMotion.reset();invuln=Math.max(invuln,.8);
 if(inAustinRoom()){const e=createAustin(scene);e.g.position.set(0,0,-3);if(AUSTIN_ART)attachActorArt(e,camera,release,{file:AUSTIN_ART,size:4.3,directional:true,baseline:.02});enemies.push(e);$('#boss-hud strong').textContent=AUSTIN.name;}
 else for(const [type,x,z] of ROOMS[stage].enemies){if(type==='warden'){const e=createWarden(scene,mats,wardenVariantFor(cycle));e.tint=0xffffff;e.g.position.set(x,0,z);attachActorArt(e,camera,release,{file:`warden-${e.variant}-v4.png`,order:e.variant==='memory'?[0,3,2,1]:[0,1,2,3],size:4.1,directional:true,baseline:.02});enemies.push(e);$('#boss-hud strong').textContent=e.config.name;}else enemy(type,x,z);}
 if(stage===3){const e=createWarden(scene,mats,wardenVariantFor(cycle+1));e.elite=true;e.tint=0xffffff;e.hp=e.maxHp=1150*.36;e.g.position.set(0,0,-5);attachActorArt(e,camera,release,{file:`warden-${e.variant}-v4.png`,order:e.variant==='memory'?[0,3,2,1]:[0,1,2,3],size:3.1,directional:true,baseline:.02});enemies.push(e);}
 for(const spot of inAustinRoom()?[]:turretSpots(stage,cycle)){const t=createTurret(scene,mats,copiedLaws(effectiveLevels(levels,heldForms)));t.g.position.set(spot.x,0,spot.z);attachActorArt(t,camera,release,{file:'enemy-turret-v4.png',size:3.0,preserveBody:true});enemies.push(t);}
 if(stage<4&&(stage===1||stage===3||cycle>0)){const e=createShield(scene);e.g.position.set(stage===3?0:1.6,0,stage===3?2:-4);attachActorArt(e,camera,release,{file:'enemy-shield-v4.png',size:2.05,directional:true,baseline:.06});enemies.push(e);}
 for(const e of enemies){e.hp*=(isBoss(e)?difficulty(cycle,region).bossHp:difficulty(cycle,region).hp)*levelPressure();if(e.maxHp)e.maxHp=e.hp;}
 saveBoundary(stage,inAustinRoom()?'austin':'entry');spawnCrowd(8);$('#encounter').textContent=`여정 ${cycle+1} · ${inAustinRoom()?'정시의 시계탑 · '+AUSTIN.name:REGION_NAMES[region]+' · '+ROOMS[stage].name}`;
 [...document.querySelectorAll('#stages span')].forEach((n,i)=>n.classList.toggle('active',i<=stage));$('#boss-hud').hidden=stage!==4;
}
function openExit(){if(stage===4)saveAfterBoss();else saveBoundary(stage+1);exitOpen=true;gate.visible=true;$('#toast').textContent=stage!==4?'방을 정리했다 · 빛나는 출구로 이동하세요':austinRoom?'오스틴을 이겼다 · 빛나는 출구로 다음 여정을 떠나세요':austinAhead()?'문지기 다섯 번째 격파 · 출구 너머에서 진짜 보스가 기다립니다':'문지기가 쓰러졌다 · 빛나는 출구로 다음 여정을 떠나세요';}
function useExit(){if(!canUseExit({open:exitOpen,mode,paused,x:player.position.x,z:player.position.z}))return;touch.reset();keys.clear();keyboardDash=false;exitOpen=false;gate.visible=false;$('#exit-room').hidden=true;$('#toast').textContent='';if(stage===4){if(austinAhead())enterAustin();else nextJourney();}else{stage++;wave();}}
function enemyBolt(pos,kind,frost=false){
 const g=new THREE.Group();g.position.set(pos.x,.65,pos.z);scene.add(g);const boss=kind==='boss';
 const core=new THREE.Mesh(boss?new THREE.OctahedronGeometry(.3,0):new THREE.IcosahedronGeometry(.19,0),frost?mats.frostBolt:boss?mats.bossBolt:mats.enemyBolt);g.add(core);
 const halo=new THREE.Mesh(new THREE.RingGeometry(boss?.36:.24,boss?.46:.3,boss?6:16),boss?mats.bossHalo:mats.enemyHalo);halo.rotation.x=-Math.PI/2;g.add(halo);
 if(boss)for(let i=0;i<4;i++){const out=new V(Math.cos(i*Math.PI/2),0,Math.sin(i*Math.PI/2));const spike=new THREE.Mesh(new THREE.ConeGeometry(.07,.34,4),mats.bossBolt);spike.quaternion.setFromUnitVectors(new V(0,1,0),out);spike.position.copy(out).multiplyScalar(.36);g.add(spike);}
 return g;
}
function turretBolt(pos,dir,spec){const start=pos.clone().addScaledVector(dir,1.1);const ob=enemyBolt(start,'turret',spec.frost);enemyShots.push({ob,dir:dir.clone(),life:4.5,bounces:spec.bounces,speed:TURRET.boltSpeed*difficulty(cycle,region).speed,damage:TURRET.boltDamage,age:0,origin:pos.clone(),pierce:spec.pierce,recall:spec.recall,frost:spec.frost,burst:spec.burst,gravity:spec.gravity});}
function endEnemyShot(p){
 if(p.burst){vfx.pulse(p.ob.position,'burst',1.6,.35);vfx.burst(p.ob.position,'burst',18);if(!p.struck&&Math.hypot(p.ob.position.x-player.position.x,p.ob.position.z-player.position.z)<1.6)hitPlayer(12);}
 if(p.gravity){if(pulls.length>=4)pulls.shift();pulls.push({pos:p.ob.position.clone().setY(0),life:1.4,pulse:0});}
}
function bossBolt(pos,dir,bounces,laws=[]){const start=pos.clone().addScaledVector(dir,1.25);const ob=enemyBolt(start,'boss',laws.includes('frost'));enemyShots.push({boss:true,ob,dir,life:5,bounces,speed:6.8,damage:18,age:0,origin:pos.clone(),pierce:true,recall:laws.includes('recall'),frost:laws.includes('frost')});}

function burst(pos,color,n=12){vfx.burst(pos,color,n);}
function line(a,b){vfx.arc(a,b);}
function damageEnemy(e,amount,chaining=true){if(e.state==='recover')amount*=1.35;e.hp-=amount;e.hit=.14;vfx.impact(e.g.position,chaining?([...chosen][0]||'seed'):'chain');if(chaining&&chosen.has('chain')){let nearby=enemies.filter(o=>o!==e&&o.hp>0&&o.g.position.distanceTo(e.g.position)<4).sort((a,b)=>a.g.position.distanceTo(e.g.position)-b.g.position.distanceTo(e.g.position)).slice(0,LS.chainTargets);for(let o of nearby){line(e.g.position,o.g.position);damageEnemy(o,amount*(isBoss(o)?.325:.5),false);}}if(e.hp<=0&&!e.dead){e.dead=true;kills++;choiceKills++;vfx.impact(e.g.position,'amber',true);enemyDown(e);}}
function enemyDown(e){
 score+=killPoints(e,cycle);
 if(!isBoss(e)){releaseEnemy(e);return;}
 // A boss falls over a short beat instead of vanishing, and the reward waits for it, so a choice screen never seems to erase the boss.
 const main=!e.elite;fallen.push({e,t:0,hold:main});
 cameraShake=Math.max(cameraShake,main?.4:.22);vfx.pulse(e.g.position,'amber',main?3.2:2,.6);vfx.burst(e.g.position,'amber',main?40:24,2);
 if(main){invuln=Math.max(invuln,1.6);for(const p of enemyShots)release(p.ob);enemyShots=[];}
 if(e.type==='austin'){austinsDefeated++;remember('bosses','austin');const got=addItem(inventory,'potion',1);$('#toast').textContent=`${AUSTIN.name} 격파! · ${got?ITEMS.potion.name+' 획득 · Q로 마시기':'물약 가방이 가득 찼습니다'}`;}
 else if(main){wardensDefeated++;$('#toast').textContent=`${e.config?.name||'문지기'} 격파!${austinAhead()?' · 무언가 째깍거리는 소리가 들립니다':''}`;}
 else $('#toast').textContent='정예 문지기 격파!';
}
function updateFallen(dt,time){for(let i=fallen.length-1;i>=0;i--){const f=fallen[i],e=f.e;f.t+=dt;const k=Math.min(1,f.t/1.3);e.hit=Math.floor(f.t*14)%2?.14:0;e.updateArt?.(time);e.g.position.y=-k*k*1.1;e.g.scale.setScalar(1-k*.3);if(Math.floor(f.t/.18)!==Math.floor((f.t-dt)/.18))vfx.burst(e.g.position,'amber',10,1.2);if(f.t>=1.3){releaseEnemy(e);fallen.splice(i,1);}}}
function austinBolt(pos,dir,spec){const g=new THREE.Group();g.position.set(pos.x+dir.x*1.3,.65,pos.z+dir.z*1.3);scene.add(g);const core=new THREE.Mesh(austinGeo.core,mats.austinBolt);core.castShadow=false;g.add(core);const halo=new THREE.Mesh(austinGeo.halo,mats.austinHalo);halo.rotation.x=-Math.PI/2;halo.castShadow=false;g.add(halo);enemyShots.push({boss:true,ob:g,dir:dir.clone(),life:4,bounces:0,speed:spec.speed,damage:spec.damage,age:0,origin:pos.clone(),pierce:true});}
function usePotion(){if(mode!=='playing'||paused||potionCD>0)return;const r=drinkPotion(inventory,hp);if(!r.ok){$('#toast').textContent=r.reason==='full'?'생명력이 가득합니다 · 물약은 아껴 두세요':'물약이 없습니다';return;}hp=r.hp;potionCD=.6;if(exitOpen){if(stage===4)saveAfterBoss();else saveBoundary(stage+1);}vfx.pulse(player.position,'seed',1.6,.5);vfx.burst(player.position,'seed',24,1.4);$('#toast').textContent=`${ITEMS.potion.name} · 생명력 +${r.healed}`;}
function projectile(pos,dir,fragment=false,ignoreEnemy=null){let ob=orb(scene,pos.x,.67,pos.z,fragment?.07:.12,mats.jade);ob.castShadow=false;ob.scale.z=1.8;const tint=fragment?'split':([...chosen][0]||'seed');ob.material=mats['shot-'+tint];shots.push({ob,dir:dir.clone(),life:2.3,bounces:0,fragment,ignoreEnemy,tint,age:0,returning:false,hitSet:new Set(),hits:0,trailTime:0,trailPos:ob.position.clone()});}
function hitPlayer(amount){if(invuln>0||mode!=='playing')return;hp=Math.max(0,hp-amount);invuln=.65;burst(player.position,'amber',16);cameraShake=.18;if(hp<=0){clearCheckpoint(runStorage);mode='dead';showEnd(false);}}
let cameraShake=0;const aimRing=ring(scene,.22,0xa4f8db);aimRing.material.opacity=.5;aimRing.visible=false;
function collide(pos,r=.4){constrainToArena(pos,r,arena);for(let o of obstacles){let dx=pos.x-o.x,dz=pos.z-o.z,wx=o.w/2+r,wz=o.d/2+r;if(Math.abs(dx)<wx&&Math.abs(dz)<wz){if(wx-Math.abs(dx)<wz-Math.abs(dz))pos.x=o.x+Math.sign(dx||1)*wx;else pos.z=o.z+Math.sign(dz||1)*wz;}}constrainToArena(pos,r,arena);}
function cardChoice(mid=false,fixedOffer=null){
 touch.reset();keys.clear();keyboardDash=false;mode='cards';
 const guide=guideTarget&&profile.forms.includes(guideTarget)?FORMS[guideTarget].requires.find(id=>!levels.has(id)):null;
 let offered=fixedOffer||offerChoices(levels,{guide,forms:heldForms});
 if(!offered.length){mode='playing';if(roomCleared)openExit();return;}
 $('#overlay').hidden=false;$('#overlay').innerHTML=`<p>${mid?'처치 게이지 가득':inAustinRoom()?'오스틴 격파 보상':'문지기 격파 보상'} · 슬롯 ${slotsUsed(levels,heldForms)}/${SLOT_CAP}</p><h2>${slotsUsed(levels,heldForms)>=SLOT_CAP?'법칙을 더 깊게':chosen.size?'어떤 씨앗으로 자랄까요':'첫 법칙이 깨어납니다'}</h2><p>${slotsUsed(levels,heldForms)>=SLOT_CAP?'슬롯이 가득 찼습니다 · 가진 법칙과 진화를 끝없이 강화합니다':'슬롯 '+SLOT_CAP+'개를 채운 뒤에는 강화만 합니다'} · 다음 선택까지 ${killsForChoice(choicesTaken)} 처치</p><div class="build-preview">${[...chosen].map(id=>`<span class="build-law">${lawArt(id)}${LAWS[id].name} Lv.${levelOf(levels,id)}</span>`).concat([...heldForms].map(([f,l])=>`<span class="build-law build-form">${formArt(f)}${FORMS[f].name} Lv.${l}</span>`)).join('<span class="build-link">◇</span>')||'아직 이름 없는 시드'}</div><div class="cards">${offered.map(id=>{const fid=offeredForm(id);if(fid){const f=FORMS[fid],lv=heldForms.get(fid);return `<button class="card form-upgrade" data-choice="${id}" style="--law-color:#e8c26a">${formArt(fid,'card-art')}<strong>${f.name} Lv.${lv+1}</strong><p>진화 강화</p><small>${formUpgradeLine(fid,lv)}</small><span class="synergy">${f.strength}</span></button>`;}const held=chosen.has(id),v=LAWS[id];return `<button class="card" data-choice="${id}" style="--law-color:#${v.color.toString(16).padStart(6,'0')}">${lawArt(id,'card-art')}<strong>${v.name} Lv.${held?levelOf(levels,id)+1:1}</strong><p>${held?'강화 Lv.'+levelOf(levels,id)+' → '+(levelOf(levels,id)+1):'새로운 법칙'}</p><small>${held?upgradeLine(levels,id)+' · 모든 탄 피해 +10%':v.desc}</small><span class="synergy">${formLawHint(id,chosen)||synergyHint(id,[...chosen])}</span></button>`;}).join('')}</div>`;
 const goals=Object.values(FORMS).filter(f=>f.requires.filter(id=>chosen.has(id)).length===1).slice(0,4).map(f=>`${f.name}까지 ${LAWS[f.requires.find(id=>!chosen.has(id))].name}`).join(' · ');
 $('#overlay').insertAdjacentHTML('beforeend',`<div class="form-progress">${heldForms.size?'보유 진화: '+[...heldForms].map(([f,l])=>FORMS[f].name+' Lv.'+l).join(', ')+' · ':''}${goals||'법칙 두 개를 맞추면 완성 진화 · 발견 '+profile.forms.length+'/'+Object.keys(FORMS).length}</div><div class="form-actions">${rerollUnlocked(profile)&&!rerollUsed?'<button class="primary" id="reroll-laws">선택지 새로고침 · 이번 여정 1회</button>':''}${eligibleForms(chosen).length?'<button class="primary" id="change-form">합칠 수 있는 진화 보기</button>':''}</div>`);
 if($('#reroll-laws'))$('#reroll-laws').onclick=()=>{if(mode!=='cards'||rerollUsed)return;rerollUsed=true;const checkpoint=readCheckpoint(runStorage);if(checkpoint)writeCheckpoint(runStorage,{...checkpoint,rerollUsed:true});cardChoice(mid);};
 if($('#change-form'))$('#change-form').onclick=()=>offerForm(true,()=>cardChoice(mid,offered));
 document.querySelectorAll('[data-choice]').forEach(button=>button.onclick=()=>{if(mode!=='cards')return;const id=button.dataset.choice;if(!chooseLaw(levels,id,heldForms))return;syncLaws();const fid=offeredForm(id);if(fid){syncForms();vfx.evolution(player.position,FORMS[fid].requires[0]);finishChoice();$('#toast').textContent=`${FORMS[fid].name} Lv.${heldForms.get(fid)}`;return;}beginEvolution(id);});
}

function updateFormLabel(){ $('#form-label').textContent=[...[...heldForms].map(([f,l])=>FORMS[f].name+' Lv.'+l),...[...chosen].map(id=>LAW_PRESENTATION[id].name+' Lv.'+levelOf(levels,id))].join(' · ')||'아직 이름 없는 씨드'; }
function beginEvolution(id){
  syncForms(true);
  touch.reset();mode='evolving';evolutionTime=0;keyboardDash=false;keys.clear();player.userData.dashTime=0;player.visible=true;playerMotion.reset();
  for(const p of [...shots,...enemyShots,...effects])release(p.ob);shots=[];enemyShots=[];effects=[];
  $('#overlay').hidden=true;$('#evolution').hidden=false;
  $('#evolution-title').textContent=LAW_PRESENTATION[id].name+' Lv.'+levelOf(levels,id);
  $('#evolution-hint').textContent=LAW_PRESENTATION[id].hint;
  growth.select(effectiveLaws(),mutated);updateFormLabel();vfx.clear();vfx.evolution(player.position,id);
}
function startGame(){if(mode==='ready')restart();}
function showIntro(){pauseBuild.hide();austinRoom=false;drawRoom();$('#evolution').hidden=true;player.visible=true;paused=false;keys.clear();touch.reset();$('#pause').textContent='Ⅱ';$('#toast').textContent='';$('#boss-hud').hidden=true;$('#exit-room').hidden=true;gate.visible=false;
  mode='ready';$('#overlay').classList.add('intro');$('#overlay').hidden=false;
  $('#overlay').innerHTML='<p class="eyebrow">SEED · 첫 발아</p><h2>잠든 정원을 깨우다</h2><p>하나의 시드로 시작해 문지기 너머의 여정을 이어가세요.<br>포탑은 당신이 가장 키운 법칙 두 개를 따라 쏩니다. 바닥의 붉은 판은 곧 가시가 솟습니다.</p><div class="intro-controls"><span><kbd>W A S D</kbd> 이동</span><span><kbd>자동 공격</kbd> 가까운 적을 자동으로 공격</span><span><kbd>SPACE</kbd> 회피</span></div><button id="start-game" class="primary">정원에 들어가기 <small>↵ ENTER</small></button>';
  if(touch.enabled){$('.intro-controls').innerHTML='<span><kbd>왼손 스틱</kbd> 이동</span><span><kbd>자동 공격</kbd> 이동과 회피에 집중하세요</span><span><kbd>◇ 버튼</kbd> 회피</span>';$('#start-game small').textContent='가로 화면 권장';}
  $('#start-game').onclick=()=>{$('#overlay').classList.remove('intro');startGame();};
  const saved=readCheckpoint(runStorage);
  if(saved){$('#start-game').insertAdjacentHTML('beforebegin',`<button id="continue-run" class="primary">여정 ${saved.cycle+1} · ${saved.mode==='crossroads'?'다음 여정':saved.mode==='austin'?AUSTIN.name:(saved.stage+1)+'번째 방'} 이어하기</button>`);$('#continue-run').onclick=()=>restart(saved);$('#start-game').innerHTML='새 씨앗으로 시작 <small>저장된 도전을 교체합니다</small>';}
  $('#overlay').insertAdjacentHTML('beforeend','<p class="save-note">같은 기기·브라우저에 방 입구를 자동 저장합니다.<br>전투 중 종료하면 방 입구부터 · 쓰러지면 현재 도전 종료</p>');
  $('#overlay').insertAdjacentHTML('beforeend',`<button id="ranking-link" class="discovery-link">명예의 전당 · 이 기기 랭킹</button><button id="discoveries" class="discovery-link">씨앗의 발견 기록 · ${profile.forms.length}/${Object.keys(FORMS).length}</button>${growthGuide(profile)?`<p class="form-note">다음 도전의 조합 목표 · 필요한 법칙을 선택지에서 안내합니다</p><div class="guide-options"><button class="primary" data-guide="" aria-pressed="${!guideTarget}">자유롭게 성장</button>${profile.forms.map(id=>`<button class="primary" data-guide="${id}" aria-pressed="${guideTarget===id}">${FORMS[id].name}</button>`).join('')}</div>`:''}`);
 $('#ranking-link').onclick=showRanking;
 $('#discoveries').onclick=()=>{mode='discoveries';$('#overlay').classList.remove('intro');$('#overlay').innerHTML=discoveryBook(profile);$('#close-discoveries').onclick=showIntro;};
 document.querySelectorAll('[data-guide]').forEach(b=>b.onclick=()=>{guideTarget=b.dataset.guide||null;document.querySelectorAll('[data-guide]').forEach(n=>n.setAttribute('aria-pressed',String((n.dataset.guide||null)===guideTarget)));});
 updateFormLabel();
}
function showRanking(){mode='ranking';$('#overlay').classList.remove('intro');$('#overlay').innerHTML=`<p>이 기기에서 가장 멀리 간 씨앗들</p><h2>명예의 전당</h2>${rankingTable(readRanking(runStorage))}<p class="form-note">랭킹은 이 기기·브라우저에 저장됩니다 · 쓰러진 뒤 이름을 남길 수 있어요</p><button class="primary" id="close-ranking">돌아가기</button>`;$('#close-ranking').onclick=showIntro;}
function showEnd(){touch.reset();$('#use-potion').hidden=true;
 const board=readRanking(runStorage),makesBoard=board.length<RANKING_SIZE||score>board.at(-1).score,name=lastName(runStorage).replace(/&/g,'&amp;').replace(/"/g,'&quot;');
 $('#overlay').hidden=false;$('#overlay').innerHTML=`<p>씨앗은 다시 뿌리를 내립니다</p><h2>잠든 씨앗</h2><div class="final-score"><small>최종 점수</small><strong>${formatScore(score)}</strong><span>여정 ${cycle+1} · ${inAustinRoom()?AUSTIN.name:(stage+1)+'번째 방'} · ${kills} 처치 · ${Math.floor(elapsed)}초</span></div>${score>0?`<form id="rank-form" class="rank-form"><input id="rank-name" maxlength="${NAME_MAX}" autocomplete="off" enterkeyhint="done" placeholder="이름 (최대 ${NAME_MAX}자)" value="${name}" aria-label="랭킹에 남길 이름"><button class="primary" type="submit">${makesBoard?'랭킹 등록':'기록 남기기'}</button></form>`:''}<div id="rank-board">${rankingTable(board)}</div><p class="form-note">발견 ${profile.forms.length}/${Object.keys(FORMS).length} · 랭킹은 이 기기·브라우저에 저장됩니다</p><button class="primary" id="restart">다시 시작</button>`;
 $('#restart').onclick=showIntro;
 const form=$('#rank-form');if(form)form.onsubmit=ev=>{ev.preventDefault();const r=submitScore(runStorage,{name:$('#rank-name').value,score,cycle,stage,kills,time:elapsed});if(!r.entry){$('#rank-name').placeholder='이름을 한 글자 이상 적어 주세요';$('#rank-name').focus();return;}form.outerHTML=`<p class="rank-result">${r.rank?`<b>${r.rank}위</b> ${r.entry.name} · 등록했어요!`:`순위 밖이에요 · ${RANKING_SIZE}위 안에 들면 이름이 남습니다`}${r.saved?'':' · 이 브라우저에 저장하지 못했습니다'}</p>`;$('#rank-board').innerHTML=rankingTable(r.ranking,r.entry);};
}
function restart(saved=null){const restore=saved?.version===1?saved:null;if(!restore)clearCheckpoint(runStorage);heldForms.clear();rerollUsed=restore?.rerollUsed===true;if(restore)guideTarget=profile.forms.includes(restore.guideTarget)?restore.guideTarget:null;promptedForms.clear();clearEscorts();vfx.clear();wells.length=0;orbitGroup.visible=false;touch.reset();for(let e of enemies)releaseEnemy(e);for(const f of fallen)releaseEnemy(f.e);fallen.length=0;for(let p of [...shots,...enemyShots,...effects])release(p.ob);enemies=[];shots=[];enemyShots=[];effects=[];levels.clear();syncLaws();choicesTaken=0;choiceKills=0;dashLock=0;pulls.length=0;orbitHits.clear();chosen.clear();mutated.clear();roomCleared=false;exitOpen=false;growth.reset();playerMotion.reset();player.visible=true;evolutionTime=0;$('#evolution').hidden=true;updateFormLabel();document.querySelectorAll('#rules>div').forEach(n=>n.classList.remove('active'));hp=100;playerSlow=0;dash=0;invuln=1;shootCD=0;keyboardDash=false;keys.clear();player.userData.dashTime=0;stage=0;kills=0;elapsed=0;player.position.set(0,0,5);mode='playing';paused=false;$('#overlay').hidden=true;$('#pause').textContent='Ⅱ';$('#toast').textContent='';$('#overlay').classList.remove('intro');lastMove.set(0,0,1);cycle=restore?.cycle||0;region=restore?.region||'garden';score=restore?.score||0;wardensDefeated=restore?.wardens||0;austinsDefeated=restore?.austins||0;inventory=normalizeInventory(restore?.inventory);austinRoom=false;potionCD=0;
 if(restore){stage=restore.stage;hp=restore.hp;kills=restore.kills;elapsed=restore.elapsed;for(const [id,v] of levelsFromSave(restore))levels.set(id,v);syncLaws();choicesTaken=restore.choicesTaken||0;choiceKills=restore.choiceKills||0;growth.select(effectiveLaws(),mutated);growth.update(0,0,false);updateFormLabel();}
 for(const [id,lv] of Object.entries(restore?.forms||{}))if(Object.hasOwn(FORMS,id))heldForms.set(id,lv);
 if(restore?.form&&!heldForms.size&&canFuse(levels,restore.form))fuse(levels,heldForms,restore.form);
 syncLaws();syncForms(true);growth.select(effectiveLaws(),mutated);
 if(restore?.mode==='crossroads')nextJourney();else{austinRoom=restore?.mode==='austin';wave();}}

function togglePause(){if(mode!=='playing'&&mode!=='evolving')return;paused=!paused;touch.reset();keys.clear();keyboardDash=false;if(paused)player.visible=true;$('#pause').textContent=paused?'▶':'Ⅱ';$('#toast').textContent='';if(paused)pauseBuild.show(levels,heldForms);else{pauseBuild.hide();$('#pause').focus({preventScroll:true});}}
window.addEventListener('keydown',e=>{if(e.target?.closest?.('input,textarea'))return;if(!e.repeat&&(e.code==='KeyQ'||e.code==='Digit1'))usePotion();if(['Space','KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();keys.add(e.code);if(e.code==='Space'&&!e.repeat&&mode==='playing'&&!paused)keyboardDash=true;if(!e.repeat&&(e.code==='KeyP'||e.code==='Escape'))togglePause();if(e.code==='KeyE'&&!e.repeat)useExit();if(e.code==='Enter'&&mode==='ready'){const saved=readCheckpoint(runStorage);if(saved)restart(saved);else startGame();}});window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{keys.clear();keyboardDash=false;if(!paused&&(mode==='playing'||mode==='evolving'))togglePause();});$('#pause').onclick=togglePause;
document.addEventListener('visibilitychange',()=>{if(document.hidden&&!paused&&(mode==='playing'||mode==='evolving'))togglePause();});
function update(dt,time){
if(mode==='evolving'){
  if(paused)return;
  evolutionTime=Math.min(evolutionDuration,evolutionTime+dt);
  const progress=evolutionTime/evolutionDuration;
  growth.update(dt,time,true,progress);$('#evolution').style.setProperty('--growth',progress);
  if(progress>=1){growth.update(0,time,false);$('#evolution').hidden=true;mode='playing';invuln=Math.max(invuln,.6);if(!offerForm()&&roomCleared)openExit();}
  return;
}
if(!paused)growth.update(dt,time,false);
if(mode!=='playing'||paused){player.userData.updateArt(camera);return;}const previousPlayer=player.position.clone();elapsed+=dt;potionCD=Math.max(0,potionCD-dt);playerSlow=Math.max(0,playerSlow-dt);dash=Math.max(0,dash-dt);invuln=Math.max(0,invuln-dt);shootCD-=dt;const move=new V();if(keys.has('KeyW')||keys.has('ArrowUp'))move.z-=1;if(keys.has('KeyS')||keys.has('ArrowDown'))move.z+=1;if(keys.has('KeyA')||keys.has('ArrowLeft'))move.x-=1;if(keys.has('KeyD')||keys.has('ArrowRight'))move.x+=1;move.add(new V(touch.axes.move.x,0,touch.axes.move.y)).clampLength(0,1);if(move.lengthSq()>.001)lastMove.copy(move).normalize();dashLock=Math.max(0,dashLock-dt);const touchDash=touch.consumeDash(),dashRequested=keyboardDash||keys.has('Space')||touchDash;keyboardDash=false;if(dashRequested&&dash===0&&dashLock<=0){dash=2.4;invuln=.32;player.userData.dashTime=.2;player.userData.dashDir=lastMove.clone();vfx.burst(player.position,'seed',14);vfx.dash(player.position,player.rotation.y);player.userData.dashFX=0;}if(player.userData.dashTime>0){player.userData.dashTime-=dt;player.position.addScaledVector(player.userData.dashDir,dt*17);player.userData.dashFX+=dt;if(player.userData.dashFX>=.045){player.userData.dashFX=0;vfx.dash(player.position,player.rotation.y);}}else player.position.addScaledVector(move,dt*5.8*(playerSlow>0?.75:1));collide(player.position);aimRing.visible=false;targetTimer-=dt;if(targetTimer<=0||!cachedTarget||cachedTarget.dead){cachedTarget=acquireTarget(player.position,enemies,obstacles,segmentHitsCover);targetTimer=.1;}const autoTarget=cachedTarget;if(autoTarget)aim.copy(autoTarget.g.position);let aimdir=aim.clone().sub(player.position).setY(0).normalize();player.rotation.y=Math.atan2(aimdir.x,aimdir.z);playerMotion.update(dt,player.position.x-previousPlayer.x,player.position.z-previousPlayer.z,{dashing:player.userData.dashTime>0});player.userData.updateArt(camera,player.position.x-previousPlayer.x,player.position.z-previousPlayer.z);player.visible=invuln<.5||Math.floor(time*20)%2===0;player.userData.halo.rotation.z=time*.4;
if(autoTarget&&shootCD<=0&&!roomCleared){shootCD=.22;growth.fire();vfx.muzzle(player.position.clone().addScaledVector(aimdir,.65),aimdir,[...chosen][0]||'seed');projectile(player.position.clone().addScaledVector(aimdir,.6),aimdir);}
for(const [id,combat] of formCombats){const cd=(formCooldowns.get(id)||0)-dt;if(autoTarget&&cd<=0&&!roomCleared&&!FORMS[id].passive)formCooldowns.set(id,combat.fire(player.position,aimdir,autoTarget.g.position));else formCooldowns.set(id,Math.max(-1,cd));}
if(!roomCleared)for(const combat of formCombats.values())combat.update(dt);updateEscorts(dt);
crowdTimer-=dt;if(crowdTimer<=0&&!roomCleared){spawnCrowd(2);crowdTimer=.85;}
if(!roomCleared){trapClock+=dt;for(const t of traps){tickTrap(t,trapClock,{player:player.position,enemies,hurtPlayer:a=>{if(invuln>0)return false;hitPlayer(a);return true;},hurtEnemy:(e,a)=>damageEnemy(e,a,false)});const info=trapPhase(trapClock+t.offset);t.visual.update(info.phase,info.progress);}}else for(const t of traps)t.visual.update('idle',0);
for(let i=pulls.length-1;i>=0;i--){const w=pulls[i];w.life-=dt;w.pulse-=dt;if(w.life<=0){pulls.splice(i,1);continue;}if(w.pulse<=0){vfx.pulse(w.pos,'gravity',1.2,.3);w.pulse=.25;}const d=w.pos.clone().sub(player.position).setY(0);if(d.length()<2.6&&player.userData.dashTime<=0){player.position.addScaledVector(d.normalize(),dt*2.6);collide(player.position);}}
for(let i=wells.length-1;i>=0;i--){const w=wells[i];w.life-=dt;w.pulse-=dt;if(w.life<=0){wells.splice(i,1);continue;}const radius=LS.gravityRadius||2.2;if(w.pulse<=0){vfx.pulse(w.pos,'gravity',radius*.45,.4);w.pulse=.3;}for(const e of enemies){const d=w.pos.clone().sub(e.g.position);if(!e.dead&&!isBoss(e)&&e.type!=='turret'&&d.length()<radius){e.g.position.addScaledVector(d,dt*1.5);collide(e.g.position,.4);}}}
orbitGroup.visible=chosen.has('orbit');orbitTime+=dt*3.1;
if(orbitGroup.visible){for(const [e,t] of orbitHits){if(e.dead||t<=dt)orbitHits.delete(e);else orbitHits.set(e,t-dt);}
 orbitGroup.children.forEach((o,i)=>{o.visible=i<LS.orbitPetals;if(!o.visible)return;const a=orbitTime+i*Math.PI*2/LS.orbitPetals;o.position.set(player.position.x+Math.cos(a)*LS.orbitRadius,.7,player.position.z+Math.sin(a)*LS.orbitRadius);o.rotation.y=-a;
  for(const e of enemies)if(!e.dead&&!orbitHits.has(e)&&Math.hypot(e.g.position.x-o.position.x,e.g.position.z-o.position.z)<(isBoss(e)?1.5:.95)){orbitHits.set(e,.28);const push=e.g.position.clone().sub(player.position).setY(0).normalize();applyLawHit(e,LS.orbitDamage);if(!e.dead&&!isBoss(e)&&e.type!=='turret'){e.g.position.addScaledVector(push,.4);collide(e.g.position,.4);}}
  for(const q of enemyShots)if(q.life>0&&!q.boss&&Math.hypot(q.ob.position.x-o.position.x,q.ob.position.z-o.position.z)<.6){q.life=0;q.struck=true;vfx.burst(q.ob.position,'orbit',8);}
 });}
for(let e of enemies){if(e.dead)continue;e.slow=Math.max(0,(e.slow||0)-dt);const edt=dt*difficulty(cycle,region).speed*(e.slow>0?(isBoss(e)?Math.max(.8,LS.frostFactor):LS.frostFactor):1);if(e.updateArt)e.updateArt(time);if(e.type==='austin'){tickAustin(e,dt*Math.min(1.15,difficulty(cycle,region).speed)*(e.slow>0?Math.max(.8,LS.frostFactor):1),{player:player.position,collide,bolt:austinBolt,hit:a=>{if(invuln>0)return false;hitPlayer(a);return true;},burst,pulse:(p,c,r,l)=>vfx.pulse(p,c,r,l)});clockFloor?.point(e.pendingRing>0?e.ringHour:e.hour);continue;}if(e.type==='turret'){tickTurret(e,edt,player.position,{fire:turretBolt,hurt:hitPlayer,strikeFx:p=>{vfx.arc(e.g.position.clone().setY(1.8),p);vfx.pulse(p,'chain',1.15,.3);vfx.burst(p,'chain',16);}});continue;}if(e.type==='shield'){tickShield(e,edt,player.position,{collide,hit:hitPlayer});continue;}if(e.type==='swarm'){e.hit=Math.max(0,e.hit-dt);e.timer-=dt;const d=player.position.clone().sub(e.g.position).setY(0),distance=d.length();d.normalize();e.g.rotation.y=Math.atan2(d.x,d.z);e.g.position.addScaledVector(d,edt*(1.6+stage*.14));{const ep=e.g.position;for(const other of enemies)if(other!==e&&!other.dead){const ax=ep.x-other.g.position.x,az=ep.z-other.g.position.z,length=Math.hypot(ax,az);if(length>0&&length<.65){const k=edt*(.65-length)*4/length;ep.x+=ax*k;ep.z+=az*k;}}}collide(e.g.position,.28);e.g.children[0].rotation.z=Math.sin(time*14+e.phase)*.1;if(distance<.65&&e.timer<=0){hitPlayer(10);e.timer=.85;}continue;}if(e.type==='warden'){tickWarden(e,edt,time,player.position,effectiveLaws(),{collide,bolt:bossBolt,hit:hitPlayer,burst,seal:(pos,r)=>{vfx.pulse(pos,'gravity',r,.5);vfx.burst(pos,'gravity',30,2);if(Math.hypot(player.position.x-pos.x,player.position.z-pos.z)<r){dashLock=SEAL.lock;hitPlayer(SEAL.damage);$('#toast').textContent='회피 봉인 · 걸어서 피하세요';}}});continue;}const previousEnemy=e.g.position.clone();let delta=player.position.clone().sub(e.g.position).setY(0),dist=delta.length();delta.normalize();e.tell.visible=e.state==='tell';e.tell.material.opacity=.12+Math.abs(Math.sin(time*9))*.17;e.timer-=edt;e.hit=Math.max(0,e.hit-edt);e.g.rotation.y=Math.atan2((e.state==='tell'||e.state==='commit'?e.dir:delta).x,(e.state==='tell'||e.state==='commit'?e.dir:delta).z);if(e.state==='stalk'){if(e.type==='hound'){e.g.position.addScaledVector(delta,edt*(1.65+stage*.15));if(e.timer<0&&dist<6){e.state='tell';e.timer=.58;e.dir.copy(delta);}}else{if(dist<4.8)e.g.position.addScaledVector(delta,-edt*.9);else if(dist>6.8)e.g.position.addScaledVector(delta,edt*.8);e.g.position.x+=delta.z*edt*.65*(e.phase<3?1:-1);e.g.position.z-=delta.x*edt*.65*(e.phase<3?1:-1);if(e.timer<0){e.state='tell';e.timer=.85;e.dir.copy(delta);}}}else if(e.state==='tell'){e.ring.material.opacity=.45+Math.sin(time*20)*.3;e.ring.scale.setScalar(1+(1-e.timer)*.3);if(e.timer<=0){e.state='commit';e.timer=e.type==='hound'?.48:.2;if(e.type==='caster'){const fan=stage>=2||cycle>0?2:1;for(let j=-fan;j<=fan;j++){let d=e.dir.clone().applyAxisAngle(new V(0,1,0),j*.17);let ob=enemyBolt(e.g.position,'caster');enemyShots.push({ob,dir:d,life:4});}}}}else if(e.state==='commit'){if(e.type==='hound'){e.g.position.addScaledVector(e.dir,edt*8);if(e.g.position.distanceTo(player.position)<1)hitPlayer(22);}if(e.timer<=0){e.state='recover';e.timer=1.25;e.ring.material.opacity=.16;e.ring.scale.setScalar(1);}}else if(e.timer<=0){e.state='stalk';e.timer=.55+rng()*.65;}collide(e.g.position,.65);e.motion.update(edt,e.g.position.x-previousEnemy.x,e.g.position.z-previousEnemy.z,{type:e.type,state:e.state,timer:e.timer,hit:e.hit});e.tell.visible=e.state==='tell';}
for(let p of shots){const previous=p.ob.position.clone();p.life-=dt;p.age+=dt;if(chosen.has('recall')&&!p.fragment&&p.age>.8){if(!p.returning){p.returning=true;p.hitSet.clear();p.hits=0;vfx.pulse(p.ob.position,'recall',.22,.2);}p.dir.copy(player.position).sub(p.ob.position).setY(0).normalize();if(Math.hypot(p.ob.position.x-player.position.x,p.ob.position.z-player.position.z)<.45){p.life=0;continue;}}p.ob.position.addScaledVector(p.dir,dt*(p.fragment?9.2:13.8));p.ob.rotation.y=Math.atan2(p.dir.x,p.dir.z);p.trailTime+=dt;if(p.trailTime>=.035){vfx.trail(p.trailPos,p.ob.position,p.tint,p.fragment);p.trailPos.copy(p.ob.position);p.trailTime=0;}let pos=p.ob.position;let wallHit=reflectArenaBoundary(previous,pos,p.dir,arena);for(let o of obstacles){if(Math.abs(pos.x-o.x)<o.w/2+.1&&Math.abs(pos.z-o.z)<o.d/2+.1){wallHit=true;let dx=Math.abs(pos.x-o.x)/(o.w/2),dz=Math.abs(pos.z-o.z)/(o.d/2);if(dx>dz)p.dir.x*=-1;else p.dir.z*=-1;break;}}if(wallHit){if(chosen.has('reflect')&&p.bounces<LS.reflectBounces){pos.addScaledVector(p.dir,.1);constrainToArena(pos,.05,arena);p.bounces++;vfx.reflect(pos,p.dir);p.trailPos.copy(pos);}else p.life=0;}if(p.life<=0)continue;for(let e of enemies){if(p.hits<LS.pierceHits&&!e.dead&&e!==p.ignoreEnemy&&!p.hitSet.has(e)&&Math.hypot(e.g.position.x-pos.x,e.g.position.z-pos.z)<(isBoss(e)?1.2:.9)){if(blocksShield(e,p.dir)){p.life=0;e.block=.18;vfx.pulse(e.g.position,'reflect',.65,.18);break;}p.hitSet.add(e);p.hits++;applyLawHit(e,(p.fragment?8:18)*damageScale(levels)*(p.returning?LS.recallReturn:1));if(p.hits>=LS.pierceHits){if(!(chosen.has('recall')&&!p.returning&&!p.fragment))p.life=0;}if(chosen.has('split')&&!p.fragment){vfx.split(pos,p.dir,Math.min(5,LS.splitCount));const spread=LS.splitCount>3?.85:.65;for(let angle of Array.from({length:LS.splitCount},(_,k)=>LS.splitCount===1?0:-spread+2*spread*k/(LS.splitCount-1)))projectile(pos.clone().addScaledVector(p.dir,.85),p.dir.clone().applyAxisAngle(new V(0,1,0),angle),true,e);}break;}}}
for(let p of enemyShots){p.life-=dt;p.age=(p.age||0)+dt;if(p.recall&&p.age>1.3){p.dir.copy(p.origin).sub(p.ob.position).setY(0).normalize();if(p.ob.position.distanceTo(p.origin)<.8){p.life=0;continue;}}const previous=p.ob.position.clone();p.ob.rotation.y+=dt*(p.boss?5:8);p.ob.position.addScaledVector(p.dir,dt*(p.speed??(5+stage*.45)));const outside=reflectArenaBoundary(previous,p.ob.position,p.dir,arena);
 if((!p.pierce&&segmentHitsCover(previous,p.ob.position,obstacles,.13))||outside){if(p.bounces>0){const next=p.ob.position;let flipX=false,flipZ=false;for(const o of obstacles)if(!p.pierce&&!outside&&segmentHitsCover(previous,next,[o],.13)){if(Math.abs(previous.x-o.x)>=o.w/2+.13)flipX=true;else flipZ=true;break;}if(flipX)p.dir.x*=-1;if(flipZ)p.dir.z*=-1;p.ob.position.copy(previous);p.bounces--;}else p.life=0;continue;}
 if(Math.hypot(p.ob.position.x-player.position.x,p.ob.position.z-player.position.z)<(p.boss?.6:.55)){const couldHit=invuln<=0;hitPlayer(p.damage??13);if(couldHit){p.struck=true;if(p.frost)playerSlow=1.2;}p.life=0;}}

for(let arr of [shots,enemyShots,effects])for(let i=arr.length-1;i>=0;i--){let p=arr[i];if(arr===effects){p.life-=dt;if(p.vel)p.ob.position.addScaledVector(p.vel,dt);p.ob.scale.setScalar(Math.max(.01,p.life/p.max));}if(p.life<=0){if(arr===enemyShots)endEnemyShot(p);release(p.ob);arr.splice(i,1);}}
updateEscorts(0);updateFallen(dt,time);const bossFalling=fallen.some(f=>f.hold);
enemies=enemies.filter(e=>!e.dead);if(!enemies.length&&crowdLeft===0&&mode==='playing'&&!roomCleared&&!bossFalling){for(let p of enemyShots)release(p.ob);enemyShots=[];roomCleared=true;score+=roomPoints(stage,cycle);clearForms();for(const p of shots)release(p.ob);shots=[];if(stage<4)openExit();else cardChoice();}
if(mode==='playing'&&!roomCleared&&!bossFalling&&choiceKills>=killsForChoice(choicesTaken)){choiceKills-=killsForChoice(choicesTaken);choicesTaken++;cardChoice(true);}}
let last=performance.now(),frames=[],frameCounter=0;function animate(now){requestAnimationFrame(animate);let raw=(now-last)/1000;last=now;frames.push(raw*1000);if(frames.length>180)frames.shift();const dt=advanceFrame(raw,now*.001,(step,time)=>update(step,time));if(!paused)vfx.update(dt);presentFrame(now*.001);for(const m of motes){m.y+=Math.sin(now*.001+m.seed)*dt*.08;moteMatrix.makeTranslation(m.x,m.y,m.z);moteMeshes[m.kind].setMatrixAt(m.index,moteMatrix);}for(const m of moteMeshes)m.instanceMatrix.needsUpdate=true;look.lerp(new V(player.position.x*.14,0,player.position.z*.06+.4),1-Math.exp(-3.713*dt));camera.position.set(look.x,22,15.5+look.z);cameraShake=Math.max(0,cameraShake-dt);if(cameraShake>0)camera.position.x+=(rng()-.5)*cameraShake;camera.lookAt(look);renderer.info.autoReset=false;renderer.info.reset();composer.render();frameCounter++;if(inspection&&frameCounter%30===0)inspection.textContent=JSON.stringify(window.seedDebug.getState());}
function presentFrame(time){
 touch.update(mode==='playing'&&!paused,Math.max(dash,dashLock));setHidden($('#save-exit'),!(paused&&(mode==='playing'||mode==='evolving')));
 updateGauges();
 setText($('#score-hud b'),formatScore(score));setHidden($('#score-hud'),!['playing','cards','forms','evolving'].includes(mode));
 setHidden($('#use-potion'),!(inventory.potion>0&&mode==='playing'&&!paused));setText($('#use-potion b'),'×'+inventory.potion);
 if(mode!=='playing'||paused)return;
 const boss=enemies.find(e=>(e.type==='warden'&&!e.elite)||e.type==='austin');if(boss){setWidth($('#boss-hud i'),(boss.hp/boss.maxHp*100).toFixed(1)+'%');setText($('#boss-hud small'),boss.type==='austin'?austinHint(boss):pendingEscorts.length?'호위 등장 예고 · 주황 원에서 떨어지세요':boss.variant==='seal'?'보라 원이 닫힐 때 안에 있으면 회피가 봉인됩니다':boss.variant==='hunter'?'돌진 뒤 곧바로 한 번 더 돌진합니다':boss.learned.length?'습득: '+boss.learned.map(id=>LAW_NAMES[id]).join(' · '):'생명 67% · 34%에서 당신의 법칙을 배웁니다');}else setHidden($('#boss-hud'),true);const nearExit=canUseExit({open:exitOpen,mode,paused,x:player.position.x,z:player.position.z});setHidden($('#exit-room'),!nearExit);setText($('#exit-room'),stage===4?(austinAhead()?'진짜 보스에게 · E':'다음 여정으로 · E'):touch.enabled?'다음 방으로':'다음 방으로 · E');gateHalo.rotation.y=time*.6;setWidth($('#hpbar'),hp+'%');setText($('#hptext'),`${hp} / 100`);setWidth($('#dashbar'),((1-dash/2.4)*100).toFixed(1)+'%');setText($('#dashtext'),dashLock>0?'봉인 '+dashLock.toFixed(1)+'s':dash>0?dash.toFixed(1)+'s':'준비');
}
function updateGauges(){
 const need=killsForChoice(choicesTaken),have=Math.min(need,choiceKills);
 setText($('#growth-progress span'),`다음 법칙까지 ${need-have} 처치 · 슬롯 ${slotsUsed(levels,heldForms)}/${SLOT_CAP}`);setWidth($('#growth-progress i'),(have/need*100).toFixed(1)+'%');
 const show=mode==='playing'&&!paused,overhead=$('#overhead');setHidden(overhead,!show);if(!show)return;
 // The canvas rectangle is measured on resize, never per frame, so this does not force a layout.
 const p=player.position.clone().setY(1.95).project(camera),r=canvasRect;
 const transform=`translate(${Math.round(r.left+(p.x+1)*r.width/2)}px,${Math.round(r.top+(1-p.y)*r.height/2)}px) translate(-50%,-100%)`;
 if(overhead.__transform!==transform){overhead.style.transform=transform;overhead.__transform=transform;}
 setWidth($('#overhead .oh-hp i'),hp+'%');const low=hp<=35,hpBox=$('#overhead .oh-hp');if(hpBox.__low!==low){hpBox.classList.toggle('low',low);hpBox.__low=low;}
 setHidden($('#overhead .oh-lock'),dashLock<=0);
 setWidth($('#overhead .oh-dash i'),(dashLock>0?0:(1-dash/2.4)*100).toFixed(1)+'%');const ready=dash<=0&&dashLock<=0,dashBox=$('#overhead .oh-dash');if(dashBox.__ready!==ready){dashBox.classList.toggle('ready',ready);dashBox.__ready=ready;}
}
function resize(){const w=document.documentElement.clientWidth,viewHeight=document.documentElement.clientHeight,h=touch.enabled&&viewHeight>w?Math.max(250,viewHeight-160):viewHeight;renderer.setSize(w,h,false);renderer.domElement.style.width='100%';renderer.domElement.style.height=h+'px';camera.aspect=w/h;camera.zoom=Math.min(1.18,camera.aspect/(touch.enabled&&h>w?1.25:.95));camera.updateProjectionMatrix();composer.setSize(w,h);if(mobileDevice){const ratio=renderer.getPixelRatio();bloomPass.setSize(Math.max(1,Math.round(w*ratio/2)),Math.max(1,Math.round(h*ratio/2)));}canvasRect=renderer.domElement.getBoundingClientRect();if(touch.enabled&&mode==='playing'&&!paused)togglePause();}window.addEventListener('resize',resize);resize();showIntro();requestAnimationFrame(animate);
// Read-only live diagnostics for performance and real-input validation.
if(import.meta.env.DEV||localInspection)window.seedDebug={getState:()=>({score,wardensDefeated,austinsDefeated,austinRoom,inventory:{...inventory},fallen:fallen.length,levels:Object.fromEntries(levels),choicesTaken,choiceKills,nextChoice:killsForChoice(choicesTaken),dashLock,forms:Object.fromEntries(heldForms),traps:traps.length,turrets:enemies.filter(e=>e.type==='turret').map(e=>e.laws),pulls:pulls.length,formCombat:Object.fromEntries([...formCombats].map(([id,c])=>[id,c.state()])),discoveries:profile,guideTarget,rerollUsed,arena,escortWaves,pendingEscorts:pendingEscorts.length,cycle,region,saveAvailable:Boolean(readCheckpoint(runStorage)),autoAttack,crowdLeft,midReward,roomKills:kills-roomStartKills,vfx:vfx.state(),mode,paused,hp,stage:stage+1,room:ROOMS[stage].name,exit:{open:exitOpen,x:EXIT.x,z:EXIT.z,near:canUseExit({open:exitOpen,mode,paused,x:player.position.x,z:player.position.z})},mutated:[...mutated],kills,playerVisible:player.visible,touch:touch.state(),motion:{...player.userData.motion},evolution:growth.state(),artFrame:player.userData.artFrame,rules:[...chosen],dash,invulnerable:invuln>0,player:{x:player.position.x,z:player.position.z},enemies:enemies.map(e=>({type:e.type,escort:Boolean(e.escort),elite:Boolean(e.elite),inScene:Boolean(e.g.parent)&&e.g.visible,phase:e.phase,hour:e.hour,bellWarn:e.bellWarn,alarms:e.alarms?.length,hp:e.hp,maxHp:e.maxHp,learned:e.learned,attacks:e.attacks,pattern:e.pattern,state:e.state,motion:{...e.g.userData.motion},facing:e.g.rotation.y,x:e.g.position.x,z:e.g.position.z})),projectiles:shots.length,enemyProjectiles:enemyShots.length,bossShots:enemyShots.filter(q=>q.boss&&q.life>0).map(q=>({x:q.ob.position.x,z:q.ob.position.z,pierce:q.pierce})),elapsed,fps:frames.length/(frames.reduce((a,b)=>a+b,0)/1000),frameMsP95:[...frames].sort((a,b)=>a-b)[Math.floor(frames.length*.95)],drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,coverBounds:obstacles.map(o=>({...o}))}),// Local QA only (localhost + ?inspect or the dev server): shorten long boss fights and hand out a potion to test the flows.
qa:{hurtBoss:fraction=>{const b=enemies.find(e=>isBoss(e)&&!e.elite&&!e.dead);if(b)damageEnemy(b,b.maxHp*fraction,false);return b?b.hp:null;},givePotion:()=>addItem(inventory,'potion',1),setHp:v=>{hp=Math.max(1,Math.min(100,v));}},census:()=>{const out={meshes:0,shadowCasters:0,sprites:0,instanced:0,points:0,lines:0,lights:0,materials:new Set(),byParent:{}};scene.traverseVisible(o=>{if(o.isLight)out.lights++;if(o.isSprite)out.sprites++;else if(o.isInstancedMesh)out.instanced++;else if(o.isMesh){out.meshes++;if(o.castShadow)out.shadowCasters++;}else if(o.isLineSegments)out.lines++;if(o.material)out.materials.add(o.material);if(o.isMesh||o.isSprite){const key=(o.parent?.name||o.parent?.type||'?')+'/'+(o.name||o.geometry?.type||o.type);out.byParent[key]=(out.byParent[key]||0)+1;}});out.materials=out.materials.size;out.byParent=Object.fromEntries(Object.entries(out.byParent).sort((a,b)=>b[1]-a[1]).slice(0,25));out.programs=renderer.info.programs?.length;return out;},worldToScreen:(x,z)=>{let p=new V(x,.5,z).project(camera);const r=renderer.domElement.getBoundingClientRect();return {x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2};}};

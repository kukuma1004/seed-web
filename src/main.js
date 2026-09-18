import {emptyRelics,normalizeRelics,relicOffers,relicLawStats,relicFormScale,relicEffect,equipRelic,RELICS} from './relics.js';
import {showRelicChoice} from './relic-ui.js';
import {relicArt} from './relic-art.js';
import {itemArt} from './item-art.js';
import {createPauseBuild} from './pause-build.js';
import {advanceFrame,paceTrusted} from './frame-time.js';
import {formArt} from './form-art.js';
import {buildCoverArt} from './world-art.js';
// FORMS here means every live evolution the seed can hold: authored first fusions, solo evolutions and awakenings.
import {ALL_FORMS as FORMS,FORMS as FIRST_FORMS,SOLO_FORMS,TWIN_FORMS,eligibleForms,formUpgradeLine,soloReady,attackPartsOf,isTwinForm} from './forms.js';
import {createActiveGauge,chargeActive,killCharge,bossCharge,startActive,tickActive,cancelActive,activeState,ACTIVE,SIGNATURES} from './actives.js';
import {ACTIVE_BUTTON_HTML,ACTIVE_EFFECT_HTML,renderActiveButton,announceActive,announceFinale} from './active-ui.js';
import {createActiveVFX} from './active-vfx.js';
import {QUALITY_KEY,QUALITY_LEVELS,QUALITY_NAMES,initialQuality,createQualityGovernor,renderPixelRatio} from './quality.js';
import {DASH_EVOLUTIONS,createDashState,tickDash,spendDash,dashMeter,dashEvolutionCards} from './dash-evolution.js';
// Forms that fly as a projectile can be stopped by a shield's face; area and orbit forms go around it.
// Movement and seed-shot tempo (2026-09-15: +5% each; were 5.8, 13.8 and 9.2). Dash, enemy shots and evolution bolts are unchanged.
const PLAYER_SPEED=5.8*1.05,SHOT_SPEED=13.8*1.05,FRAGMENT_SPEED=9.2*1.05;
const DIRECT_FORMS=new Set(['returnblade','prism','thunderlance','seedstorm','mirrorguard','gravitymirror','blastlance','mirrormaze','fullbloom','glassspear','rewind']);
import {readDiscoveries,recordDiscovery,growthGuide,rerollUnlocked} from './discoveries.js';
import {createFormCombat} from './form-combat.js';
import {formCard,soloCard,awakenCard,secondFusionCard,discoveryBook,formLawHint} from './form-ui.js';
import {buildArenaBoundary,arenaFor,constrainToArena,reflectArenaBoundary,safeArenaSpawn} from './arena.js';
import {escortWave,escortTypes} from './boss-escorts.js';
import './forms.css';
import './combo-art.css';
import './dash-evolution.css';
import {ACTOR_ART_GEOMETRIES,configureActorArt,configureOcclusion,attachActorArt} from './actor-art.js';
import {createSpatialIndex} from './spatial-index.js';
import {createShield,tickShield,blocksShield} from './shield.js';
import {readCheckpoint,writeCheckpoint,clearCheckpoint,roomExitCheckpoint,difficulty,replaceLaw,REGION_NAMES,restoredScore,restoredWardens,restoredAustins} from './run-save.js';
import {createSeedBody} from './seed-body.js';
import {createSeedTitle,AUSTIN_TITLE,AUSTIN_TITLE_PERK} from './seed-title.js';
import {codexNews} from './titles.js';
import {ACT2_REGION,ACT2_NAME,isAct2,actOf,act2Unlocked,act2Available,playableRegion,actStorage} from './act2.js';
import {ACT2_ART,ACT2_GEOMETRIES,isAct2Minion,createAct2Minion,tickAct2Minion,catcherReturn} from './act2-enemies.js';
import {ACT2_WARDENS,ACT2_WARDEN_ART,act2WardenEncounter,createAct2Warden,tickAct2Warden,act2WardenHint} from './act2-wardens.js';
import {ALWAYS_BEGINNER,ALWAYS_BEGINNER_ART,ALWAYS_PHASES,createAlwaysBeginner,tickAlwaysBeginner,damageAlwaysBeginner,alwaysBeginnerHint,alwaysBeginnerPatternName} from './always-beginner.js';
import {BASE_SLIDE,createStadium} from './stadium.js';
import {createContactShadows} from './contact-shadows.js';
import {createProjectileGeometries,projectileGeometry} from './projectile-art.js';
import {activeCombatEvolutions,orbitCore,isOrbitEvolution,canAcquireEvolution} from './evolution-family.js';
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
import {ROOMS,EXIT,LAW_NAMES,rewardOptions,canUseExit,roomFor} from './journey.js';
import {createWarden,tickWarden,wardenVariantFor,wardenEncounter,DUO_WARDEN,WARDEN_VARIANTS,SEAL} from './warden.js';
import {AUSTIN,PHASES,AUSTIN_ARENA,AUSTIN_ART,createAustin,tickAustin,damageAustin,austinHint,austinPatternName,createClockFloor} from './austin.js';
import {killPoints,roomPoints,submitScore,readRanking,lastName,saveName,cleanName,escapeHtml,rankingTable,formatScore,NAME_MAX} from './score.js';
import {createOnlineRanking,SEASON,ARCHIVE_SEASON} from './online-ranking.js';
import {readGarden,writeGarden,normalizeGarden,gardenEffects,harvestFromRun,addHarvest,growPlants,harvestLine,activeSlots,centerInfo,SEEDS,grantAustinMastery,masteryLine} from './garden.js';
import {renderGardenPanel,renderGardenPeek} from './garden-ui.js';
import {createGardenScene} from './garden-scene.js';
import {PATCH_NOTES,hasUnseenNotes,markNotesSeen} from './patch-notes.js';
import {MAINTENANCE} from './maintenance.js';
const maintenanceOn=MAINTENANCE.on&&!import.meta.env.DEV;
import {isBadName} from './name-filter.js';
import {MUTATIONS,RUNE,TUNE,MAX_SHOTS,parseMutationChoice,withMutationOffer,applyMutation,mutationOf,hasMutation,
 mutationsToSave,mutationsFromSave,mutationLabel,reflectBounceSpeed,chainRange,chainFalloff,fragmentSpeedScale,fragmentExtraLife} from './mutations.js';
import {buildRecord,parseBuild,bossText,buildText} from './ranking-build.js';
import {ITEMS,ITEM_ORDER,emptyInventory,startingInventory,normalizeInventory,addItem,useItem,tryRevive,austinDrops,turretPotionDrop,nextHeld,heldItems,usable} from './inventory.js';
import {SHOP_STOCK_MAX,SHOP_PRICES,TONIC_CARRY_MAX,STASH_ORDER,readShop,earnCoins,buyTonics,setCarry,claimCarry,grantGift} from './shop.js';
import './shop.css';
import './ranking.css';
import {SLOT_CAP,killsForChoice,levelOf,damageScale,lawStats,offerChoices,chooseLaw,levelsFromSave,levelsToSave,upgradeLine,offeredForm,offeredFusion,slotsUsed,fusionLevel,canFuse,fuse,secondFusionOptions,secondFusionLevel,fuseSecond,evolveSolo,effectiveLevels,buildLevel,awakenOptions,awakenLevel,awaken} from './progression.js';
import {createTurret,tickTurret,turretSpots,copiedLaws,TURRET} from './turret.js';
import {trapsFor,tickTrap,createTrapVisuals,trapPhase} from './traps.js';
import './feedback.css';
import './mobile.css';
import './choice.css';
import './account.css';
import './developer-lab.css';
import {setupMobileApp} from './mobile-app.js';
import {createAccountAuth} from './account-auth.js';
import {createCloudSync} from './cloud-sync.js';
import {readAccountProfile,writeAccountProfile,accountBadgeLine,BADGES} from './account-profile.js';
import {claimFirstGardenPioneer,legacyRankingUid} from './legacy-honor.js';
import {publicWebBetaLocked,BETA_NOTICE} from './beta-access.js';
import {BETA_TEST_URL,betaApplicationMessage,submitBetaApplication} from './beta-signup.js';
import {DEFAULT_SEASON_STATUS,gameplayIsPaused,isSeasonAdmin,isBetaTester,loadSeasonStatus} from './season-access.js';
import {bindPointerAction,createTouchControls} from './touch.js';
import {createGameAudio,ultimateAudioEvent} from './audio.js';
import {RUN_BONUSES,emptyRunBonuses,normalizeRunBonuses,runBonusOffers,rareRunBonusOffers,applyRunBonus,runBonusSummary,moveScale as runMoveScale,cadenceScale as runCadenceScale,cadenceInterval as runCadenceInterval,powerScale as runPowerScale} from './run-bonuses.js';
import {rankingTermsAccepted,setRankingTermsAccepted,blockRankingUser,visibleRanking,rankingReportMailto} from './ranking-safety.js';
import {responsiveView} from './responsive-view.js';
import {createCameraFeel} from './camera-feel.js';
const revealApp=()=>document.documentElement.classList.add('seed-loaded');
const mobileDevice=matchMedia('(any-pointer: coarse)').matches||navigator.maxTouchPoints>0||(typeof location!=='undefined'&&['localhost','127.0.0.1'].includes(location.hostname)&&new URLSearchParams(location.search).has('touchPreview'));
let rawStorage;try{rawStorage=window.localStorage;}catch{rawStorage=null;}
const account=createAccountAuth({storage:rawStorage});
const cloud=createCloudSync({storage:rawStorage,account});
const runStorage=cloud.storage;
import {createMotion} from './motion.js';
import {createVFX,FX_COLORS} from './vfx.js';
import {THEMES,readTheme,writeTheme,nextTheme,themeColor} from './themes.js';
import {LAWS,synergyHint,hitBudget,acquireTarget} from './laws.js';
import {CROWD_CAP,crowdTotal,crowdInterval,safeSpawn} from './crowd.js';
import {segmentHitsCover} from './collision.js';
import {disposeObject} from './resources.js';
import {createSeedEvolution,LAW_PRESENTATION} from './evolution.js';
// Elements are looked up once and reused; a replaced element is found again automatically.
const domCache=new Map();const $=s=>{let e=domCache.get(s);if(!e||!e.isConnected){e=document.querySelector(s);if(e)domCache.set(s,e);else domCache.delete(s);}return e;}, V=THREE.Vector3;
// Frame-rate HUD writes compare first, so an unchanged number never dirties layout.
const setText=(e,v)=>{if(e&&e.textContent!==v)e.textContent=v;},setWidth=(e,v)=>{if(e&&e.__width!==v){e.style.width=v;e.__width=v;}},setHidden=(e,v)=>{if(e&&e.hidden!==v)e.hidden=v;};
// Damage scaling can leave fractional health internally. Keep that precision for
// balance, but show a whole number so the HUD stays calm and readable.
const displayHp=value=>Math.max(0,Math.ceil(Number(value)-1e-6));
let canvasRect={left:0,top:0,width:1,height:1};const overheadWorld=new THREE.Vector3();
// Phones held sideways show the fight closer and follow the seed more (2026-09-15: the arena looked tiny on a phone).
// World coordinates and hit sizes are unchanged; only the camera frames a smaller area.
let viewLayout=responsiveView(document.documentElement.clientWidth,document.documentElement.clientHeight,mobileDevice);
const localInspection=['127.0.0.1','localhost'].includes(location.hostname)&&new URLSearchParams(location.search).has('inspect');
const localAdminLab=localInspection&&new URLSearchParams(location.search).has('adminLab');
let seasonStatus=DEFAULT_SEASON_STATUS,adminMode=false,betaTesterMode=false,developerRun=false,developerForm='';
const gameplayPaused=()=>gameplayIsPaused({status:seasonStatus,native:account.native,admin:adminMode||betaTesterMode,dev:import.meta.env.DEV});
const refreshAccessMode=async()=>{const user=account.user();adminMode=localAdminLab||await isSeasonAdmin(user);betaTesterMode=!adminMode&&await isBetaTester(user);return adminMode||betaTesterMode;};
const WEB_ACCESS_POLL_MS=15_000;
let webAccessCheck=null;
const inspection=localInspection?document.createElement('pre'):null;if(inspection){inspection.id='seed-inspection';inspection.hidden=true;document.body.append(inspection);}
let qualityLevel=initialQuality({search:location.search,stored:(()=>{try{return runStorage.getItem(QUALITY_KEY);}catch{return null;}})(),mobile:mobileDevice});
// A 512px directional atlas is still sharper than its in-game footprint and
// cuts decoded actor texture memory to one quarter on phones and tablets.
configureActorArt({reducedTextures:mobileDevice});
let combatTheme=readTheme(runStorage);
// Mobile pixels are already softened by DPR and post-processing. Context MSAA cost more fill-rate than it returns there.
const renderer=new THREE.WebGLRenderer({canvas:$('#game'),antialias:qualityLevel>1&&!mobileDevice,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,QUALITY_LEVELS[qualityLevel].pixelRatio));renderer.shadowMap.enabled=true;renderer.shadowMap.type=qualityLevel<2?THREE.PCFShadowMap:THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
// Shadows come from the fixed sun onto a mostly static room; actors use contact shadows. The shadow map is redrawn a few times a
// second (and at once on room or quality changes) instead of every frame, which removes a whole scene pass on phones (2026-09-15).
const SHADOW_REFRESH=.25,OCCLUSION_REACH=3;let shadowClock=SHADOW_REFRESH;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
// Phones under memory pressure can drop the WebGL context: the picture freezes or goes black, which players see as the game crashing.
// Stop the run, remember one step lower quality, and reload once the browser gives the context back (or on a tap).
// The run continues from the saved room entrance, so only the current room is replayed.
renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();if(mode==='playing'&&!paused)paused=true;
 try{runStorage.setItem(QUALITY_KEY,String(Math.max(0,qualityLevel-1)));}catch{}
 const box=document.createElement('div');box.id='context-lost';box.innerHTML='<div><strong>그래픽 메모리가 부족해서 화면이 멈췄어요</strong><span>화질을 한 단계 낮춰서 다시 불러와요 · 방 입구부터 이어서 할 수 있어요</span><button class="primary">다시 불러오기</button></div>';
 box.querySelector('button').onclick=()=>location.reload();document.body.append(box);},false);
renderer.domElement.addEventListener('webglcontextrestored',()=>location.reload(),false);
const scene=new THREE.Scene();scene.background=new THREE.Color('#2a4550');scene.fog=new THREE.FogExp2('#2d4a55',.011);
const vfx=createVFX(scene,{mobile:mobileDevice,theme:combatTheme,quality:qualityLevel});
let playerTrailInterval=mobileDevice?.075:.045;
const activeVfx=createActiveVFX(scene,{mobile:mobileDevice,theme:combatTheme,quality:qualityLevel});
const camera=new THREE.PerspectiveCamera(39,1,.1,100);const look=new V(0,0,0);camera.position.set(16,22,22);camera.lookAt(look);
const composer=new EffectComposer(renderer);const renderPass=new RenderPass(scene,camera);composer.addPass(renderPass);const bloomPass=new UnrealBloomPass(new THREE.Vector2(1,1),.42,.5,1.1);composer.addPass(bloomPass);composer.addPass(new OutputPass());
const pmrem=new THREE.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(new RoomEnvironment(),.04).texture;scene.environmentIntensity=.35;
scene.add(new THREE.HemisphereLight(0xcfe3ea,0x44564a,1.5));let sun=new THREE.DirectionalLight(0xffedcf,2.2);sun.position.set(-9,17,6);sun.castShadow=true;sun.shadow.mapSize.set(QUALITY_LEVELS[qualityLevel].shadowSize,QUALITY_LEVELS[qualityLevel].shadowSize);Object.assign(sun.shadow.camera,{left:-16,right:16,top:16,bottom:-16,far:50});sun.shadow.normalBias=.035;scene.add(sun);
const texloader=new THREE.TextureLoader(), stone=texloader.load(import.meta.env.BASE_URL+'assets/garden-stone-v4.png'),normal=mobileDevice?null:texloader.load(import.meta.env.BASE_URL+'assets/garden-stone-normal.png');stone.colorSpace=THREE.SRGBColorSpace;for(let t of [stone,normal].filter(Boolean)){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(.34,.34);t.anisotropy=mobileDevice?2:8;}
const mats={stone:new THREE.MeshStandardMaterial({color:0xb8c9c3,map:stone,roughness:.88,metalness:.02}),dark:new THREE.MeshStandardMaterial({color:0x667c75,roughness:.9,map:stone}),root:new THREE.MeshStandardMaterial({color:0x3b3528,roughness:.9}),leaf:new THREE.MeshStandardMaterial({color:0x3e6242,roughness:.72,side:THREE.DoubleSide}),jade:new THREE.MeshStandardMaterial({color:0x91f2c0,emissive:0x38ffb0,emissiveIntensity:2.8,roughness:.2}),amber:new THREE.MeshStandardMaterial({color:0xffdb83,emissive:0xff970f,emissiveIntensity:3}),orbitPetal:new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,emissive:0x4ccf83,emissiveIntensity:.55,roughness:.38,metalness:.08}),armor:new THREE.MeshStandardMaterial({color:0xd7cbae,map:stone,roughness:.57}),enemy:new THREE.MeshStandardMaterial({color:0xa48969,map:stone,roughness:.7}),black:new THREE.MeshStandardMaterial({color:0x536160,map:stone,roughness:.5}),cover:new THREE.MeshStandardMaterial({color:0xa1a28c,map:stone,roughness:.85}),enemyBolt:new THREE.MeshStandardMaterial({color:0x3a0710,emissive:0xff2a3c,emissiveIntensity:2.4,roughness:.35}),enemyHalo:new THREE.MeshBasicMaterial({color:0xff4050,transparent:true,opacity:.85,side:THREE.DoubleSide,forceSinglePass:true,depthWrite:false,toneMapped:false}),bossBolt:new THREE.MeshStandardMaterial({color:0x22021a,emissive:0xd21cff,emissiveIntensity:2.8,roughness:.3}),bossHalo:new THREE.MeshBasicMaterial({color:0xff3cc8,transparent:true,opacity:.9,side:THREE.DoubleSide,forceSinglePass:true,depthWrite:false,toneMapped:false}),frostBolt:new THREE.MeshStandardMaterial({color:0x0a2436,emissive:0x5fd8ff,emissiveIntensity:2.4,roughness:.3})};
for(const id of ['seed',...Object.keys(LAWS)])mats['shot-'+id]=new THREE.MeshBasicMaterial({color:new THREE.Color(FX_COLORS[id]).multiplyScalar(2),vertexColors:true,toneMapped:false});
// The real boss's bell rings fire dozens of bolts at once, so they share one geometry and material each.
mats.austinBolt=new THREE.MeshBasicMaterial({color:new THREE.Color(0xffc94a).multiplyScalar(2),toneMapped:false});mats.austinHalo=new THREE.MeshBasicMaterial({color:0xffe7a0,transparent:true,opacity:.75,side:THREE.DoubleSide,forceSinglePass:true,depthWrite:false,toneMapped:false});
const austinGeo={core:new THREE.OctahedronGeometry(.27,0),halo:new THREE.RingGeometry(.33,.44,12)};
const projectileGeos=createProjectileGeometries();
function tintGeometry(geometry,color){const g=geometry.index?geometry.toNonIndexed():geometry,c=new THREE.Color(color),values=new Float32Array(g.getAttribute('position').count*3);for(let i=0;i<values.length;i+=3){values[i]=c.r;values[i+1]=c.g;values[i+2]=c.b;}g.setAttribute('color',new THREE.BufferAttribute(values,3));return g;}
// One merged, shared baseball makes every act-2 throw readable without multiplying draw calls on phones.
const stadiumBallParts=[
 tintGeometry(new THREE.IcosahedronGeometry(.25,1),0xfff3d8),
 tintGeometry(new THREE.TorusGeometry(.255,.018,3,14,Math.PI*1.55).rotateX(Math.PI/2).rotateY(.62),0xc53b37),
 tintGeometry(new THREE.TorusGeometry(.255,.018,3,14,Math.PI*1.55).rotateX(Math.PI/2).rotateY(-.62).rotateZ(Math.PI),0xc53b37)
];
const stadiumBallGeo=mergeGeometries(stadiumBallParts,false);stadiumBallGeo.name='act2-baseball-projectile';for(const g of stadiumBallParts)g.dispose();
mats.stadiumBall=new THREE.MeshBasicMaterial({vertexColors:true,toneMapped:false});
const baseOrbitParts=[tintGeometry(new THREE.ConeGeometry(.13,.62,5).rotateZ(-Math.PI/2).translate(.1,0,0),0xeaf8d2),tintGeometry(new THREE.OctahedronGeometry(.14,0).translate(-.23,0,0),0xd4a858)];
const baseOrbitGeo=mergeGeometries(baseOrbitParts,false);baseOrbitGeo.name='seed-law-orbit-petal';for(const g of baseOrbitParts)g.dispose();
const sharedDynamicMaterials=new Set(Object.values(mats));
// Enemy bolts, tells and rings reuse these instead of creating and uploading new buffers for every shot and spawn.
const enemyGeos={boltCore:new THREE.IcosahedronGeometry(.19,0),bossCore:new THREE.OctahedronGeometry(.3,0),boltHalo:new THREE.RingGeometry(.24,.3,16),bossHalo:new THREE.RingGeometry(.36,.46,6),bossSpike:new THREE.ConeGeometry(.07,.34,4),tellHound:new THREE.PlaneGeometry(.9,4.8),tellCaster:new THREE.RingGeometry(1.1,1.3,48)},ringGeos=new Map();
const sharedGeometries=new Set([...Object.values(ACT2_GEOMETRIES),...Object.values(enemyGeos),baseOrbitGeo,stadiumBallGeo,...Object.values(austinGeo),...Object.values(projectileGeos),...Object.values(ACTOR_ART_GEOMETRIES)]);
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
// The old garden built more than three thousand leaf Mesh objects, cloned every
// geometry during the static merge, then discarded them. On phones that caused
// a long cold-start pause and a large garbage-collection spike. Record transforms
// directly and upload six fixed instanced batches instead.
const leafMatrices=leafMats.map(()=>[]),petalMatrices=[],flowerCoreMatrices=[],staticInstanceDummy=new THREE.Object3D();
function staticTransform(list,x,y,z,rx,ry,rz,sx,sy=sx,sz=sx){staticInstanceDummy.position.set(x,y,z);staticInstanceDummy.rotation.set(rx,ry,rz);staticInstanceDummy.scale.set(sx,sy,sz);staticInstanceDummy.updateMatrix();list.push(staticInstanceDummy.matrix.clone());}
function leafInstance(kind,x,y,z,rx,ry,rz,sx,sy=sx,sz=sx){staticTransform(leafMatrices[kind%leafMatrices.length],x,y,z,rx,ry,rz,sx,sy,sz);}
function foliage(x,z,scale=1){for(let i=0;i<9;i++){const a=i*2.4+rng()*.4,rx=-1.05-rng()*.45,rz=(rng()-.5)*.8,size=(.45+rng()*.6)*scale;leafInstance(i,x,.16+.02*scale,z,rx,a,rz,size);if(i===0&&rng()>.55){for(let j=0;j<5;j++){const angle=j*6.28/5;staticTransform(petalMatrices,x+Math.cos(angle)*.065*scale,.16+.3*scale,z+Math.sin(angle)*.065*scale,0,0,0,.039*scale,.01625*scale,.065*scale);}staticTransform(flowerCoreMatrices,x,.16+.3*scale,z,0,0,0,.025*scale);}}}
for(let i=0;i<660;i++){let x=(rng()-.5)*23,z=(rng()-.5)*19;if(Math.abs(x)>9||Math.abs(z)>7||rng()<.07)foliage(x,z,.6+rng()*.75);}
function wall(x,z,axis,count,height=1){for(let row=0;row<height;row++)for(let i=0;i<count;i++){let xx=x+(axis==='x'?i*1.05:0),zz=z+(axis==='z'?i*1.05:0);let b=box(terrain,xx,row*.56+.35,zz,axis==='x'?1:.67,.53,axis==='z'?1:.67);b.rotation.y=(rng()-.5)*.09;}}
wall(-11,-9,'x',22,3);wall(-11,-8,'z',17,2);wall(11,-8,'z',17,2);wall(-10,9,'x',21,1);
for(let x of [-10,-5,0,5,10]){box(terrain,x,1.35,-9,.9,2.7,.9);box(terrain,x,2.75,-9,1.08,.22,1.08);}for(let z of [-5,0,5,9])for(let x of [-11,11]){box(terrain,x,1.05,z,.9,2.1,.9);box(terrain,x,2.15,z,1.1,.2,1.1);}
const obstacles=[],roomCover=new THREE.Group(),arenaGroup=new THREE.Group(),trapGroup=new THREE.Group();scene.add(roomCover,arenaGroup,trapGroup);let traps=[],trapClock=0;
for(let i=0;i<27;i++){let x=(rng()-.5)*21,z=(i%2?1:-1)*8.7;path([[x,0,z],[x+.6,.12,z-1],[x+.1,.17,z-2],[x+1,.15,z-2.4]],.06+rng()*.07,mats.root);}
function lantern(x,z,y=.6){let g=new THREE.Group();g.position.set(x,y,z);terrain.add(g);box(g,0,.15,0,.44,.12,.44,mats.black);box(g,0,.77,0,.5,.12,.5,mats.black);for(let a of [-1,1])for(let b of [-1,1])limb(g,[a*.18,.2,b*.18],[a*.18,.72,b*.18],.025,mats.black);orb(g,0,.45,0,.14,mats.amber);if(!mobileDevice){let light=new THREE.PointLight(0xffad45,7,5,2);light.position.y=.55;light.visible=QUALITY_LEVELS[qualityLevel].lanternLights;g.add(light);lanternLights.push(light);}return g;}
const lanternLights=[];
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
for(let x of [-10,-5,0,5,10]){for(let j=0;j<3;j++){let z=-9.4+j*.22;path([[x-.3,-.8,z],[x+.3,.5,z],[x-.2,1.2,z],[x+.3,2.5,z]],.035+j*.015,mats.root);for(let k=0;k<5;k++)leafInstance(k,x+Math.sin(k*2)*.3,k*.42,z+.45,.1,k,1,.6);}}
// Terrace foundation continues down into the ravine rather than ending as a floating slab.
for(let x=-11;x<11;x+=1.4){box(terrain,x,-1.7,9,1.3,2.8,.8);if(Math.round(x)%3===0)path([[x,.6,9.4],[x+.3,-1,9.6],[x-.4,-3.1,9.3]],.12,mats.root);}
for(let z=-9;z<9;z+=1.4)for(let x of [-11,11])box(terrain,x,-1.7,z,.8,2.8,1.3);
const pool=mesh(new THREE.PlaneGeometry(65,65),new THREE.MeshStandardMaterial({color:0x172d35,...(normal?{normalMap:normal,normalScale:new THREE.Vector2(.015,.015)}:{}),roughness:.68,metalness:.12}),scene,0,-3.4,0);pool.name='garden-pool';pool.rotation.x=-Math.PI/2;
// Overhanging garden growth softens the square terrace and catches the moonlight.
for(let side of [-1,1])for(let j=0;j<8;j++){
 let x=side*(11.6+rng()*1.8),z=-8+j*2.7;
 path([[x,-3,z],[x-.35*side,.4,z],[x-side*.9,2.3,z+.4],[x-side*1.3,3.6,z+.8]],.10+rng()*.08,mats.root,terrain);
 for(let k=0;k<22;k++){
   leafInstance(k,x+(rng()-.5)*2,1.3+rng()*2.4,z+(rng()-.5)*2.4,-.5-rng(),rng()*6.28,rng()*2,1.1+rng()*.9,1+rng()*1.6,1);
 }
}
for(let j=0;j<17;j++){
 let x=-11+rng()*22,z=-9-rng()*1.4;
  for(let k=0;k<12;k++){const size=.7+rng();leafInstance(k,x+(rng()-.5),.5+rng()*2.7,z+(rng()-.5),rng()*2,rng()*6.28,rng(),size);}
}
const bannerMat=new THREE.MeshStandardMaterial({color:0x193e3b,roughness:1,side:THREE.DoubleSide});
for(let x of [-8.5,-3.8]){let cloth=new THREE.PlaneGeometry(.95,2.1,5,10);let a=cloth.attributes.position;for(let i=0;i<a.count;i++)a.setZ(i,Math.sin(a.getY(i)*5+a.getX(i)*2)*.07);cloth.computeVertexNormals();mesh(cloth,bannerMat,terrain,x,2,-9.05);limb(terrain,[x-.6,3.05,-9],[x+.6,3.05,-9],.035,mats.armor);let sigil=mesh(new THREE.TorusGeometry(.22,.025,4,20),mats.armor,terrain,x,2,-8.94);for(let side of [-1,1])limb(terrain,[x,1.5,-8.94],[x+side*.26,2.3,-8.94],.018,mats.armor);}
function staticInstances(geo,mat,matrices,name){if(!matrices.length)return;const ob=new THREE.InstancedMesh(geo,mat,matrices.length);ob.name=name;ob.castShadow=ob.receiveShadow=true;for(let i=0;i<matrices.length;i++)ob.setMatrixAt(i,matrices[i]);ob.instanceMatrix.needsUpdate=true;ob.matrixAutoUpdate=false;ob.updateMatrix();scene.add(ob);}
leafMatrices.forEach((matrices,i)=>staticInstances(leafGeo,leafMats[i],matrices,`garden-leaves-${i}`));
staticInstances(new THREE.SphereGeometry(1,5,3),petalMat,petalMatrices,'garden-petals');staticInstances(new THREE.IcosahedronGeometry(1,1),mats.armor,flowerCoreMatrices,'garden-flower-cores');
// Batch immovable masonry and plants by material, retaining lantern lights.
terrain.updateMatrixWorld(true);const batches=new Map(),staticMeshes=[];terrain.traverse(o=>{if(o.isMesh){staticMeshes.push(o);let geo=o.geometry.clone();if(geo.index)geo=geo.toNonIndexed();geo.applyMatrix4(o.matrixWorld);if(!batches.has(o.material))batches.set(o.material,[]);batches.get(o.material).push(geo);}});for(let o of staticMeshes)o.removeFromParent();for(let [mat,geos]of batches){let merged=mergeGeometries(geos,false);if(merged){let ob=new THREE.Mesh(merged,mat);ob.castShadow=ob.receiveShadow=true;
 // 합친 지형은 다시 움직이지 않는다. 프레임마다 행렬을 다시 계산하지 않게 잠근다.
 ob.name='garden-static-batch';ob.matrixAutoUpdate=false;ob.updateMatrix();scene.add(ob);}for(let geo of geos)geo.dispose();}
const motes=[],moteGeometry=new THREE.IcosahedronGeometry(.025,1),moteMeshes=[new THREE.InstancedMesh(moteGeometry,mats.jade,30),new THREE.InstancedMesh(moteGeometry,mats.amber,15)],moteMatrix=new THREE.Matrix4();
for(let i=0,counts=[0,0];i<45;i++){const x=(rng()-.5)*28,y=rng()*4,z=(rng()-.5)*23,kind=i%3?0:1;motes.push({x,y,z,seed:rng()*9,kind,index:counts[kind]++});}
for(const m of moteMeshes){m.frustumCulled=false;m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(m);}
const player=createSeedBody(scene,{occlusion:qualityLevel>0});player.scale.setScalar(1.25);player.position.set(0,0,5);let hp=100,invuln=0,shootCD=0,elapsed=0,stage=0,mode='ready',paused=false,kills=0,runDashes=0,runDamageTaken=0;const chosen=new Set(),mutated=new Set(),levels=new Map();let LS=lawStats(levels),choicesTaken=0,choiceKills=0;let dashState=createDashState(),dashLock=0,cachedTarget=null,targetTimer=0;const pulls=[],orbitHits=new Map();let cycle=0,region='garden';let roomCleared=false,exitOpen=false,roomStartKills=0,midReward=false,crowdLeft=0,crowdTimer=0,crowdIndex=0,autoAttack=true,playerSlow=0,orbitTime=0,orbitHitCD=0;const wells=[];const orbitGroup=new THREE.Group();scene.add(orbitGroup);for(let i=0;i<7;i++){const o=mesh(baseOrbitGeo,mats.orbitPetal,orbitGroup,0,.65,0);o.castShadow=false;o.receiveShadow=false;}orbitGroup.visible=false;let enemies=[],shots=[],effects=[],enemyShots=[];const keys=new Set(),lastMove=new V(0,0,1);let keyboardDash=false;const aim=new V(0,0,-3);
const enemyIndex=createSpatialIndex(2.5),nearbyEnemies=[],explosionEnemies=[],separationEnemies=[];
const previousPlayer=new V(),moveVector=new V(),aimDirection=new V(),pullVector=new V(),wellVector=new V(),enemyVector=new V(),previousEnemy=new V(),previousShot=new V(),previousEnemyShot=new V(),shotOrigin=new V();
const contactShadows=createContactShadows(scene);
const heldForms=new Map(),formCombats=new Map(),formCooldowns=new Map(),formAttacks=new Map();const AWAKEN_TWIN_STAGGER=5;const combatKey=(id,i)=>isTwinForm(id)?`${id}#${i}`:id;const combatsOf=id=>attackPartsOf(id).map((_,i)=>formCombats.get(combatKey(id,i))).filter(Boolean);let activeGauge=createActiveGauge(),activeReadyAnnounced=false;const finaleEchoes=[];const promptedSolo=new Set(),promptedAwaken=new Set(),promptedSecond=new Set();let guideTarget=null,rerollUsed=false;const promptedForms=new Set();let arena=arenaFor(0),escortWaves=0,bossDefeated=false;const pendingEscorts=[];
// Score, boss counts and potions live for one run. Every fifth warden opens the way to the real boss.
let labSafe=false;
let baseSlideTime=0,baseSlideCooldown=0,baseSlideDir=new V();
// Potion effects run on their own timers: a dodge rewrites invuln, so the shell must not rely on it.
let hasteTime=0,shellTime=0,selectedItem=null,itemBarKey='';
let score=0,wardensDefeated=0,austinsDefeated=0,austinRoom=false,inventory=emptyInventory(),runBonuses=emptyRunBonuses(),runBonusOffer=null,turretPotionDry=0,relics=emptyRelics(),relicRewardPending=false,dashRewardPending=false,clockFloor=null,potionCD=0,act2Support=null;const fallen=[];const JOURNEY_HEAL=25;
const isBoss=e=>e.type==='warden'||e.type==='austin'||e.type==='act2warden'||e.type==='alwaysbeginner';
function inAustinRoom(){return austinRoom&&stage===4;}
function austinAhead(){return !isAct2(region)&&!austinRoom&&Math.floor(wardensDefeated/gardenFx.austinEvery)>austinsDefeated;}
function act2BossAhead(){return isAct2(region)&&!austinRoom&&Math.floor(wardensDefeated/5)>austinsDefeated;}
function finalBossAhead(){return austinAhead()||act2BossAhead();}
function finalBossName(){return isAct2(region)?ALWAYS_BEGINNER.name:AUSTIN.name;}
const appShell=setupMobileApp();
const audio=createGameAudio();audio.installUnlock(document);
const touch=createTouchControls(()=>mode==='playing'&&!paused);
const playerMotion=createMotion(player,player.userData.legs);const growth=createSeedEvolution(player,playerMotion.body);const cameraFeel=createCameraFeel();let cameraMoveX=0,cameraMoveZ=0;let evolutionTime=0;const evolutionDuration=1.4;
function ring(parent,r,color){let mat=new THREE.MeshBasicMaterial({color,transparent:true,opacity:.75,side:THREE.DoubleSide,forceSinglePass:true});let geo=ringGeos.get(r);if(!geo){geo=new THREE.RingGeometry(r-.035,r,48);ringGeos.set(r,geo);sharedGeometries.add(geo);}let m=mesh(geo,mat,parent);m.castShadow=false;m.rotation.x=-Math.PI/2;m.position.y=.12;return m;}
function enemy(type,x,z){let g=new THREE.Group();scene.add(g);g.position.set(x,0,z);let legs=[],arms=[];/* The painted sprite (attachActorArt below) replaces the body, so no 3D parts are built only to be disposed on the same frame (2026-09-15: ~40 geometries per spawn made wave starts hitch on phones). */g.scale.setScalar(type==='hound'?1.3:1.22);let e={g,type,hp:type==='hound'?78+stage*10:92+stage*12,timer:.35+rng()*.7,state:'stalk',dir:new V(),legs,phase:rng()*6,hit:0};e.motion=createMotion(g,legs,arms);e.ring=ring(g,type==='hound'?.9:1.1,0xed7d30);e.ring.material.opacity=.25;
let tellMat=new THREE.MeshBasicMaterial({color:0xff932d,transparent:true,opacity:.2,depthWrite:false,side:THREE.DoubleSide,forceSinglePass:true});
let tell=mesh(type==='hound'?enemyGeos.tellHound:enemyGeos.tellCaster,tellMat,g,0,.095,type==='hound'?2.7:0);tell.castShadow=false;tell.rotation.x=-Math.PI/2;tell.visible=false;e.tell=tell;
attachActorArt(e,camera,release,{file:type==='hound'?'enemy-hound-v4.png':'enemy-caster-v4.png',size:type==='hound'?1.75:2.2,directional:true,occlusion:qualityLevel>0});enemies.push(e);return e;}
function swarm(x,z){
 const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);
 const e={g,type:'swarm',hp:(26+stage*5)*difficulty(cycle,region).hp*levelPressure(),state:'stalk',timer:0,phase:Math.random()*6,hit:0,slow:0},act2=isAct2(region),art=act2?ACT2_ART.runner:null;attachActorArt(e,camera,release,{file:art?.file||'enemy-hound-v4.png',size:act2 ? .82 : .95,directional:true,baseline:art?.baseline||.04,occlusion:qualityLevel>0});enemies.push(e);
}
function spawnCrowd(n){for(let i=0;i<n&&crowdLeft>0&&enemies.length<CROWD_CAP;i++){const p=safeArenaSpawn(player.position,obstacles,crowdIndex++,arena);if(!p)break;swarm(p.x,p.z);crowdLeft--;}}
function applyLawHit(e,amount,secondary=false,critical=false){
 damageEnemy(e,amount*(secondary&&isBoss(e)?.65:1),!secondary,critical&&!secondary);
 if(chosen.has('frost'))e.slow=Math.max(e.slow||0,LS.frostTime);
 if(secondary)return;
 if(chosen.has('burst')){
  const radius=LS.burstRadius;vfx.explosion(e.g.position,'burst',Math.max(.8,radius*.48));
  for(const other of enemyIndex.queryInto(e.g.position,radius,explosionEnemies))if(other!==e&&!other.dead)applyLawHit(other,amount*.5,true);
 }
 if(chosen.has('gravity')){if(wells.length>=6)wells.shift();wells.push({pos:e.g.position.clone(),life:1.6,pulse:0});}
}
const gate=new THREE.Group();gate.position.set(EXIT.x,0,EXIT.z);scene.add(gate);
const gateRing=ring(gate,1,0xa9ffda);const gateHalo=mesh(new THREE.TorusGeometry(.7,.08,6,40),mats.jade,gate,0,1.1,0);gate.visible=false;
document.body.insertAdjacentHTML('beforeend','<button id="exit-room" hidden>다음 방으로 · E</button><div id="boss-hud" hidden><strong>기억의 문지기</strong><div><i></i></div><em class="boss-move" hidden></em><small></small></div><div id="score-hud" hidden><small>점수</small><b>0</b></div><div id="item-bar" hidden role="group" aria-label="물약 가방"></div>'+ACTIVE_BUTTON_HTML+ACTIVE_EFFECT_HTML+'<div id="item-status" hidden aria-live="polite"></div>');
bindPointerAction($('#active-skill'),{onPress:button=>{useActive();button.blur();}});
bindPointerAction($('#item-bar'),{selector:'[data-item]',onPress:button=>{useInventoryItem(button.dataset.item);button.blur();}});
$('#rules').innerHTML=Object.entries(LAWS).map(([id,v])=>`<div data-rule="${id}" title="${v.name}">${lawArt(id)}<span>${v.name}</span></div>`).join('');
document.body.insertAdjacentHTML('beforeend','<div id="growth-progress"><span></span><div><i></i></div></div><div id="overhead" hidden><div class="oh-hp"><i></i></div><div class="oh-dash"><i></i></div><b class="oh-lock" hidden>회피 봉인</b></div>');
$('#exit-room').onclick=useExit;$('#stages').innerHTML=ROOMS.map(()=>'<span>♧</span>').join('<i></i>');
// ---------------- act 2 ----------------
// The run's region decides the act; act-2 saves and local records live under their own keys (act2.js).
let startRegion='garden';const actStore=()=>actStorage(runStorage,actOf(region));const AXIS_Y=new V(0,1,0);
const stadium=createStadium(scene,{lights:scene.children.filter(o=>o.isHemisphereLight||o.isDirectionalLight||o.isAmbientLight),hide:[terrain,...scene.children.filter(o=>o.name?.startsWith('garden-'))]});
const act2Ctx={get player(){return player.position;},collide:(p,r)=>collide(p,r),hit:a=>hitPlayer(a),
 bolt:(pos,dir,spec)=>stadiumBolt(pos,dir,{...spec,speed:spec.speed*difficulty(cycle,region).projectileSpeed}),
 blocked:(a,b)=>segmentHitsCover({x:a.x,z:a.z},{x:b.x,z:b.z},obstacles,.1),shots:()=>shots,
 batShot:shot=>{shot.life=0;vfx.pulse(shot.ob.position,'reflect',.8,.22);vfx.burst(shot.ob.position,'amber',10,1.2);},canBat:()=>LS.pierceHits<=1,random:rng,burst:(p,c,n)=>vfx.burst(p,c,n,1.25),sound:id=>audio.play(id)};
function spawnAct2(type,x,z){const e=createAct2Minion(scene,type,rng);e.g.position.set(x,0,z);const art=ACT2_ART[type];attachActorArt(e,camera,release,{file:art.file,size:art.size,directional:true,baseline:art.baseline,occlusion:qualityLevel>0});enemies.push(e);return e;}
function spawnAct2WardenAt(x,z,variant,{support=false,scaled=false}={}){const encounter=act2WardenEncounter(cycle),e=createAct2Warden(scene,variant),art=ACT2_WARDEN_ART[e.variant];e.g.position.set(x,0,z);e.support=support;e.hp=e.maxHp=e.maxHp*encounter.hpScale;attachActorArt(e,camera,release,{file:art.file,size:art.size,directional:true,baseline:art.baseline,occlusion:qualityLevel>0});if(scaled){e.hp*=difficulty(cycle,region).bossHp*levelPressure();e.maxHp=e.hp;}enemies.push(e);return e;}
function drawRoom(){shadowClock=SHADOW_REFRESH;const clockRoom=inAustinRoom()&&!isAct2(region),bossRoom=inAustinRoom();arena=clockRoom?AUSTIN_ARENA:arenaFor(stage,cycle,region);for(const child of [...arenaGroup.children])release(child);buildRoomBoundary();clockFloor=clockRoom?createClockFloor(arenaGroup):null;for(const child of [...roomCover.children])release(child);obstacles.splice(0,obstacles.length,...(bossRoom?[]:roomFor(stage,cycle,region).covers).map(o=>({...o})));const exitSpot=arena.exit||EXIT;gate.position.set(exitSpot.x,0,exitSpot.z);buildCoverArt(roomCover,obstacles,mats);for(const child of [...trapGroup.children])release(child);traps=bossRoom?[]:trapsFor(stage,cycle,region);createTrapVisuals(trapGroup,traps,mats).forEach((visual,i)=>traps[i].visual=visual);stadium.setActive(isAct2(region),arena,{stage,bossRoom});freezeStatic(arenaGroup);freezeStatic(roomCover);}
// 방 안에서 움직이지 않는 것들의 행렬을 잠근다(함정과 배우는 제외).
function freezeStatic(group){group.updateMatrixWorld(true);group.traverse(o=>{o.matrixAutoUpdate=false;});}
// Everyone's ranking lives on the jpmathlab Firebase project; this browser's board stays as the fallback.
const online=localInspection?{flush:async()=>0,top:async()=>[],uid:()=>null,submit:async()=>{throw new Error('Local inspection never submits rankings');}}:createOnlineRanking({storage:runStorage,authProvider:()=>account.tokenSession()});let playerName=lastName(runStorage),rankSerial=0;
const betaRankingEligible=()=>Boolean((account.native||betaTesterMode)&&account.user()&&!account.user().isAnonymous);
// 정원의 식물은 시각 기록이고, 오스틴이 남긴 작은 성장점만 전투에 적용된다.
let garden=readGarden(runStorage);
// A read-only-looking local art board assembled from in-memory data. It never
// writes over the tester's garden and cannot be enabled on the public host.
if(localInspection&&new URLSearchParams(location.search).has('gardenLab'))garden=normalizeGarden({...garden,harvests:30,plots:[
 {seed:'reflect',growth:0,style:'balanced'},{seed:'split',growth:2,style:'agile'},
 {seed:'chain',growth:4,style:'rush'},{seed:'orbit',growth:9,style:'endure'},
 {seed:'gravity',growth:9,style:'agile'},{seed:'frost',growth:9,style:'rush'}
]});
let gardenFx=gardenEffects(garden),lastHarvest=null;
const gardenStats=()=>gardenFx.mastery;
const maxPlayerHp=()=>gardenStats()?.maxHp||100;
const gardenPower=()=>gardenStats()?.power||1;
const gardenCooldown=()=>gardenStats()?.cooldownRate||1;
const totalCritChance=()=>Math.min(.25,(LS?.critChance||0)+(gardenStats()?.critical||0));
// 정원 장면은 처음 볼 때 만든다. 만든 뒤에는 정원 화면과 첫 화면에서 이 장면을 그린다.
let gardenScene=null,gardenSelection=null;
function ensureGardenScene(){
 if(!gardenScene){gardenScene=createGardenScene();gardenScene.resize(canvasRect.width||1,canvasRect.height||1);}
 gardenScene.setGarden(garden,{austinDefeated:austinKnown()});
 return gardenScene;
}
// 옛 이어하기 기록만 복구하기 위한 변이 상태. 새 정원에서는 열리지 않는다.
const mutations=new Map(),runes=[];
function austinKnown(){return Boolean(profile?.bosses?.includes('austin'));}
function refreshGardenEffects(){gardenFx=gardenEffects(garden,activeSlots(garden,{austinDefeated:austinKnown()}));}
function gardenGuideLaw(){return gardenFx.formGuides.find(law=>!levels.has(law))||null;}
function requireName(){const input=$('#player-name'),name=cleanName(input?input.value:playerName);
 // 거른 별명(name-filter.js)은 쓸 수 없다. 휴대폰에서는 안내 줄이 숨겨지므로 칸을 비우고 칸 안에 이유를 적는다.
 if(name&&isBadName(name)){playerName='';nameRejected=true;if(input){input.value='';input.placeholder='그 별명은 쓸 수 없어요';input.classList.add('need');input.focus();setText($('#name-hint'),'그 별명은 쓸 수 없어요 · 친구가 봐도 괜찮은 별명으로 바꿔 주세요');}return false;}
 if(!name){if(input){input.classList.add('need');input.focus();setText($('#name-hint'),nameRejected?'그 별명은 쓸 수 없어요 · 친구가 봐도 괜찮은 별명으로 바꿔 주세요':'이름을 먼저 적어 주세요 · 이 이름으로 랭킹에 올라가요');}return false;}
 const consent=$('#ranking-terms');if(!rankingTermsAccepted(runStorage)&&!consent?.checked){if(consent)consent.focus();setText($('#name-hint'),'명예의 전당 이용규칙을 읽고 동의해 주세요');return false;}
 setRankingTermsAccepted(runStorage,true);playerName=saveName(runStorage,name);return true;}
let saveOK=false,profile=readDiscoveries(runStorage);const titleAccount=readAccountProfile(runStorage),seedTitle=createSeedTitle(player,{austin:profile.bosses.includes('austin'),discovered:profile.forms.length,total:Object.keys(FORMS).length,badges:titleAccount.badges,equipped:titleAccount.equippedTitle});
function buildRoomBoundary(){buildArenaBoundary(arenaGroup,arena,mats);}
function remember(kind,id){if(developerRun)return {profile,saved:true};const before=profile.forms.length;const result=recordDiscovery(runStorage,profile,kind,id);profile=result.profile;if(kind==='bosses'&&id==='austin')seedTitle.setUnlocked(true);seedTitle.setDiscovered(profile.forms.length);const news=codexNews(before,profile.forms.length);if(news)setTimeout(()=>{$('#toast').textContent=news;},1800);if(!result.saved)$('#toast').textContent='발견은 이번 접속에만 남습니다 · 브라우저 저장 불가';return result;}
function syncLaws(){chosen.clear();mutated.clear();for(const [id,v] of levels){chosen.add(id);if(v>=2)mutated.add(id);}LS=relicLawStats(lawStats(levels),relics);document.querySelectorAll('#rules>div').forEach(n=>{const lv=levelOf(levels,n.dataset.rule),mark=mutationOf(mutations,n.dataset.rule);n.classList.toggle('active',lv>0);n.classList.toggle('mutated',Boolean(mark));n.querySelector('span:not(.law-art)').textContent=LAWS[n.dataset.rule].name+(lv?' Lv.'+lv:'')+(mark?' '+mark.badge:'');});}
function levelPressure(){return 1+.07*Math.max(0,buildLevel(levels,heldForms)-1);}
function effectiveLaws(){return [...effectiveLevels(levels,heldForms).keys()];}
function syncForms(reset=false){
 // One combat per attack: a twin awakening runs two (keys id#0, id#1); formAttacks maps each key to the attack it fires.
 const activeEntries=activeCombatEvolutions(heldForms,FORMS),wanted=new Map();
 for(const {id,level} of activeEntries)attackPartsOf(id).forEach((attack,i)=>wanted.set(combatKey(id,i),{id,attack,level,index:i}));
 for(const [key,combat] of formCombats)if(!wanted.has(key)){combat.dispose();formCombats.delete(key);formCooldowns.delete(key);formAttacks.delete(key);}
 for(const [key,{id,attack,level,index}] of wanted){let combat=formCombats.get(key);if(!combat){combat=createFormCombat(scene,formOptions());formCombats.set(key,combat);formCooldowns.set(key,0);}formAttacks.set(key,attack);if(reset)combat.clear();const twin=isTwinForm(id);combat.set(twin?attack:id,level,{twin,twinId:twin?id:null,openingDelay:2+index*AWAKEN_TWIN_STAGGER});}
 player.userData.setEvolution?.(heldForms);
 updateFormLabel();
}
function clearForms(){syncForms(true);}
function syncForm(){syncForms();}
function finishEvolutionChoices(){if(!offerSolo(afterSolo))afterSolo();}
function afterSolo(){if(!offerAwaken())finishChoice();}
function canTakeEvolution(form){return canAcquireEvolution(heldForms,form.id,FORMS);}
function offerSecondFusion(onDone=finishChoice,force=false){
 const key=o=>o.id+':'+[...o.from].sort().join('+');
 const options=secondFusionOptions(heldForms).filter(o=>force||!promptedSecond.has(key(o))).slice(0,3);
 if(!options.length)return false;
 mode='forms';touch.reset();keys.clear();keyboardDash=false;$('#overlay').hidden=false;$('#overlay').classList.remove('intro');
 options.forEach(o=>promptedSecond.add(key(o)));
 $('#overlay').innerHTML=`<p>두 완성 진화가 하나의 씨앗으로 겹칩니다</p><h2>재융합</h2><p>두 진화가 사라지고 재융합이 한 칸을 차지합니다 · 공명형은 세 번째 적중, 교차형은 표식과 소비가 핵심입니다.</p><div class="form-cards">${options.map((o,i)=>secondFusionCard(o,heldForms,secondFusionLevel(heldForms,o),profile.forms.includes(o.id),i)).join('')}</div><p class="form-note">최대 세 장만 표시합니다. 지금 합치지 않아도 다음 선택 화면에서 다시 열 수 있어요.</p><button id="keep-second" class="primary">지금은 재융합하지 않기</button>`;
 document.querySelectorAll('[data-second]').forEach(button=>button.onclick=()=>{if(mode!=='forms')return;const option=options[Number(button.dataset.second)];if(!option||!fuseSecond(heldForms,option))return;remember('forms',option.id);syncLaws();syncForms();growth.select(effectiveLaws(),mutated);vfx.evolution(player.position,FORMS[option.id].requires[0]);audio.play('fusion',{intensity:1.2});onDone();$('#toast').textContent=`${FORMS[option.id].name} Lv.${heldForms.get(option.id)} · 두 완성 진화가 한 칸으로 재융합했습니다`;});
 $('#keep-second').onclick=onDone;return true;
}
// Solo evolution: a law at SOLO_LEVEL or higher may evolve on its own. Asked again each time that law levels up.
// Awakening: asked once per combination; the card screen can open it again.
function awakenable(o){const rest=new Map(heldForms);for(const id of o.from)rest.delete(id);return canAcquireEvolution(rest,o.id,FORMS);}
function offerAwaken(onDone=finishChoice,force=false){
 const key=o=>o.id+':'+o.from.join('+');
 const options=awakenOptions(heldForms).filter(awakenable).filter(o=>force||!promptedAwaken.has(key(o)));
 if(!options.length)return false;
 mode='forms';touch.reset();keys.clear();keyboardDash=false;$('#overlay').hidden=false;$('#overlay').classList.remove('intro');
 options.forEach(o=>promptedAwaken.add(key(o)));
 $('#overlay').innerHTML=`<p>두 진화가 서로를 알아봅니다</p><h2>각성 진화</h2><p>재료 진화가 사라지고 각성 진화가 한 칸을 차지합니다. 비는 칸에는 새 법칙을 다시 받을 수 있어요.</p><div class="form-cards">${options.map((o,i)=>awakenCard(o,heldForms,awakenLevel(heldForms,o),profile.forms.includes(o.id),i)).join('')}</div><p class="form-note">각성 진화는 융합 공격이 더 강해지고, 10초마다 여는 기술을 스스로 씁니다.<br>각성하지 않아도 이후 카드 화면의 '각성 진화 보기'에서 다시 고를 수 있어요.</p><button id="keep-awaken" class="primary">지금은 각성하지 않기</button>`;
 document.querySelectorAll('[data-awaken]').forEach(b=>b.onclick=()=>{if(mode!=='forms')return;const o=options[Number(b.dataset.awaken)];if(!o||!awaken(heldForms,o))return;remember('forms',o.id);syncLaws();syncForms();growth.select(effectiveLaws(),mutated);vfx.evolution(player.position,FORMS[o.id].requires[0]);audio.play('fusion');onDone();$('#toast').textContent=`${FORMS[o.id].name} Lv.${heldForms.get(o.id)} · 진화가 각성했습니다`;});
 $('#keep-awaken').onclick=onDone;return true;
}
function offerSolo(onDone=afterSolo,force=false){
 const candidates=soloReady(levels).filter(canTakeEvolution).filter(f=>force||!promptedSolo.has(f.id+':'+levels.get(f.requires[0])));
 if(!candidates.length)return false;
 mode='forms';touch.reset();keys.clear();keyboardDash=false;$('#overlay').hidden=false;$('#overlay').classList.remove('intro');
 candidates.forEach(f=>promptedSolo.add(f.id+':'+levels.get(f.requires[0])));
 $('#overlay').innerHTML=`<p>한 법칙이 혼자 자랐습니다</p><h2>단독 진화</h2><p>법칙이 칸에서 사라지고 그 자리에 단독 진화가 들어갑니다(칸 수는 그대로). 법칙 레벨 - 1이 진화 레벨이 됩니다.</p><div class="form-cards">${candidates.map(f=>soloCard(f,levels.get(f.requires[0]),heldForms.get(f.id)||0,profile.forms.includes(f.id))).join('')}</div><p class="form-note">단독 진화도 이후 선택지에서 강화할 수 있고, 궁극기(F)의 시그니처를 가집니다.<br>합치지 않고 법칙을 계속 키우면 다음 레벨에서 다시 물어봐요.</p><button id="keep-solo" class="primary">지금은 진화하지 않기</button>`;
 document.querySelectorAll('[data-solo]').forEach(b=>b.onclick=()=>{if(mode!=='forms')return;const id=b.dataset.solo,law=SOLO_FORMS[id].requires[0];if(!evolveSolo(levels,heldForms,id))return;remember('forms',id);syncLaws();syncForms();growth.select(effectiveLaws(),mutated);vfx.evolution(player.position,law);audio.play('evolve');onDone();$('#toast').textContent=`${FORMS[id].name} Lv.${heldForms.get(id)} · ${LAWS[law].name} 법칙이 혼자 진화했습니다`;});
 $('#keep-solo').onclick=onDone;return true;
}
function finishChoice(){runBonusOffer=null;mode='playing';$('#overlay').hidden=true;invuln=Math.max(invuln,.7);shootCD=0;if(roomCleared)openExit();}
function offerDashEvolution(onDone){
 if(!dashRewardPending||dashState.id)return false;
 mode='dash-evolution';touch.reset();keys.clear();keyboardDash=false;$('#overlay').hidden=false;$('#overlay').classList.remove('intro');
 $('#overlay').innerHTML=`<p>${wardensDefeated>1?'문지기의 힘이 다시':'첫 문지기의 힘이'} 뿌리에 스며듭니다</p><h2>회피 진화</h2><p>공격 법칙과 별도로 하나를 고릅니다 · 이 도전이 끝날 때까지 유지됩니다</p><div class="dash-evolution-cards">${dashEvolutionCards()}</div><p class="form-note">쌍싹은 순간 대응, 긴뿌리는 거리, 허물은 무적시간에 강합니다.</p>
  <button id="keep-dash" class="primary">지금은 고르지 않기</button>`;
 // 고르지 않고 넘어갈 수 있다. 다음 문지기를 잡으면 다시 물어본다.
 $('#keep-dash').onclick=()=>{if(mode!=='dash-evolution')return;dashRewardPending=false;mode='playing';$('#overlay').hidden=true;onDone();$('#toast').textContent='회피 진화를 고르지 않았습니다 · 다음 문지기를 잡으면 다시 고를 수 있습니다';};
 document.querySelectorAll('[data-dash-evolution]').forEach(button=>button.onclick=()=>{if(mode!=='dash-evolution')return;const id=button.dataset.dashEvolution;if(!Object.hasOwn(DASH_EVOLUTIONS,id))return;dashState=createDashState(id);dashRewardPending=false;mode='playing';$('#overlay').hidden=true;vfx.evolution(player.position,'orbit');vfx.burst(player.position,'seed',30,1.7);audio.play('evolve');onDone();$('#toast').textContent=`회피 진화 · ${DASH_EVOLUTIONS[id].name} 선택 완료`;});
 return true;
}
function offerForm(force=false,onDone=finishChoice){
 const candidates=eligibleForms(chosen).filter(canTakeEvolution).filter(f=>force||!promptedForms.has(f.id));
 if(!candidates.length)return false;
 mode='forms';touch.reset();keys.clear();keyboardDash=false;$('#overlay').hidden=false;$('#overlay').classList.remove('intro');
 candidates.forEach(f=>promptedForms.add(f.id));
 $('#overlay').innerHTML=`<p>두 법칙을 하나로 합치기</p><h2>완성 진화</h2><p>재료 두 법칙이 사라지고 진화가 한 칸을 차지합니다. 기본 탄환은 남은 법칙으로 계속 나갑니다.</p><div class="form-cards">${candidates.map(f=>formCard(f,[...chosen],profile.forms.includes(f.id),true,(heldForms.get(f.id)||0)+fusionLevel(levels,f.id),heldForms.get(f.id)||0)).join('')}</div><p class="form-note">합칠 때 두 법칙의 레벨이 진화 레벨이 됩니다(레벨 합 - 1). 이미 가진 진화를 또 합치면 그 진화가 강해집니다.<br>진화는 이후 선택지에서 따로 강화할 수 있고, 빈 칸에는 새 법칙을 다시 받을 수 있어요.</p><button id="keep-form" class="primary">지금은 합치지 않기</button>`;
 document.querySelectorAll('[data-form]').forEach(b=>b.onclick=()=>{if(mode!=='forms')return;const id=b.dataset.form;if(!fuse(levels,heldForms,id))return;remember('forms',id);syncLaws();syncForms();growth.select(effectiveLaws(),mutated);vfx.evolution(player.position,FORMS[id].requires[0]);audio.play('fusion');if(!offerSecondFusion(onDone))onDone();$('#toast').textContent=`${FORMS[id].name} Lv.${heldForms.get(id)} · 두 법칙이 한 칸으로 합쳐졌습니다`;});
 $('#keep-form').onclick=onDone;return true;
}
const twinMarks=new WeakMap();
function twinResonance(e,amount,meta,scale){
 const twin=TWIN_FORMS[meta.evolution];if(!twin)return;
 const last=twinMarks.get(e),now=elapsed;
 if(!last||last.id!==twin.id||last.kind===meta.kind||now-last.time>twin.synergy.window){twinMarks.set(e,{id:twin.id,kind:meta.kind,time:now});return;}
 twinMarks.delete(e);const bonus=amount*twin.synergy.bonus*scale;if(!(bonus>0))return;
 damageEnemy(e,bonus,false);const pos=e.g.position,direction=pos.clone().sub(player.position).setY(0).normalize();
 vfx.burst(pos,'awaken',10,.75);
 for(const effect of twin.synergy.effects){
  if(effect==='frost')e.slow=Math.max(e.slow||0,1.6);
  else if(effect==='gravity'){if(wells.length>=6)wells.shift();wells.push({pos:pos.clone(),life:.65,pulse:0});}
  else if(effect==='burst'){vfx.explosion(pos,'burst',.9);for(const other of enemies)if(other!==e&&!other.dead&&other.g.position.distanceTo(pos)<1.25)damageEnemy(other,bonus*.35,false);}
  else if(effect==='chain'){const other=enemies.filter(o=>o!==e&&!o.dead).sort((a,b)=>a.g.position.distanceTo(pos)-b.g.position.distanceTo(pos))[0];if(other&&other.g.position.distanceTo(pos)<4){vfx.arc(pos,other.g.position);damageEnemy(other,bonus*.35,false);}}
  else if(effect==='split'){for(const other of enemies)if(other!==e&&!other.dead&&other.g.position.distanceTo(pos)<1.1)damageEnemy(other,bonus*.25,false);vfx.burst(pos,'split',8,.55);}
  else if(effect==='reflect')vfx.reflect(pos,direction);
  else if(effect==='orbit'&&!isBoss(e)&&e.type!=='turret'){e.g.position.addScaledVector(direction,.22);collide(e.g.position,.4);}
  else if(effect==='pierce'&&isBoss(e))damageEnemy(e,bonus*.2,false);
  else if(effect==='recall')vfx.trail(player.position.clone().setY(.7),pos.clone().setY(.7),'recall',false);
 }
}
function formHit(e,amount,meta){
 if((DIRECT_FORMS.has(meta.kind)||meta.generated)&&!meta.indirect&&blocksShield(e,meta.direction)){e.block=.18;vfx.pulse(e.g.position,'reflect',.65,.18);return false;}
 const consumed=FORMS[meta.kind].requires;
 const supports=id=>chosen.has(id)&&!consumed.includes(id);
 const scale=damageScale(levels)*relicFormScale(relics,consumed)*runPowerScale(runBonuses)*gardenPower();damageEnemy(e,amount*scale,false,false,meta);twinResonance(e,amount,meta,scale);
 const family=[...(meta.comboLaws||[]),...consumed];
 if(family.includes('gravity'))audio.play('gravityHit',{intensity:.7});else if(family.includes('burst'))audio.play('burstHit',{intensity:.7});else if(family.includes('pierce'))audio.play('pierceHit',{intensity:.65});else if(family.includes('frost'))audio.play('frostHit',{intensity:.65});else if(family.includes('chain'))audio.play('chain',{intensity:.55});else if(family.includes('reflect'))audio.play('reflect',{intensity:.5});
 const native=new Set(meta.comboLaws||[]),has=id=>native.has(id);
 if(has('frost'))e.slow=Math.max(e.slow||0,Math.max(1.4,LS.frostTime||0));
 if(has('chain'))for(const other of enemies.filter(o=>o!==e&&!o.dead&&o.g.position.distanceTo(e.g.position)<4).sort((a,b)=>a.g.position.distanceTo(e.g.position)-b.g.position.distanceTo(e.g.position)).slice(0,2)){line(e.g.position,other.g.position);damageEnemy(other,amount*.24*scale,false);}
 if(has('burst')){vfx.explosion(e.g.position,'burst',1.15);for(const other of enemies)if(other!==e&&!other.dead&&other.g.position.distanceTo(e.g.position)<1.65)damageEnemy(other,amount*.22*scale,false);}
 if(has('gravity')){if(wells.length>=6)wells.shift();wells.push({pos:e.g.position.clone(),life:.9,pulse:0});}
 if(has('orbit')&&!isBoss(e)&&e.type!=='turret'){e.g.position.addScaledVector(meta.direction,.3);collide(e.g.position,.4);}
 if(has('portal')){vfx.burst(e.g.position,'portal',7,.48);audio.play('portal');}
 if(supports('frost'))e.slow=Math.max(e.slow||0,LS.frostTime);
 if(supports('chain'))for(const other of enemies.filter(o=>o!==e&&!o.dead&&o.g.position.distanceTo(e.g.position)<4).sort((a,b)=>a.g.position.distanceTo(e.g.position)-b.g.position.distanceTo(e.g.position)).slice(0,LS.chainTargets)){line(e.g.position,other.g.position);damageEnemy(other,amount*.18,false);}
 if(supports('burst')){vfx.explosion(e.g.position,'burst',Math.max(.8,LS.burstRadius*.45));for(const other of enemies)if(other!==e&&!other.dead&&other.g.position.distanceTo(e.g.position)<LS.burstRadius)damageEnemy(other,amount*.18,false);}
 if(supports('gravity')){if(wells.length>=6)wells.shift();wells.push({pos:e.g.position.clone(),life:1.2,pulse:0});}
 return true;
}
function formOptions(){return {player,enemies:()=>enemies,nearby:(pos,radius,out)=>enemyIndex.queryInto(pos,radius,out),hit:formHit,blocked:(a,b)=>segmentHitsCover(a,b,obstacles,.1),boundary:(a,b,d)=>reflectArenaBoundary(a,b,d,arena),constrain:collide,vfx,sound:id=>audio.play(id),enemyShots:()=>enemyShots,theme:combatTheme};}
function clearEscorts(){for(const p of pendingEscorts)release(p.marker);pendingEscorts.length=0;}
function updateEscorts(dt){
 if(isAct2(region))return;
 const boss=enemies.find(e=>e.type==='warden'&&!e.duoSupport);if(stage!==4||!boss)return;
 if(boss.dead){clearEscorts();if(!bossDefeated){bossDefeated=true;for(const e of enemies)if(e.escort&&!e.dead){e.dead=true;release(e.g);}}return;}
 const wave=escortWave(boss.hp,boss.maxHp,escortWaves);
 if(wave>=0&&pendingEscorts.length===0){escortWaves++;let free=4-enemies.filter(e=>e.escort&&!e.dead).length;for(const type of escortTypes(wave)){if(free--<=0)break;const pos=safeArenaSpawn(player.position,obstacles,crowdIndex++,arena);if(!pos)continue;const marker=ring(scene,1,0xffa95f);marker.position.set(pos.x,.15,pos.z);pendingEscorts.push({type,pos,marker,wait:1});}}
 for(let i=pendingEscorts.length-1;i>=0;i--){const p=pendingEscorts[i];p.wait-=dt;p.marker.material.opacity=.45+Math.sin(p.wait*18)*.2;if(p.wait>0)continue;
 if(Math.hypot(p.pos.x-player.position.x,p.pos.z-player.position.z)>2){let e;if(p.type==='shield'){e=createShield(scene);e.g.position.set(p.pos.x,0,p.pos.z);attachActorArt(e,camera,release,{file:'enemy-shield-v4.png',size:2.05,directional:true,baseline:.06,occlusion:qualityLevel>0});enemies.push(e);}else e=enemy('caster',p.pos.x,p.pos.z);e.escort=true;e.hp*=difficulty(cycle,region).hp;if(e.maxHp)e.maxHp=e.hp;}
 release(p.marker);pendingEscorts.splice(i,1);
 }
}

function updateAct2WardenSupport(){
 if(!isAct2(region)||stage!==4||inAustinRoom()||!act2Support)return;
 const primary=enemies.find(e=>e.type==='act2warden'&&!e.support);
 if(!primary||primary.hp/primary.maxHp>act2Support.trigger)return;
 const side=primary.g.position.x<=0?1:-1;
 const support=spawnAct2WardenAt(side*4,-3,act2Support.variant,{support:true,scaled:true});
 support.timer+=.55;act2Support=null;vfx.pulse(support.g.position,'amber',2.2,.55);vfx.burst(support.g.position,'amber',24,1.5);audio.play('bossWarning');
 $('#toast').textContent=`${support.config.name} 난입 · 두 문지기의 공격이 이어집니다`;
}

function copiedEvolution(){
 const picked=[...heldForms].filter(([id])=>FORMS[id]).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0];
 if(!picked)return null;const [id,level]=picked,form=FORMS[id];return {id,name:form.name,requires:[...form.requires],level};
}
function spawnWardenAt(x,z,variant,{support=false,delay=0}={}){
 const e=createWarden(scene,mats,variant);e.tint=0xffffff;e.g.position.set(x,0,z);e.timer+=delay;
 if(!support)e.copiedForm=copiedEvolution();
 if(support){e.elite=true;e.duoSupport=true;e.hp=e.maxHp=1150*DUO_WARDEN.hp;}
 attachActorArt(e,camera,release,{file:`warden-${e.variant}-v4.png`,order:e.variant==='memory'?[0,3,2,1]:[0,1,2,3],size:support?3.7:4.1,directional:true,baseline:.02,occlusion:qualityLevel>0});enemies.push(e);return e;
}

function saveBoundary(nextStage=stage,saveMode='entry',over={}){
 if(developerRun)return true;
 saveOK=writeCheckpoint(actStore(),{version:1,cycle,region,stage:nextStage,mode:saveMode,hp,rules:[...chosen],mutated:[...mutated],levels:levelsToSave(levels),choicesTaken,choiceKills,kills,elapsed,playDashes:runDashes,playDamage:Math.round(runDamageTaken),forms:Object.fromEntries(heldForms),guideTarget,rerollUsed,score,wardens:wardensDefeated,austins:austinsDefeated,inventory:{...inventory},runBonuses:{...runBonuses},turretPotionDry,relics:normalizeRelics(relics),dashEvolution:dashState.id,activeGauge:Math.floor(activeGauge.value),activeCooldown:Number((activeGauge.plan?ACTIVE.cooldownSeconds:activeGauge.cooldown).toFixed(2)),...over});
 return saveOK;
}
// After a warden the journey simply continues: a little health back, and every enemy a little faster.
function nextJourney(){austinRoom=false;cycle++;rerollUsed=false;stage=0;const before=hp;hp=Math.min(maxPlayerHp(),hp+JOURNEY_HEAL);wave();$('#toast').textContent=`여정 ${cycle+1} · 생명력 +${displayHp(hp-before)} · 적과 탄막이 조금 더 거세집니다`;}
function enterAustin(){austinRoom=true;wave();$('#toast').textContent=isAct2(region)?`${ALWAYS_BEGINNER.name} 등장 · 투구선·베이스·부채꼴을 읽고 끝까지 버티세요`:`${AUSTIN.name} 등장 · 바닥 시계의 침이 다음 종소리의 빈틈을 가리킵니다`;}
function saveAfterBoss(){if(finalBossAhead())return saveBoundary(4,'austin');return saveBoundary(0,'entry',{cycle:cycle+1,hp:Math.min(maxPlayerHp(),hp+JOURNEY_HEAL),rerollUsed:false});}
document.body.insertAdjacentHTML('beforeend','<button id="save-exit" hidden>저장된 방 입구부터 나중에 이어하기</button>');
document.body.insertAdjacentHTML('beforeend','<button id="developer-lab-fab" hidden>실험실</button>');
$('#developer-lab-fab').onclick=showDeveloperLab;
// Relic numbers are measured against the build without the relic, so the screen shows before → after.
const relicFx=id=>relicEffect(id,lawStats(levels),heldForms);
const pauseBuild=createPauseBuild($('#save-exit'),()=>togglePause(),{get:()=>relics,effect:relicFx,canSwap:()=>roomCleared&&exitOpen,swap:id=>{if(!roomCleared||!exitOpen||!equipRelic(relics,id))return;syncLaws();if(stage===4)saveAfterBoss();else saveBoundary(stage+1);}},{get:()=>inventory},{get:()=>activeGauge},{state:()=>seedTitle.state()},{get:()=>dashState},{summary:()=>runBonusSummary(runBonuses),cadenceScale:()=>runCadenceScale(runBonuses)});
// The room itself always restarts from its entrance. Keep only attrition from
// the unfinished attempt; saving its rewards as well would respawn the same
// enemies while preserving their kills, score, choice gauge and drops.
function saveLeaveState(){
 if(developerRun)return false;
 if(!['playing','evolving','cards','forms','relics','dash','solo','awaken'].includes(mode)||roomCleared)return false;
 const entry=readCheckpoint(actStore()),safe=roomExitCheckpoint(entry,{hp,inventory});
 return safe?writeCheckpoint(actStore(),safe):false;
}
$('#save-exit').onclick=()=>{if(!readCheckpoint(actStore())){$('#toast').textContent='저장 기록이 없습니다. 이 브라우저의 저장 공간을 확인해 주세요.';return;}saveLeaveState();touch.reset();keys.clear();paused=false;$('#save-exit').hidden=true;showIntro();};
function wave(){
 audio.setScene(inAustinRoom()?'boss':'combat');
 for(const f of fallen)releaseEnemy(f.e);fallen.length=0;potionCD=0;relicRewardPending=false;
 clearForms();cancelActive(activeGauge);activeVfx.clear();finaleEchoes.length=0;cachedTarget=null;targetTimer=0;clearEscorts();escortWaves=0;bossDefeated=false;act2Support=null;vfx.clear();wells.length=0;roomStartKills=kills;midReward=false;trapClock=0;pulls.length=0;orbitHits.clear();dashLock=0;baseSlideTime=baseSlideCooldown=0;crowdLeft=inAustinRoom()?0:crowdTotal(stage,cycle);crowdTimer=0;crowdIndex=0;orbitHitCD=0;
 roomCleared=false;exitOpen=false;gate.visible=false;$('#exit-room').hidden=true;$('#toast').textContent='';
 for(const p of [...shots,...enemyShots,...effects])release(p.ob);shots=[];enemyShots=[];effects=[];
 drawRoom();{const start=arena.start||{x:0,z:5};player.position.set(start.x,0,start.z);}playerMotion.reset();invuln=Math.max(invuln,.8);$('#boss-hud').classList.toggle('austin-hud',inAustinRoom()&&!isAct2(region));
 if(inAustinRoom()){
  if(isAct2(region)){const e=createAlwaysBeginner(scene);e.g.position.set(0,0,-3);attachActorArt(e,camera,release,{file:ALWAYS_BEGINNER_ART.file,size:ALWAYS_BEGINNER_ART.size,directional:true,baseline:ALWAYS_BEGINNER_ART.baseline,occlusion:qualityLevel>0});enemies.push(e);$('#boss-hud strong').textContent=ALWAYS_BEGINNER.name;}
  else{const e=createAustin(scene);e.g.position.set(0,0,-3);if(AUSTIN_ART)attachActorArt(e,camera,release,{file:AUSTIN_ART,size:4.3,directional:true,baseline:.02,occlusion:qualityLevel>0});enemies.push(e);$('#boss-hud strong').textContent=AUSTIN.name;}
 }
 else for(const [type,x,z] of roomFor(stage,cycle,region).enemies){if(type==='warden'){const duo=stage===4&&!isAct2(region)?wardenEncounter(cycle,austinsDefeated):{count:1};const e=spawnWardenAt(x+(duo.count===2?-2.35:0),z,wardenVariantFor(cycle));if(duo.count===2)spawnWardenAt(x+2.35,z,wardenVariantFor(cycle+1),{support:true,delay:.85});$('#boss-hud strong').textContent=duo.count===2?'쌍문지기':e.config.name;}else if(type==='act2warden'){const encounter=act2WardenEncounter(cycle),e=spawnAct2WardenAt(x,z,encounter.primary);if(encounter.support)act2Support={variant:encounter.support,trigger:encounter.trigger};$('#boss-hud strong').textContent=encounter.support?`${e.config.name} · 연계전`:e.config.name;}else if(isAct2Minion(type))spawnAct2(type,x,z);else enemy(type,x,z);}
 if(stage===3&&!isAct2(region)){const e=createWarden(scene,mats,wardenVariantFor(cycle+1));e.elite=true;e.tint=0xffffff;e.hp=e.maxHp=1150*.36;{const spot=roomFor(stage,cycle,region).elite||{x:0,z:-5};e.g.position.set(spot.x,0,spot.z);}attachActorArt(e,camera,release,{file:`warden-${e.variant}-v4.png`,order:e.variant==='memory'?[0,3,2,1]:[0,1,2,3],size:3.1,directional:true,baseline:.02,occlusion:qualityLevel>0});enemies.push(e);}
 for(const spot of inAustinRoom()?[]:turretSpots(stage,cycle,region)){const t=createTurret(scene,mats,copiedLaws(effectiveLevels(levels,heldForms)));t.g.position.set(spot.x,0,spot.z);attachActorArt(t,camera,release,{file:'enemy-turret-v4.png',size:3.0,preserveBody:true,occlusion:qualityLevel>0});enemies.push(t);}
 if(!isAct2(region)&&stage<4&&(stage===1||stage===3||cycle>0)){const e=createShield(scene);{const spot=roomFor(stage,cycle,region).shield||{x:stage===3?0:1.6,z:stage===3?2:-4};e.g.position.set(spot.x,0,spot.z);}attachActorArt(e,camera,release,{file:'enemy-shield-v4.png',size:2.05,directional:true,baseline:.06,occlusion:qualityLevel>0});enemies.push(e);}
 for(const e of enemies){e.hp*=(isBoss(e)?difficulty(cycle,region).bossHp:difficulty(cycle,region).hp)*levelPressure();if(e.maxHp)e.maxHp=e.hp;}
 saveBoundary(stage,inAustinRoom()?'austin':'entry');spawnCrowd(8);$('#encounter').textContent=`여정 ${cycle+1} · ${inAustinRoom()?(isAct2(region)?'야간 결승전 · '+ALWAYS_BEGINNER.name:'정시의 시계탑 · '+AUSTIN.name):REGION_NAMES[region]+' · '+roomFor(stage,cycle,region).name}`;
 [...document.querySelectorAll('#stages span')].forEach((n,i)=>n.classList.toggle('active',i<=stage));$('#boss-hud').hidden=stage!==4;
}
function openExit(){if(dashRewardPending&&offerDashEvolution(openExit))return;if(relicRewardPending){relicRewardPending=false;const offers=relicOffers(relics,rng,gardenFx.relicLaws);if(offers.length){mode='relics';touch.reset();keys.clear();keyboardDash=false;showRelicChoice($('#overlay'),relics,offers,()=>{syncLaws();mode='playing';$('#overlay').hidden=true;openExit();},relicFx);return;}}if(stage===4)saveAfterBoss();else saveBoundary(stage+1);exitOpen=true;gate.visible=true;$('#toast').textContent=stage!==4?'방을 정리했다 · 빛나는 출구로 이동하세요':austinRoom?`${finalBossName()}을 이겼다 · 빛나는 출구로 다음 여정을 떠나세요`:finalBossAhead()?'다섯 번째 관문 돌파 · 출구 너머에서 최종 보스가 기다립니다':'문지기가 쓰러졌다 · 빛나는 출구로 다음 여정을 떠나세요';}
function useExit(){if(!canUseExit({open:exitOpen,mode,paused,x:player.position.x,z:player.position.z,exit:arena.exit||EXIT}))return;touch.reset();keys.clear();keyboardDash=false;exitOpen=false;gate.visible=false;$('#exit-room').hidden=true;$('#toast').textContent='';if(stage===4){if(finalBossAhead())enterAustin();else nextJourney();}else{stage++;wave();}}
function enemyBolt(pos,kind,frost=false){
 const g=new THREE.Group();g.position.set(pos.x,.65,pos.z);scene.add(g);const boss=kind==='boss';
 const core=new THREE.Mesh(boss?enemyGeos.bossCore:enemyGeos.boltCore,frost?mats.frostBolt:boss?mats.bossBolt:mats.enemyBolt);g.add(core);
 const halo=new THREE.Mesh(boss?enemyGeos.bossHalo:enemyGeos.boltHalo,boss?mats.bossHalo:mats.enemyHalo);halo.rotation.x=-Math.PI/2;g.add(halo);
 if(boss)for(let i=0;i<4;i++){const out=new V(Math.cos(i*Math.PI/2),0,Math.sin(i*Math.PI/2));const spike=new THREE.Mesh(enemyGeos.bossSpike,mats.bossBolt);spike.quaternion.setFromUnitVectors(new V(0,1,0),out);spike.position.copy(out).multiplyScalar(.36);g.add(spike);}
 return g;
}
function turretBolt(pos,dir,spec){const start=pos.clone().addScaledVector(dir,1.1);const ob=enemyBolt(start,'turret',spec.frost);enemyShots.push({ob,dir:dir.clone(),life:4.5,bounces:spec.bounces,speed:TURRET.boltSpeed*difficulty(cycle,region).projectileSpeed,damage:TURRET.boltDamage,age:0,origin:pos.clone(),pierce:spec.pierce,recall:spec.recall,frost:spec.frost,burst:spec.burst,gravity:spec.gravity});}
function endEnemyShot(p){
 if(p.burst){vfx.explosion(p.ob.position,'burst',1.6,true);if(!p.struck&&Math.hypot(p.ob.position.x-player.position.x,p.ob.position.z-player.position.z)<1.6)hitPlayer(12);}
 if(p.gravity){if(pulls.length>=4)pulls.shift();pulls.push({pos:p.ob.position.clone().setY(0),life:1.4,pulse:0});}
}
function bossBolt(pos,dir,bounces,laws=[],damageScale=1){const start=pos.clone().addScaledVector(dir,1.25);const ob=enemyBolt(start,'boss',laws.includes('frost'));enemyShots.push({boss:true,ob,dir,life:5,bounces,speed:6.8*difficulty(cycle,region).projectileSpeed,damage:18*damageScale,age:0,origin:pos.clone(),pierce:true,recall:laws.includes('recall'),frost:laws.includes('frost')});}

function burst(pos,color,n=12){vfx.burst(pos,color,n);}
function line(a,b){vfx.arc(a,b);audio.play('chain');}
// 룬: 변이가 남기는 바닥 표식. 숫자를 묶어 두어 화면이 무거워지지 않게 한다.
function dropRune(pos,tint='rune'){
 if(runes.length>=RUNE.max){const old=runes.shift();release(old.ob);}
 const ob=ring(scene,RUNE.radius,tint==='burst'?0xffb066:0xb98cff);ob.material.opacity=.5;
 ob.position.set(pos.x,.13,pos.z);
 runes.push({ob,pos:new V(pos.x,0,pos.z),life:RUNE.life,tick:0,tint});
}
function clearRunes(){for(const r of runes)release(r.ob);runes.length=0;}
function updateRunes(dt){
 for(let i=runes.length-1;i>=0;i--){
  const r=runes[i];r.life-=dt;r.tick-=dt;
  if(r.life<=0){release(r.ob);runes.splice(i,1);continue;}
  r.ob.material.opacity=.18+.32*Math.min(1,r.life/RUNE.life);
  r.ob.rotation.y+=dt*1.6;
  if(r.tick<=0){
   r.tick=RUNE.every;
   for(const e of enemies)if(!e.dead&&Math.hypot(e.g.position.x-r.pos.x,e.g.position.z-r.pos.z)<RUNE.radius)
    damageEnemy(e,RUNE.damage*damageScale(levels)*runPowerScale(runBonuses)*gardenPower(),false);
  }
 }
}
// 변이 폭발: 이미 있는 피해 처리와 효과를 그대로 쓴다.
function mutationBurst(pos,radius,damage){
 vfx.pulse(pos,'burst',radius,.3);vfx.burst(pos,'burst',14);
 for(const e of enemies)if(!e.dead&&Math.hypot(e.g.position.x-pos.x,e.g.position.z-pos.z)<radius)
  damageEnemy(e,damage*damageScale(levels)*runPowerScale(runBonuses)*gardenPower(),false);
}
function damageEnemy(e,amount,chaining=true,critical=false,meta=null){
 if(e.state==='recover')amount*=1.35;amount*=e.takenScale||1;
 if(isBoss(e)&&!e.elite&&!e.dead)chargeActive(activeGauge,bossCharge(amount,e.maxHp));
 if(e.type==='austin'){if(damageAustin(e,amount)<=0)return;}else if(e.type==='alwaysbeginner'){if(damageAlwaysBeginner(e,amount)<=0)return;}else e.hp-=amount;
 e.hit=.14;
 if(meta?.direction){const side=meta.direction.x+meta.direction.z*.34;e.impactSide=Math.abs(side)>.04?Math.sign(side):1;}
 vfx.impact(e.g.position,critical?'amber':chaining?([...chosen][0]||'seed'):'chain',critical);audio.play('hit',{intensity:critical?1.3:isBoss(e)?1.15:.75});
 if(chaining&&chosen.has('chain')){
  const reach=chainRange(mutations),falloff=chainFalloff(mutations);let nearby=enemies.filter(o=>o!==e&&o.hp>0&&o.g.position.distanceTo(e.g.position)<reach).sort((a,b)=>a.g.position.distanceTo(e.g.position)-b.g.position.distanceTo(e.g.position)).slice(0,LS.chainTargets);
  for(const [index,o] of nearby.entries()){line(e.g.position,o.g.position);const spot=o.g.position.clone();damageEnemy(o,amount*(isBoss(o)?.325:falloff),false);if(hasMutation(mutations,'chain','rune'))dropRune(spot);if(hasMutation(mutations,'chain','burst')&&index===nearby.length-1)mutationBurst(spot,TUNE.chainBurst.radius,TUNE.chainBurst.damage);}
 }
 if(e.hp<=0&&!e.dead){e.dead=true;kills++;choiceKills++;chargeActive(activeGauge,killCharge(e));vfx.impact(e.g.position,'amber',true);enemyDown(e);}
}
function enemyDown(e){
 score+=killPoints(e,cycle);
 if(!isBoss(e)){
  if(e.type==='turret'&&(inventory.tonic||0)<ITEMS.tonic.max){
   const result=turretPotionDrop(turretPotionDry,rng);turretPotionDry=result.dryKills;
   if(result.drop&&addItem(inventory,'tonic',1)){itemBarKey='';vfx.pulse(e.g.position,'seed',1.25,.35);vfx.burst(e.g.position,'seed',18,1.15);audio.play('pickup');$('#toast').textContent=`포탑의 핵에서 ${ITEMS.tonic.name}을 찾았습니다 · 생명력 +${ITEMS.tonic.heal}`;}
  }
  releaseEnemy(e);return;
 }
 // A duo is one encounter: only the last standing warden grants the room reward.
 const wardenType=e.type==='warden'||e.type==='act2warden',stageWarden=wardenType&&stage===4&&!inAustinRoom(),lastWarden=stageWarden&&!enemies.some(o=>o!==e&&(o.type==='warden'||o.type==='act2warden')&&!o.dead&&!o.escort);
 // A boss falls over a short beat instead of vanishing, and the reward waits for it, so a choice screen never seems to erase the boss.
 const main=e.type==='austin'||e.type==='alwaysbeginner'||(stageWarden?lastWarden:!e.elite);fallen.push({e,t:0,hold:main});
 cameraShake=Math.max(cameraShake,main?.4:.22);vfx.pulse(e.g.position,'amber',main?3.2:2,.6);vfx.burst(e.g.position,'amber',main?40:24,2);audio.play('bossDefeat');
 // Austin carries the main item reward. Turrets can only yield the smaller healing potion.
 if(main){if(e.type==='austin'||e.type==='alwaysbeginner')relicRewardPending=true;invuln=Math.max(invuln,1.6);for(const p of enemyShots)release(p.ob);enemyShots=[];}
 if(e.type==='austin'){austinsDefeated++;if(developerRun){$('#toast').textContent=`${AUSTIN.name} 격파 · 개발자 실험 기록은 저장되지 않습니다`;}else{const firstTitle=!seedTitle.isUnlocked(),wallet=earnCoins(runStorage,200);remember('bosses','austin');const mastery=grantAustinMastery(garden,rng);garden=mastery.garden;writeGarden(runStorage,garden);refreshGardenEffects();const got=austinDrops(rng,inventory).filter(id=>addItem(inventory,id,1)).map(id=>ITEMS[id].name);itemBarKey='';$('#toast').textContent=`${AUSTIN.name} 격파! · +200원 (보유 ${wallet.coins}원) · ${got.length?got.join(' · ')+' 획득':'물약 가방이 가득 찼습니다'} · ${masteryLine(mastery)}${firstTitle?` · 칭호 '${AUSTIN_TITLE}' (${AUSTIN_TITLE_PERK.text})`:''}`;}}
 else if(e.type==='alwaysbeginner'){austinsDefeated++;if(developerRun){$('#toast').textContent=`${ALWAYS_BEGINNER.name} 격파 · 개발자 실험 기록은 저장되지 않습니다`;}else{const wallet=earnCoins(runStorage,300);remember('bosses','alwaysbeginner');const got=austinDrops(rng,inventory).filter(id=>addItem(inventory,id,1)).map(id=>ITEMS[id].name);itemBarKey='';$('#toast').textContent=`${ALWAYS_BEGINNER.name} 격파! · +300원 (보유 ${wallet.coins}원) · ${got.length?got.join(' · ')+' 획득':'물약 가방이 가득 찼습니다'} · 2막 기록에 남았습니다`;}}
 else if(main){wardensDefeated++;if(developerRun){$('#toast').textContent=`${e.config?.name||'문지기'} 격파 · 개발자 실험 기록은 저장되지 않습니다`;}else{remember('bosses','warden');const wallet=earnCoins(runStorage,50);if(!dashState.id)dashRewardPending=true;$('#toast').textContent=`${e.config?.name||'문지기'} 격파! · +50원 (보유 ${wallet.coins}원)${wardensDefeated===1?' · 뿌리에 새로운 움직임이 깨어납니다':austinAhead()?' · 무언가 째깍거리는 소리가 들립니다':''}`;}}
 else $('#toast').textContent=stageWarden?'쌍문지기 한 명 격파 · 남은 문지기를 쓰러뜨리세요':'정예 문지기 격파!';
}
function updateFallen(dt,time){for(let i=fallen.length-1;i>=0;i--){const f=fallen[i],e=f.e;f.t+=dt;const k=Math.min(1,f.t/1.3);e.hit=Math.floor(f.t*14)%2?.14:0;e.updateArt?.(time);e.g.position.y=-k*k*1.1;e.g.scale.setScalar(1-k*.3);if(Math.floor(f.t/.18)!==Math.floor((f.t-dt)/.18))vfx.burst(e.g.position,'amber',10,1.2);if(f.t>=1.3){releaseEnemy(e);fallen.splice(i,1);}}}
function austinBolt(pos,dir,spec){const g=new THREE.Group();g.position.set(pos.x+dir.x*1.3,.65,pos.z+dir.z*1.3);scene.add(g);const core=new THREE.Mesh(austinGeo.core,mats.austinBolt);core.castShadow=false;g.add(core);const halo=new THREE.Mesh(austinGeo.halo,mats.austinHalo);halo.rotation.x=-Math.PI/2;halo.castShadow=false;g.add(halo);enemyShots.push({boss:true,ob:g,dir:dir.clone(),life:4,bounces:0,speed:spec.speed,damage:spec.damage,age:0,origin:pos.clone(),pierce:true});}
function stadiumBolt(pos,dir,spec){const ob=new THREE.Mesh(stadiumBallGeo,mats.stadiumBall);ob.position.set(pos.x+dir.x*1.05,.65,pos.z+dir.z*1.05);ob.castShadow=false;scene.add(ob);enemyShots.push({boss:Boolean(spec.boss),ob,dir:dir.clone(),life:4.8,bounces:0,speed:spec.speed,damage:spec.damage,curve:spec.curve||0,age:0,origin:pos.clone(),pierce:Boolean(spec.pierce)});}
// ---------------- active (F) ----------------
function useActive(){
 if(mode!=='playing'||paused)return;
 const plan=startActive(activeGauge,heldForms);
 if(!plan){const s=activeState(heldForms);$('#toast').textContent=s.state==='LOCKED'?'궁극기는 완성 진화나 단독 진화를 얻으면 열립니다':activeGauge.plan?'궁극기가 이미 발동 중입니다':activeGauge.cooldown>0?`궁극기 안정화 중 · ${Math.ceil(activeGauge.cooldown)}초`:`궁극기 게이지 ${Math.floor(activeGauge.value)}/${ACTIVE.max} · 적을 처치해 채우세요`;return;}
 const aim=cachedTarget&&!cachedTarget.dead?cachedTarget.g.position.clone().sub(player.position).setY(0).normalize():lastMove.clone();
 for(const id of plan.forms)for(const combat of combatsOf(id))combat.surge(plan.seconds,{aim});
 activeVfx.start(plan,player.position);announceActive($('#active-cinematic'),plan);
 audio.play(ultimateAudioEvent(plan.archetype),{intensity:plan.state==='OVERDRIVE'?1.25:1});
 const colors=plan.forms.flatMap(id=>FORMS[id]?.requires||[]);for(const [i,id] of colors.entries())vfx.burst(player.position,id,10,1.1,i*.055);
 vfx.burst(player.position,colors[0]||'seed',plan.state==='OVERDRIVE'?54:38,1.65);
 cameraShake=Math.max(cameraShake,plan.state==='OVERDRIVE'?.7:.42);
 cameraFeel.triggerUltimate(plan.state==='OVERDRIVE');
 // The activation title already names the signature(s); a second toast line only covered the arena.
 $('#toast').textContent='';
}
function updateActive(dt){
 const done=tickActive(activeGauge,dt,gardenCooldown());
 activeVfx.update(dt,player.position);
 if(done){for(const id of done.forms)for(const combat of combatsOf(id))combat.calm();activeVfx.finish(done,player.position);announceFinale($('#active-cinematic'),done);if(done.finale){audio.play('finale');if(!roomCleared)overdriveBlast(done.finale,done.finale.radius,done.finale.damage,true);}}
 for(let i=finaleEchoes.length-1;i>=0;i--){const echo=finaleEchoes[i];echo.t-=dt;if(echo.t>0)continue;finaleEchoes.splice(i,1);if(!roomCleared)overdriveBlast(echo.finale,echo.radius,echo.damage,false);}
}
// The overdrive's closing blast: the union of both evolutions' law tags decides what it does (see actives.js overdriveFinale).
function overdriveBlast(f,radius,damage,first){
 const center=player.position.clone().setY(0),scale=damageScale(levels)*runPowerScale(runBonuses)*gardenPower(),flatDistance=e=>Math.hypot(e.g.position.x-center.x,e.g.position.z-center.z);
 if(f.pull)for(const e of enemies){if(e.dead||isBoss(e)||e.type==='turret')continue;const d=center.clone().sub(e.g.position).setY(0),len=d.length();if(len<radius*1.6&&len>.7){e.g.position.addScaledVector(d.normalize(),Math.min(len-.7,f.pull));collide(e.g.position,.65);}}
 vfx.explosion(center,f.tags?.includes('EXPLOSION')?'burst':f.slow?'frost':'seed',radius,first);cameraShake=Math.max(cameraShake,first?.72:.3);
 for(const e of [...enemies]){
  if(e.dead||flatDistance(e)>radius+(isBoss(e)?.9:0))continue;
  for(let h=0;h<f.hits&&!e.dead;h++)damageEnemy(e,damage*scale*(h?.5:1)*(isBoss(e)?f.bossScale:1),false);
  if(f.slow&&!e.dead)e.slow=Math.max(e.slow||0,f.slow);
 }
 if(first&&f.arcs){
  const outside=enemies.filter(e=>!e.dead&&flatDistance(e)>radius&&flatDistance(e)<9).sort((a,b)=>flatDistance(a)-flatDistance(b)).slice(0,f.arcs);
  for(const e of outside){line(player.position,e.g.position);damageEnemy(e,damage*.5*scale,false);}
 }
 if(first&&f.rifts){
  const far=enemies.filter(e=>!e.dead&&flatDistance(e)>radius*.65).sort((a,b)=>flatDistance(b)-flatDistance(a)).slice(0,f.rifts);
  for(const e of far){vfx.portal(center,e.g.position);vfx.explosion(e.g.position,'portal',1.15);damageEnemy(e,damage*.55*scale*(isBoss(e)?f.bossScale:1),false);}
 }
 if(first)for(let i=1;i<=f.echoes;i++)finaleEchoes.push({t:.45*i,finale:f,radius:radius*.8,damage:damage*f.echoScale});
}
// 1·2·3 keys press the matching choice on whatever choice screen is open (laws, fusions, solo evolutions, relics).
const CHOICE_GROUPS=['[data-choice]','[data-form]','[data-second]','[data-solo]','[data-dash-evolution]','[data-relic]','[data-keep],[data-replace]'];
function choiceButtons(){
 const overlay=$('#overlay');if(!overlay||overlay.hidden||paused)return [];
 for(const group of CHOICE_GROUPS){const list=[...overlay.querySelectorAll(group)].filter(b=>!b.disabled&&b.offsetParent!==null);if(list.length)return list;}
 return [];
}
function pickChoice(n){const button=choiceButtons()[n-1];if(!button)return false;button.click();return true;}
// Small number badges on the first three choices, so the keys are discoverable.
new MutationObserver(()=>{for(const [i,b] of choiceButtons().slice(0,3).entries())if(!b.querySelector(':scope>.pick-key'))b.insertAdjacentHTML('afterbegin',`<kbd class="pick-key" aria-hidden="true">${i+1}</kbd>`);}).observe($('#overlay'),{childList:true,subtree:true});
function useInventoryItem(id){
 if(mode!=='playing'||paused||potionCD>0||!id)return;
 const item=ITEMS[id],r=useItem(inventory,id,{hp,maxHp:maxPlayerHp()});
 if(!r.ok){$('#toast').textContent=r.reason==='full'?'생명력이 가득합니다 · 물약은 아껴 두세요':r.reason==='passive'?`${item.name}은 쓰러질 때 저절로 쓰입니다`:r.reason==='empty'?`${item?item.name:'물약'}이 없습니다`:'';return;}
 selectedItem=id;potionCD=.6;itemBarKey='';
 if(r.kind==='heal'){hp=r.hp;vfx.pulse(player.position,'seed',1.6,.5);vfx.burst(player.position,'seed',24,1.4);audio.play('pickup');$('#toast').textContent=`${item.name} · 생명력 +${displayHp(r.healed)}`;}
 else if(r.kind==='haste'){hasteTime=r.seconds;vfx.pulse(player.position,'orbit',1.8,.5);vfx.burst(player.position,'orbit',20,1.6);$('#toast').textContent=`${item.name} · ${r.seconds}초 동안 빨라집니다`;}
 else if(r.kind==='shell'){shellTime=r.seconds;vfx.pulse(player.position,'reflect',1.4,.6);vfx.burst(player.position,'reflect',22,1.2);$('#toast').textContent=`${item.name} · ${r.seconds}초 동안 피해를 막습니다`;}
 if(exitOpen){if(stage===4)saveAfterBoss();else saveBoundary(stage+1);}
}
function projectile(pos,dir,fragment=false,ignoreEnemy=null){const tint=fragment?'split':([...chosen][0]||'seed'),ob=new THREE.Mesh(projectileGeometry(projectileGeos,tint),mats['shot-'+tint]);ob.position.set(pos.x,.67,pos.z);ob.castShadow=false;const critChance=totalCritChance(),critical=critChance>0&&rng()<critChance,[sx,sy,sz]=THEMES[combatTheme].projectileScale,k=(fragment?.62:1)*(critical?1.16:1);ob.scale.set(sx*k,sy*k,sz*k);ob.rotation.y=Math.atan2(dir.x,dir.z);scene.add(ob);const shot={ob,dir:dir.clone(),life:2.3,bounces:0,fragment,ignoreEnemy,tint,critical,age:0,returning:false,hitSet:new Set(),hits:0,trailTime:0,trailPos:ob.position.clone()};shots.push(shot);return shot;}
function hitPlayer(amount){if(labSafe||invuln>0||shellTime>0||mode!=='playing')return;amount*=difficulty(cycle,region).damage;const before=hp;hp=Math.max(0,hp-amount);runDamageTaken+=before-hp;invuln=.65;burst(player.position,'amber',16);cameraShake=.18;audio.play('hurt');
 if(hp<=0){
  // A sprout stands the seed back up once, with a moment to breathe and no shots already in the air.
  const revive=tryRevive(inventory);
  if(revive){hp=revive.hp;invuln=Math.max(invuln,revive.guard);for(const p of enemyShots)release(p.ob);enemyShots=[];itemBarKey='';cameraShake=.32;vfx.pulse(player.position,'seed',2.8,.8);vfx.burst(player.position,'seed',44,2.2);$('#toast').textContent=`${ITEMS.sprout.name}이 돋았다 · 생명력 ${revive.hp}으로 다시 일어났습니다`;return;}
  if(!developerRun)clearCheckpoint(actStore());mode='dead';showEnd(false);
 }
}
let cameraShake=0;const aimRing=ring(scene,.22,0xa4f8db);aimRing.material.opacity=.5;aimRing.visible=false;
function collide(pos,r=.4){constrainToArena(pos,r,arena);for(let o of obstacles){let dx=pos.x-o.x,dz=pos.z-o.z,wx=o.w/2+r,wz=o.d/2+r;if(Math.abs(dx)<wx&&Math.abs(dz)<wz){if(wx-Math.abs(dx)<wz-Math.abs(dz))pos.x=o.x+Math.sign(dx||1)*wx;else pos.z=o.z+Math.sign(dz||1)*wz;}}constrainToArena(pos,r,arena);}
function runBonusCard(id){const bonus=RUN_BONUSES[id],level=id==='heal'?0:runBonuses[id]||0,step=id==='shot'?4:3,next=id==='heal'?`현재 생명력 ${Math.ceil(hp)} / ${Math.ceil(maxPlayerHp())}`:`누적 ${level*step}% → ${(level+1)*step}% · 최대 5단계`;return `<button class="run-bonus-card" data-run-bonus="${id}" style="--bonus-color:${bonus.color}"><span aria-hidden="true">${bonus.icon}</span><div><small>★ 2% 희귀 보너스</small><strong>${bonus.name}</strong><p>${bonus.desc} · ${next}</p></div></button>`;}
function cardChoice(mid=false,fixedOffer=null){
 touch.reset();keys.clear();keyboardDash=false;mode='cards';
 const guide=guideTarget&&profile.forms.includes(guideTarget)?FORMS[guideTarget].requires.find(id=>!levels.has(id)):null;
 const readyFusions=eligibleForms(chosen).filter(canTakeEvolution).map(f=>f.id);
 let offered=fixedOffer||offerChoices(levels,{guide:guide||gardenGuideLaw(),forms:heldForms,weights:gardenFx.lawWeights,freshBonus:gardenFx.freshBonus,fusions:readyFusions});
 if(!fixedOffer)offered=withMutationOffer(offered,{levels,mutations,gardenLaws:gardenFx.mutationLaws,random:rng});
 // 단추로 먼저 합치고 돌아온 경우, 이미 합친 조합 카드는 뺀다(눌러도 아무 일 없는 카드가 남지 않게).
 if(fixedOffer)offered=offered.filter(id=>{const uid=offeredFusion(id);return !uid||canFuse(levels,uid);});
 if(!offered.length){mode='playing';if(roomCleared)openExit();return;}
 if(runBonusOffer===null)runBonusOffer=rareRunBonusOffers(runBonuses,{hp,maxHp:maxPlayerHp(),choicesTaken,random:rng});
 const smallGrowth=runBonusOffer;
 $('#overlay').hidden=false;$('#overlay').innerHTML=`<p>${mid?'처치 게이지 가득':inAustinRoom()?'오스틴 격파 보상':'문지기 격파 보상'} · 슬롯 ${slotsUsed(levels,heldForms)}/${SLOT_CAP}</p><h2>${offered.some(id=>offeredFusion(id))?'합칠까, 더 깊게 갈까'
   :slotsUsed(levels,heldForms)>=SLOT_CAP?'법칙을 더 깊게':chosen.size?'어떤 씨앗으로 자랄까요':'첫 법칙이 깨어납니다'}</h2><p>${slotsUsed(levels,heldForms)>=SLOT_CAP?'슬롯이 가득 찼습니다 · 합치면 칸이 비고, 합치지 않으면 끝없이 강화합니다':'슬롯 '+SLOT_CAP+'개를 채운 뒤에는 강화만 합니다'} · 다음 선택까지 ${killsForChoice(choicesTaken)} 처치</p><div class="build-preview">${[...chosen].map(id=>`<span class="build-law">${lawArt(id)}${LAWS[id].name} Lv.${levelOf(levels,id)}</span>`).concat([...heldForms].map(([f,l])=>`<span class="build-law build-form">${formArt(f)}${FORMS[f].name} Lv.${l}</span>`)).join('<span class="build-link">◇</span>')||'아직 이름 없는 시드'}</div><div class="cards">${offered.map(id=>{const mut=parseMutationChoice(id);if(mut)return `<button class="card mutation-card" data-choice="${id}" style="--law-color:#${LAWS[mut.law].color.toString(16).padStart(6,'0')}">${lawArt(mut.law,'card-art')}<em class="mut-badge">${mut.badge}</em><strong>${mut.name}</strong><p>${mut.lawName} 변이 · ${mut.kindName}</p><small>${mut.desc}</small><span class="synergy">법칙은 그대로, 성격만 바뀝니다</span></button>`;const uid=offeredFusion(id);if(uid){const f=FORMS[uid],lv=fusionLevel(levels,uid),parts=f.requires.map(law=>LAWS[law].name+' Lv.'+levelOf(levels,law)).join(' + ');return `<button class="card fusion-card" data-choice="${id}" style="--law-color:#9ce8b0">${formArt(uid,'card-art')}<strong>${f.name} Lv.${lv}</strong><p>조합</p><small>${parts} → 한 칸</small><span class="synergy">${f.strength} · 칸이 하나 비어 새 법칙이 다시 나옵니다</span></button>`;}const fid=offeredForm(id);if(fid){const f=FORMS[fid],lv=heldForms.get(fid);return `<button class="card form-upgrade" data-choice="${id}" style="--law-color:#e8c26a">${formArt(fid,'card-art')}<strong>${f.name} Lv.${lv+1}</strong><p>진화 강화</p><small>${formUpgradeLine(fid,lv)}</small><span class="synergy">${f.strength}</span></button>`;}const held=chosen.has(id),v=LAWS[id];return `<button class="card" data-choice="${id}" style="--law-color:#${v.color.toString(16).padStart(6,'0')}">${lawArt(id,'card-art')}<strong>${v.name} Lv.${held?levelOf(levels,id)+1:1}</strong><p>${held?'강화 Lv.'+levelOf(levels,id)+' → '+(levelOf(levels,id)+1):'새로운 법칙'}</p><small>${held?upgradeLine(levels,id)+' · 모든 탄 피해 +10%':v.desc}</small><span class="synergy">${formLawHint(id,chosen)||synergyHint(id,[...chosen])}</span></button>`;}).join('')}</div>${smallGrowth.length?`<div class="run-bonus-choice"><small>★ 희귀 보너스 등장! 하나를 받고, 법칙도 이어서 고릅니다</small><div>${smallGrowth.map(runBonusCard).join('')}</div></div>`:''}`;
 // 칸이 차면 새 법칙이 나오지 않으니, 못 얻을 법칙을 가리키는 대신 지금 합칠 수 있는 것을 알려 준다.
 const goals=slotsUsed(levels,heldForms)>=SLOT_CAP&&readyFusions.length
  ?'지금 합칠 수 있어요: '+readyFusions.slice(0,3).map(id=>FORMS[id].name).join(' · ')
   :Object.values(FIRST_FORMS).filter(f=>f.requires.filter(id=>chosen.has(id)).length===1).slice(0,4).map(f=>`${f.name}까지 ${LAWS[f.requires.find(id=>!chosen.has(id))].name}`).join(' · ');
 $('#overlay').insertAdjacentHTML('beforeend',`<div class="form-progress">${heldForms.size?'보유 진화: '+[...heldForms].map(([f,l])=>FORMS[f].name+' Lv.'+l).join(', ')+' · ':''}${goals||'법칙 두 개를 맞추면 완성 진화 · 발견 '+profile.forms.length+'/'+Object.keys(FORMS).length}${orbitCore(heldForms,FORMS)?' · 공전 진화는 한 종류만 보유 가능':''}</div><div class="form-actions">${rerollUnlocked(profile)&&!rerollUsed?'<button class="primary" id="reroll-laws">선택지 새로고침 · 이번 여정 1회</button>':''}${eligibleForms(chosen).filter(canTakeEvolution).length?'<button class="primary" id="change-form">합칠 수 있는 진화 보기</button>':''}${secondFusionOptions(heldForms).length?'<button class="primary" id="change-second">재융합 보기</button>':''}${soloReady(levels).filter(canTakeEvolution).length?'<button class="primary" id="change-solo">단독 진화 보기</button>':''}${awakenOptions(heldForms).filter(awakenable).length?'<button class="primary" id="change-awaken">각성 진화 보기</button>':''}</div>`);
 if($('#reroll-laws'))$('#reroll-laws').onclick=()=>{if(mode!=='cards'||rerollUsed)return;rerollUsed=true;const checkpoint=readCheckpoint(actStore());if(checkpoint)writeCheckpoint(actStore(),{...checkpoint,rerollUsed:true});cardChoice(mid);};
 if($('#change-form'))$('#change-form').onclick=()=>offerForm(true,()=>cardChoice(mid,offered));
 if($('#change-second'))$('#change-second').onclick=()=>offerSecondFusion(()=>cardChoice(mid,offered),true);
 if($('#change-solo'))$('#change-solo').onclick=()=>offerSolo(()=>cardChoice(mid,offered),true);
 if($('#change-awaken'))$('#change-awaken').onclick=()=>offerAwaken(()=>cardChoice(mid,offered),true);
  document.querySelectorAll('[data-run-bonus]').forEach(button=>button.onclick=()=>{if(mode!=='cards')return;const id=button.dataset.runBonus,result=applyRunBonus(runBonuses,id,{hp,maxHp:maxPlayerHp()});if(!result.ok)return;runBonuses=result.state;hp=result.hp;runBonusOffer=[];const bonus=RUN_BONUSES[id];vfx.pulse(player.position,id==='heal'?'seed':id==='move'?'orbit':id==='shot'?'split':'burst',1.7,.45);vfx.burst(player.position,id==='heal'?'seed':id==='move'?'orbit':id==='shot'?'split':'burst',20,1.35);audio.play('pickup');const bonusChoice=button.closest('.run-bonus-choice');bonusChoice.classList.add('received');bonusChoice.innerHTML='<small>✓ 희귀 보너스를 받았어요 · 이제 법칙을 하나 더 고르세요</small>';$('#toast').textContent=id==='heal'?`${bonus.name} · 생명력 +${displayHp(result.healed)} · 법칙도 고르세요`:`${bonus.name} · ${result.level}/5단계 · 법칙도 고르세요`;});
 document.querySelectorAll('[data-choice]').forEach(button=>button.onclick=()=>{if(mode!=='cards')return;const id=button.dataset.choice;
  const mut=parseMutationChoice(id);
  if(mut){if(!applyMutation(mutations,mut.id))return;syncLaws();updateFormLabel();vfx.evolution(player.position,mut.law);finishChoice();$('#toast').textContent=`${mut.badge} ${mut.name} · ${mut.desc}`;return;}
  const fuseId=offeredFusion(id);
   if(fuseId){if(!fuse(levels,heldForms,fuseId))return;remember('forms',fuseId);syncLaws();syncForms();growth.select(effectiveLaws(),mutated);vfx.evolution(player.position,FORMS[fuseId].requires[0]);audio.play('fusion');if(!offerSecondFusion())finishChoice();$('#toast').textContent=`${FORMS[fuseId].name} Lv.${heldForms.get(fuseId)} · 두 법칙이 한 칸으로 합쳐졌습니다`;return;}
  if(!chooseLaw(levels,id,heldForms))return;syncLaws();const fid=offeredForm(id);if(fid){syncForms();vfx.evolution(player.position,FORMS[fid].requires[0]);finishChoice();$('#toast').textContent=`${FORMS[fid].name} Lv.${heldForms.get(fid)}`;return;}beginEvolution(id);});
}

function updateFormLabel(){const core=orbitCore(heldForms,FORMS);$('#form-label').textContent=[...[...heldForms].map(([f,l])=>FORMS[f].name+' Lv.'+l+(isOrbitEvolution(f)&&f!==core?' (공전 대기)':'')),...[...chosen].map(id=>LAW_PRESENTATION[id].name+' Lv.'+levelOf(levels,id)+(mutationLabel(mutations,id)?' '+mutationLabel(mutations,id):''))].join(' · ')||'아직 이름 없는 씨드';}
function beginEvolution(id){
  syncForms(true);
  touch.reset();mode='evolving';evolutionTime=0;keyboardDash=false;keys.clear();player.userData.dashTime=0;player.visible=true;playerMotion.reset();
  for(const p of [...shots,...enemyShots,...effects])release(p.ob);shots=[];enemyShots=[];effects=[];
  $('#overlay').hidden=true;$('#evolution').hidden=false;
  $('#evolution-title').textContent=LAW_PRESENTATION[id].name+' Lv.'+levelOf(levels,id);
  $('#evolution-hint').textContent=LAW_PRESENTATION[id].hint;
  growth.select(effectiveLaws(),mutated);updateFormLabel();vfx.clear();vfx.evolution(player.position,id);audio.play('evolve');
}
function startGame(){if(gameplayPaused()){showSeasonPause();return;}if(mode==='ready'&&!maintenanceOn)restart();}
function authMessage(error){
 const code=String(error?.code||error?.message||'');
 const tag=code.replace(/^auth\//,'').replace(/[^a-zA-Z0-9_/-]+/g,'-').slice(0,56);
 if(code.includes('UNREGISTERED_ON_API_CONSOLE')||code.includes('DEVELOPER_ERROR')||(account.native&&/(^|[^0-9])10([^0-9]|$)/.test(code)))return '앱 서명과 Google 로그인 연결을 확인해야 해요. 관리자에게 이 화면을 보여 주세요. (AUTH-ANDROID)';
 if(code.includes('popup-closed')||code.includes('canceled')||code.includes('cancelled'))return '로그인이 취소되었어요. 계정을 고른 직후 이 문구가 나왔다면 화면을 캡처해 주세요. (AUTH-CANCELED)';
 if(code.includes('credential-already-in-use')||code.includes('account-exists'))return '이미 다른 방식으로 연결된 계정이에요. 먼저 그 계정으로 로그인해 주세요.';
 if(code.includes('network'))return '인터넷 연결을 확인한 뒤 다시 시도해 주세요.';
 if(code.includes('unauthorized-domain'))return '이 웹 주소가 Firebase 로그인 허용 목록에 없어요. 관리자에게 알려 주세요. (AUTH-DOMAIN)';
 if(code.includes('NO_CREDENTIAL')||code.includes('NoCredential'))return '이 기기에서 사용할 Google 계정을 찾지 못했어요. Play 스토어에 로그인한 계정을 확인해 주세요. (AUTH-NO-ACCOUNT)';
 if(code.includes('provider')||code.includes('configuration-not-found')||code.includes('DEVELOPER_ERROR'))return '이 로그인 방식의 마지막 설정을 준비하고 있어요.';
 return `로그인을 마치지 못했어요. 화면을 캡처해 관리자에게 보내 주세요.${tag?` (AUTH ${tag})`:''}`;
}
function showBetaLock(message='',success=false){
 revealApp();
 mode='beta-lock';touch.reset();keys.clear();$('#overlay').classList.remove('ranking-overlay','garden-mode');$('#overlay').classList.add('intro','menu-screen');$('#overlay').hidden=false;
 const user=account.user(),linked=user&&!user.isAnonymous&&user.email;
 const accountHint=linked
  ?`<div class="account-status beta-account"><strong>${escapeHtml(user.email)}</strong><span>${adminMode?'관리자 계정 확인 완료':betaTesterMode?'베타테스터 계정 확인 완료':'등록된 베타테스터 계정이 아니에요. 다른 계정으로 바꿔 주세요.'}</span></div>`
  :'';
 $('#overlay').innerHTML=`<div class="menu-panel beta-lock-panel"><p class="eyebrow">SEED · CLOSED BETA</p><div class="account-mark">♧</div><h2>${BETA_NOTICE.title}</h2><p class="account-copy">${BETA_NOTICE.body}</p>
  ${accountHint}<button id="beta-admin" class="account-button beta-admin-entry"><b>✦</b><span><strong>${linked?'다른 Google 계정으로 바꾸기':'베타테스터·개발자 로그인'}</strong><small>${linked?'현재 계정에서 로그아웃한 뒤 계정을 다시 선택합니다':'등록된 Google 계정으로 PC 웹 플레이'}</small></span></button>
  <div class="beta-test-path"><strong>이미 등록된 테스터인가요?</strong><span>테스트에 등록된 Google 계정으로 열어야 설치할 수 있어요.</span><a class="account-button beta-install" href="${BETA_TEST_URL}" target="_blank" rel="noopener"><span><b>Google Play 테스트 참여·설치</b><small>공식 비공개 테스트 링크</small></span></a></div>
  <div class="beta-divider"><span>새로 신청하기</span></div>
  <label class="beta-email"><strong>Google Play 계정 이메일</strong><input id="beta-email" type="email" inputmode="email" autocomplete="email" maxlength="254" placeholder="example@gmail.com" value="${escapeHtml(linked?user.email:'')}"><small>Android 기기의 Play 스토어에서 사용하는 계정을 적어 주세요.</small></label>
  <label class="beta-check"><input id="beta-android" type="checkbox"><span><strong>사용 가능한 Android 기기가 있어요</strong><small>Android 휴대전화 또는 태블릿에서 테스트합니다.</small></span></label>
  <label class="beta-check"><input id="beta-consent" type="checkbox"><span><strong>이메일 수집·이용에 동의해요</strong><small>비공개 테스트 등록과 안내 목적으로만 사용합니다.</small></span></label>
  <button id="beta-submit" class="account-button beta-submit"><span><b>베타테스터 신청 보내기</b><small>관리자 등록 완료 안내를 받은 뒤 설치할 수 있어요</small></span></button>
  <p id="beta-message" class="account-error ${success?'success':''}" role="status">${escapeHtml(message)}</p>
  <p class="account-note">${BETA_NOTICE.detail} <a href="${import.meta.env.BASE_URL}privacy.html" target="_blank" rel="noopener">개인정보 처리방침</a></p>
  <a class="menu-item small-item" href="https://kukuma1004.github.io/jpmath-lab/games/"><strong>게임 소식으로 돌아가기</strong></a></div>`;
 const busy=state=>document.querySelectorAll('#beta-email,#beta-submit').forEach(control=>control.disabled=state);
 if($('#beta-submit'))$('#beta-submit').onclick=async()=>{busy(true);try{const email=$('#beta-email').value;await submitBetaApplication({account,email,android:$('#beta-android').checked,consent:$('#beta-consent').checked});showBetaLock(`${email.trim().toLowerCase()} 신청을 받았어요. 관리자 등록 완료 안내를 받은 뒤 위 공식 링크에서 참여해 주세요.`,true);}catch(error){const node=$('#beta-message');if(node)node.textContent=betaApplicationMessage(error);busy(false);}};
 $('#beta-admin').onclick=async()=>{if(linked){await account.signOut();cloud.signOutCleanup();}showAccount();};
}
// A tab can stay open for hours without reloading. Recheck the live gate while it
// is running so an already-open game cannot keep playing after the web closes.
// Native closed-beta builds and the administrator account remain available.
async function enforceCurrentWebAccess(){
 if(account.native||import.meta.env.DEV)return false;
 if(webAccessCheck)return webAccessCheck;
 webAccessCheck=(async()=>{
  seasonStatus=await loadSeasonStatus({enabled:true});
  await refreshAccessMode();
  if(adminMode||betaTesterMode){
   // A tester can be added while this installed/web tab is already showing the
   // closed-beta gate. Permission was refreshed correctly, but the old gate
   // stayed on screen until another manual navigation. Leave it immediately.
   if(mode==='beta-lock'||mode==='season-pause')showEntry();
   return false;
  }
  const betaLocked=publicWebBetaLocked(),seasonPaused=gameplayPaused();
  if(!betaLocked&&!seasonPaused)return false;
  saveLeaveState();cloud.syncNow().catch(()=>null);touch.reset();keys.clear();audio.setPaused(true);
  if(betaLocked){if(mode!=='beta-lock')showBetaLock();}
  else if(mode!=='season-pause')showSeasonPause();
  return true;
 })().finally(()=>{webAccessCheck=null;});
 return webAccessCheck;
}
function showEntry(){
 revealApp();
 if(publicWebBetaLocked()&&!adminMode&&!betaTesterMode){showBetaLock();return;}
 if(gameplayPaused()){showSeasonPause();return;}
 if(localAdminLab||account.user())showIntro();else showAccount();
}
function showSeasonPause(){
 revealApp();mode='season-pause';touch.reset();keys.clear();$('#overlay').classList.remove('ranking-overlay','garden-mode');$('#overlay').classList.add('intro','menu-screen');$('#overlay').hidden=false;
 const user=account.user(),accountLine=user&&!user.isAnonymous?`현재 계정 · ${escapeHtml(account.label())}`:'관리자만 계정 로그인 후 플레이할 수 있어요';
 $('#overlay').innerHTML=`<div class="menu-panel season-pause-panel"><p class="eyebrow">SEED · BETA SEASON ${escapeHtml(seasonStatus.season)}</p><div class="season-seal" aria-hidden="true">♧</div><h2>${escapeHtml(seasonStatus.title)}</h2><p class="season-pause-copy">${escapeHtml(seasonStatus.body)}</p><div class="season-pause-status"><strong>플레이 일시 중지</strong><span>${escapeHtml(seasonStatus.detail)}</span></div><div class="menu-list"><button id="season-archive" class="primary menu-item"><strong>시즌 1.0 최종 기록</strong><small>첫 정원 명예의 전당 보기</small></button><button id="season-account" class="menu-item"><strong>관리자 로그인</strong><small>${accountLine}</small></button><a class="menu-item small-item" href="https://kukuma1004.github.io/jpmath-lab/games/"><strong>게임 소식으로 돌아가기</strong></a></div><p class="account-note">시즌 1.0 기록과 각자의 저장 데이터는 지워지지 않습니다.</p></div>`;
 $('#season-archive').onclick=()=>showRanking('archive');$('#season-account').onclick=()=>showAccount();
}
function showAccount(error=''){
 mode='ready';touch.reset();keys.clear();$('#overlay').classList.remove('ranking-overlay','garden-mode');$('#overlay').classList.add('intro','menu-screen');$('#overlay').hidden=false;
 const user=account.user(),linked=user&&!user.isAnonymous,appleOff=!account.appleConfigured,accountProfile=readAccountProfile(runStorage),badgeLine=accountBadgeLine(accountProfile),titleInfo=seedTitle.state();
 const permanentStats=[titleInfo.moveSpeedBonus?`이속 +${Math.round(titleInfo.moveSpeedBonus*1000)/10}%`:'',titleInfo.shotSpeedBonus?`탄속 +${Math.round(titleInfo.shotSpeedBonus*1000)/10}%`:''].filter(Boolean).join(' · ')||'보유 효과 없음';
 const titleProfile=titleInfo.titles.length?`<section class="title-profile"><div class="title-profile-head"><strong>칭호</strong><span>영구 ${permanentStats}</span></div><div class="title-options">${titleInfo.titles.map(title=>`<button type="button" class="title-option ${title.id===titleInfo.equipped?'equipped':''}" data-equip-title="${escapeHtml(title.id)}" aria-pressed="${title.id===titleInfo.equipped}"><span><strong>${escapeHtml(title.name)}</strong><small>${escapeHtml(title.perk)}</small></span><em>${title.id===titleInfo.equipped?'장착 중':'장착'}</em></button>`).join('')}</div><small>장착은 씨앗 위 표시만 바꾸며, 획득한 업적 효과는 항상 유지됩니다.</small></section>`:`<section class="title-profile empty"><strong>칭호</strong><small>도감 20개 발견이나 특별한 기록으로 칭호를 얻을 수 있어요.</small></section>`;
 $('#overlay').innerHTML=`<div class="menu-panel account-panel"><p class="eyebrow">SEED · ACCOUNT</p><div class="account-mark">♧</div><h2>${linked?'나의 씨앗':'어떻게 시작할까요'}</h2>
  <p class="account-copy">${linked?'이 계정으로 SEED의 기록을 이어갑니다.':'Google 또는 Apple 계정으로 시작할 수 있어요. 먼저 둘러보고 싶으면 게스트로 시작하세요.'}</p>
  ${user?`<div class="account-status"><strong>${escapeHtml(account.label())}</strong><span>${user.isAnonymous?'나중에 Google 또는 Apple 계정에 연결하면 현재 기록을 그대로 지킬 수 있어요.':'이 UID로 여러 기기의 기록을 이어갑니다.'}</span>${badgeLine?`<em class="account-badge">✦ ${escapeHtml(badgeLine)}</em>`:''}<small>UID ${escapeHtml(user.uid)}</small></div>`:''}
  ${titleProfile}
  <div class="account-buttons">
   ${!linked?`<button id="account-google" class="account-button google"><b>G</b><span><b>Google로 계속하기</b></span></button>
   <button id="account-apple" class="account-button apple" ${appleOff?'disabled':''}><b>●</b><span><b>Apple로 계속하기</b>${appleOff?'<small>iPhone 출시 준비 중</small>':''}</span></button>`:''}
   ${!user&&!gameplayPaused()?'<button id="account-guest" class="account-button"><span><b>게스트로 시작</b><small>익명 UID에 진행을 저장합니다</small></span></button>':''}
   ${user?`<button id="account-continue" class="account-button"><span><b>${gameplayPaused()?'접속 권한 확인':'게임으로 돌아가기'}</b></span></button>`:''}
  </div>
  <p id="account-error" class="account-error" role="alert">${escapeHtml(error)}</p>
  <p class="account-note">계정 로그인은 랭킹의 플레이어를 구분하고 앞으로 여러 기기에서 이어하기 위한 기반으로 사용합니다. 실명은 랭킹에 표시하지 않아요.</p>
  ${linked?'<button id="account-signout" class="menu-item small-item">로그아웃</button>':''}</div>`;
 const busy=async action=>{document.querySelectorAll('.account-button').forEach(button=>button.disabled=true);try{await action();const result=await cloud.retry();await refreshAccessMode();if(result?.changed){location.reload();return;}showEntry();}catch(err){showAccount(authMessage(err));}};
 if($('#account-google'))$('#account-google').onclick=()=>busy(account.signInWithGoogle);
 if($('#account-apple'))$('#account-apple').onclick=()=>busy(account.signInWithApple);
 if($('#account-guest'))$('#account-guest').onclick=()=>busy(account.guest);
 if($('#account-continue'))$('#account-continue').onclick=async()=>{await refreshAccessMode();showEntry();};
 document.querySelectorAll('[data-equip-title]').forEach(button=>button.onclick=()=>{const id=button.dataset.equipTitle;if(!seedTitle.state().titles.some(title=>title.id===id))return;writeAccountProfile(runStorage,{...readAccountProfile(runStorage),equippedTitle:id});seedTitle.setEquipped(id);showAccount();});
 if($('#account-signout'))$('#account-signout').onclick=async()=>{try{await cloud.syncNow().catch(()=>null);await account.signOut();cloud.signOutCleanup();location.reload();}catch(err){showAccount(authMessage(err));}};
}
function showIntro(){developerRun=false;labSafe=false;const labButton=$('#developer-lab-fab');if(labButton)labButton.hidden=true;if(gameplayPaused()){showSeasonPause();return;}audio.setScene('garden');region='garden';startRegion='garden';pauseBuild.hide();activeVfx.clear();cancelActive(activeGauge);activeReadyAnnounced=false;$('#active-cinematic').hidden=true;$('#active-cinematic').innerHTML='';austinRoom=false;drawRoom();$('#evolution').hidden=true;player.visible=true;paused=false;keys.clear();touch.reset();$('#pause').textContent='Ⅱ';$('#toast').textContent='';$('#boss-hud').hidden=true;$('#exit-room').hidden=true;gate.visible=false;
 mode='ready';refreshGardenEffects();ensureGardenScene();gardenSelection=null;if(gardenScene)gardenScene.select(-1);
 if(maintenanceOn){showMaintenance();return;}
 // 점검으로 잠시 닫았던 미안함: 다시 싹 1개와 작은 물약 3개를 보관함에 한 번만 넣는다.
 const cloudRewards=cloud.consumeRewardNotice();
 const betaBoosterGift=betaTesterMode?grantGift(runStorage,BETA_BOOSTER_GIFT,'sprout',1):{granted:false};
 const sproutGift=grantGift(runStorage,SORRY_GIFT,'sprout',1);
 const tonicGift=grantGift(runStorage,SORRY_TONIC_GIFT,'tonic',3);
 if(cloudRewards.length){showCloudGift(cloudRewards);return;}
 if(betaBoosterGift.granted){showBetaBoosterGift();return;}
 if(sproutGift.granted||tonicGift.granted){showGift();return;}
 $('#overlay').classList.remove('ranking-overlay','garden-mode','developer-mode');$('#overlay').classList.add('intro','menu-screen');$('#overlay').hidden=false;
 const seeds=Object.values(garden.seeds).reduce((sum,n)=>sum+n,0),planted=garden.plots.filter(Boolean).length,shop=readShop(runStorage);
 // 하던 사람에게만 새 소식 점을 띄운다(처음 온 사람에게는 붙이지 않는다).
 const newsDot=hasUnseenNotes(runStorage,{firstVisit:!profile.forms.length&&!garden.harvests});
 const gardenLine=planted?`플레이 흔적으로 자란 식물 ${planted}/${garden.plots.length}`:seeds?`심을 씨앗 ${seeds}개`:garden.fragments?`씨앗 조각 ${garden.fragments}개`:'여정의 흔적을 식물로 키워 보세요';
 $('#overlay').innerHTML=`<div class="menu-panel">
  <p class="eyebrow">SEED</p><h2>잠든 정원</h2>
  ${nameFieldHtml()}
  <div class="menu-list">
   <button id="go-dungeon" class="primary menu-item"><strong>던전으로</strong><small>문지기 너머로 가는 길</small></button>
   ${adminMode?'<button id="developer-lab" class="menu-item developer-entry"><strong>개발자 실험실</strong><small>조합 선택 · 문지기 · 오스틴 바로 확인</small></button>':''}
   <button id="go-garden" class="menu-item"><strong>나의 정원</strong><small>${escapeHtml(gardenLine)}</small></button>
   <button id="go-shop" class="menu-item"><strong>출발 상점</strong><small>${shop.coins}원 · 보관함 ${itemCounts(shop.stash)||'비어 있음'}</small></button>
   <button id="ranking-link" class="menu-item"><strong>명예의 전당</strong><small>모두의 기록</small></button>
   <button id="discoveries" class="menu-item"><strong>도감</strong><small>${adminMode?'관리자 전체 공개 · '+Object.keys(FORMS).length+'/'+Object.keys(FORMS).length:profile.forms.length+'/'+Object.keys(FORMS).length+' 발견'}</small></button>
   <button id="account-link" class="menu-item"><strong>계정</strong><small>${escapeHtml(account.label())}</small></button>
   <button id="patch-notes" class="menu-item"><strong>새 소식${newsDot?'<i class="news-dot" aria-label="새 소식"></i>':''}</strong><small>${PATCH_NOTES[0].date} · ${escapeHtml(PATCH_NOTES[0].title)}</small></button>
  </div>
  <p class="legal-note"><a href="https://kukuma1004.github.io/seed-web/privacy.html" target="_blank" rel="noopener">개인정보 처리방침</a> · <a href="https://kukuma1004.github.io/seed-web/terms.html" target="_blank" rel="noopener">랭킹 이용규칙</a> · 광고와 결제가 없는 게임입니다</p>
 </div>`;
 bindNameField();
 online.flush().catch(()=>0);
 $('#go-dungeon').onclick=showDungeon;
 if($('#developer-lab'))$('#developer-lab').onclick=showDeveloperLab;
 $('#go-garden').onclick=()=>showGarden(showIntro);
 $('#go-shop').onclick=()=>showShop(showIntro);
 $('#patch-notes').onclick=showNotes;
 $('#ranking-link').onclick=()=>showRanking('online');
 $('#account-link').onclick=()=>showAccount();
 $('#discoveries').onclick=()=>{mode='discoveries';const bookProfile=adminMode?{...profile,forms:Object.keys(FORMS)}:profile;$('#overlay').classList.remove('intro','menu-screen');$('#overlay').innerHTML=discoveryBook(bookProfile,seedTitle.state());$('#close-discoveries').onclick=showIntro;};
 updateFormLabel();
}
function startDeveloperEncounter(target){
 if(!adminMode)return showIntro();
 developerRun=true;startRegion=target.startsWith('act2')?ACT2_REGION:'garden';restart();
 if(developerForm&&Object.hasOwn(FORMS,developerForm)){heldForms.set(developerForm,5);syncForms(true);growth.select(effectiveLaws(),mutated);}
 if(target==='warden'){stage=4;cycle=0;wardensDefeated=0;austinsDefeated=0;austinRoom=false;wave();}
 else if(target==='duo'){stage=4;cycle=5;wardensDefeated=5;austinsDefeated=1;austinRoom=false;wave();}
 else if(target==='austin'){stage=4;cycle=4;wardensDefeated=5;austinsDefeated=0;austinRoom=true;wave();}
 else if(target==='act2field'){stage=1;cycle=0;wardensDefeated=0;austinsDefeated=0;austinRoom=false;wave();}
 else if(target==='act2warden'){stage=4;cycle=3;wardensDefeated=3;austinsDefeated=0;austinRoom=false;wave();}
 else if(target==='act2boss'){stage=4;cycle=4;wardensDefeated=5;austinsDefeated=0;austinRoom=true;wave();}
 if($('#developer-active')?.checked){activeGauge.value=ACTIVE.max;activeGauge.cooldown=0;}
 labSafe=Boolean($('#developer-safe')?.checked);const labButton=$('#developer-lab-fab');if(labButton)labButton.hidden=false;
 $('#toast').textContent=`개발자 실험 · ${developerForm?FORMS[developerForm].name:'기본 씨앗'} · 기록과 보상은 저장되지 않습니다`;
}
function showDeveloperLab(){
 if(!adminMode)return showIntro();
 mode='developer-lab';touch.reset();keys.clear();keyboardDash=false;paused=false;
 $('#overlay').classList.remove('ranking-overlay','garden-mode');$('#overlay').classList.add('intro','menu-screen','developer-mode');$('#overlay').hidden=false;
 const groups=[
  ['기본 · 융합', [['','기본 씨앗'],...Object.entries(FORMS).filter(([,form])=>!form.solo&&!form.awakened).map(([id,form])=>[id,form.name])]],
  ['단독 진화',Object.entries(FORMS).filter(([,form])=>form.solo).map(([id,form])=>[id,form.name])],
  ['완성 진화',Object.entries(FORMS).filter(([,form])=>form.awakened&&!form.twin).map(([id,form])=>[id,form.name])],
  ['쌍둥이 각성',Object.entries(FORMS).filter(([,form])=>form.twin).map(([id,form])=>[id,form.name])]
 ];
 const buildButton=([id,name])=>`<button type="button" data-developer-form="${id}" aria-pressed="${developerForm===id}">${id?formArt(id,'developer-form-art'):'<span class="developer-seed-mark">♧</span>'}<strong>${escapeHtml(name)}</strong></button>`;
 $('#overlay').innerHTML=`<div class="menu-panel developer-panel"><p class="eyebrow">SEED · ADMIN ONLY</p><h2>전투 실험실</h2><p class="developer-note">현재 공개된 진화 ${Object.keys(FORMS).length}종을 골라 원하는 전투에 바로 들어갑니다. 실험 중 점수·보상·도감·정원·저장은 남지 않아요.</p><h3>확인할 진화</h3><div class="developer-form-groups">${groups.map(([label,options],index)=>`<details ${options.some(([id])=>id===developerForm)||(!developerForm&&index===0)?'open':''}><summary>${label} <small>${options.length}</small></summary><div class="developer-builds">${options.map(buildButton).join('')}</div></details>`).join('')}</div><div class="developer-toggles"><label><input id="developer-active" type="checkbox" checked> 궁극기 즉시 충전</label><label><input id="developer-safe" type="checkbox"> 피해 받지 않기</label></div><h3>바로 이동</h3><div class="developer-actions"><button data-developer-target="room"><strong>일반 방</strong><small>움직임과 탄환 확인</small></button><button data-developer-target="warden"><strong>문지기</strong><small>단독 문지기 전투</small></button><button data-developer-target="duo"><strong>쌍문지기</strong><small>두 종류 동시 전투</small></button><button data-developer-target="austin"><strong>오스틴</strong><small>1막 진짜 보스</small></button><button data-developer-target="act2field"><strong>2막 전장 기믹</strong><small>베이스 활주 · 패스 포탑</small></button><button data-developer-target="act2warden"><strong>2막 연계 문지기</strong><small>A → B 60% 난입</small></button><button data-developer-target="act2boss"><strong>항상초심</strong><small>2막 최종 보스</small></button></div><div class="developer-footer"><button id="developer-choice">법칙 선택 카드 바로 보기</button><button id="developer-back">메인으로</button></div></div>`;
 const select=id=>{developerForm=id;document.querySelectorAll('[data-developer-form]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.developerForm===id)));};
 document.querySelectorAll('[data-developer-form]').forEach(button=>button.onclick=()=>select(button.dataset.developerForm));
 document.querySelectorAll('[data-developer-target]').forEach(button=>button.onclick=()=>startDeveloperEncounter(button.dataset.developerTarget));
 $('#developer-choice').onclick=()=>{developerForm='';startDeveloperEncounter('room');cardChoice(false,['reflect','split','chain']);};
 $('#developer-back').onclick=showIntro;
}
// 보관함·가져가기를 한 줄로("작은 물약 3 · 다시 싹 1"). 비어 있으면 빈 문자열.
const itemCounts=counts=>STASH_ORDER.filter(id=>counts?.[id]).map(id=>`${ITEMS[id].name} ${counts[id]}`).join(' · ');
function showShop(back=showIntro,message=''){
 mode='ready';touch.reset();keys.clear();
 $('#overlay').classList.remove('ranking-overlay','garden-mode');$('#overlay').classList.add('intro','menu-screen');$('#overlay').hidden=false;
 const shop=readShop(runStorage),oneDisabled=shop.coins<SHOP_PRICES[1]||shop.stash.tonic>=SHOP_STOCK_MAX,bundleDisabled=shop.coins<SHOP_PRICES[10]||shop.stash.tonic+10>SHOP_STOCK_MAX;
 // 보관함: 가진 물약마다 새 여정에 가져갈 개수를 − + 로 고른다. 많이 있어도 0개로 두면 안 가져간다.
 const stashRows=STASH_ORDER.filter(id=>id==='tonic'||shop.stash[id]).map(id=>{
  const most=Math.min(shop.stash[id],id==='tonic'?TONIC_CARRY_MAX:ITEMS[id].max);
  return `<li class="stash-row">${itemArt(id)}<div class="stash-name"><strong>${ITEMS[id].name}</strong><small>보관 ${shop.stash[id]}개${id==='tonic'?` · 출발 최대 ${TONIC_CARRY_MAX}개`:id==='sprout'?' · 한 판에 1개':''}</small></div>`
   +`<div class="stash-carry" role="group" aria-label="${ITEMS[id].name} 가져갈 개수"><button type="button" data-carry="${id}" data-step="-1" ${shop.carry[id]<=0?'disabled':''} aria-label="하나 덜">−</button><b>${shop.carry[id]}</b><button type="button" data-carry="${id}" data-step="1" ${shop.carry[id]>=most?'disabled':''} aria-label="하나 더">+</button></div></li>`;
 }).join('');
 $('#overlay').innerHTML=`<div class="menu-panel shop-panel"><p class="eyebrow">SEED · 출발 준비</p><h2>물약 상점</h2>
  <div class="shop-wallet"><span>보유 게임 머니</span><strong>${shop.coins.toLocaleString('ko-KR')}원</strong></div>
  <div class="shop-columns">
  <section class="shop-product"><div class="shop-product-art">${itemArt('tonic')}<div><h3>${ITEMS.tonic.name}</h3><p>생명력 +${ITEMS.tonic.heal} · 보관 최대 ${SHOP_STOCK_MAX}개</p></div></div>
   <div class="shop-buy"><button id="buy-one" ${oneDisabled?'disabled':''}><strong>1개 · ${SHOP_PRICES[1].toLocaleString('ko-KR')}원</strong><small>낱개 구매</small></button><button id="buy-ten" ${bundleDisabled?'disabled':''}><strong>10개 · ${SHOP_PRICES[10].toLocaleString('ko-KR')}원</strong><small>25% 할인 묶음</small></button></div>
   <p class="shop-message" aria-live="polite">${escapeHtml(message)}</p></section>
  <section class="shop-stash"><h3>보관함 · 새 여정에 가져갈 개수</h3><ul>${stashRows}</ul>
   <p class="stash-note">새 여정을 시작할 때만 가방에 들어가요 · 이어하기에는 안 들어가요</p></section>
  </div>
  <p class="shop-note">문지기 +50원 · 오스틴 +200원 · 게임 안에서 얻는 재화이며 실제 결제가 아닙니다.</p>
  <button id="shop-back" class="menu-item small-item">돌아가기</button></div>`;
 const buy=count=>{const result=buyTonics(runStorage,count);showShop(back,result.ok?`${result.count}개를 보관함에 담았어요 · ${result.price.toLocaleString('ko-KR')}원 사용`:result.reason==='full'?`보관함에는 작은 물약을 ${SHOP_STOCK_MAX}개까지 둘 수 있어요`:'게임 머니가 부족해요');};
 $('#buy-one').onclick=()=>buy(1);$('#buy-ten').onclick=()=>buy(10);$('#shop-back').onclick=back;
 document.querySelectorAll('[data-carry]').forEach(button=>button.onclick=()=>{const id=button.dataset.carry;setCarry(runStorage,id,readShop(runStorage).carry[id]+Number(button.dataset.step));showShop(back);});
}
// 점검 사과 선물 안내. 한 번만 뜬다(grantGift가 같은 선물을 다시 주지 않는다).
const BETA_BOOSTER_GIFT='beta-booster-sprout-20260918';
const SORRY_GIFT='sorry-20260917';
const SORRY_TONIC_GIFT='sorry-tonics-20260917';
function showBetaBoosterGift(){
 mode='gift';touch.reset();keys.clear();
 $('#overlay').classList.remove('ranking-overlay','garden-mode','developer-mode');$('#overlay').classList.add('intro','menu-screen');$('#overlay').hidden=false;
 $('#overlay').innerHTML=`<div class="menu-panel gift-panel"><p class="eyebrow">SEED · BETA BOOSTER</p><h2>함께 시험해 줘서 고마워요</h2>
  <div class="gift-item">${itemArt('sprout')}<div><strong>부활 물약 · ${ITEMS.sprout.name} 1개</strong><small>${escapeHtml(ITEMS.sprout.desc)}</small></div></div>
  <p class="gift-line">베타테스터 전용 부스터를 상점 보관함에 넣어 두었어요. 계정마다 한 번만 받을 수 있습니다.</p>
  <p class="gift-line">새 여정을 시작할 때 가져가며, 쓰러지는 순간 자동으로 사용됩니다.</p>
  <div class="gift-actions"><button id="gift-shop" class="menu-item"><strong>상점 보관함 보기</strong></button><button id="gift-ok" class="menu-item primary"><strong>확인</strong></button></div></div>`;
 $('#gift-ok').onclick=showIntro;$('#gift-shop').onclick=()=>showShop(showIntro);
}
function showGift(){
 mode='gift';touch.reset();keys.clear();
 $('#overlay').classList.remove('ranking-overlay','garden-mode');$('#overlay').classList.add('intro','menu-screen');$('#overlay').hidden=false;
 $('#overlay').innerHTML=`<div class="menu-panel gift-panel"><p class="eyebrow">SEED · 선물</p><h2>기다려 줘서 고마워요</h2>
  <div class="gift-item">${itemArt('sprout')}<div><strong>부활 물약 · ${ITEMS.sprout.name} 1개</strong><small>${escapeHtml(ITEMS.sprout.desc)}</small></div></div>
  <div class="gift-item">${itemArt('tonic')}<div><strong>${ITEMS.tonic.name} 3개</strong><small>${escapeHtml(ITEMS.tonic.desc)}</small></div></div>
  <p class="gift-line">점검하느라 게임을 잠시 닫아서 미안해요. 선물 4개를 상점 보관함에 넣어 두었어요.</p>
  <p class="gift-line">새 여정을 시작할 때 가져가요. 아껴 두고 싶으면 보관함에서 가져갈 개수를 0으로 바꾸면 돼요.</p>
  <div class="gift-actions"><button id="gift-shop" class="menu-item"><strong>상점 보관함 보기</strong></button><button id="gift-ok" class="menu-item primary"><strong>확인</strong></button></div></div>`;
 $('#gift-ok').onclick=showIntro;$('#gift-shop').onclick=()=>showShop(showIntro);
}
function showCloudGift(grants){
 mode='gift';touch.reset();keys.clear();
 $('#overlay').classList.remove('ranking-overlay','garden-mode');$('#overlay').classList.add('intro','menu-screen');$('#overlay').hidden=false;
 const rewards=grants.flatMap(grant=>{
  const r=grant.rewards||{},lines=[];
  if(r.jp)lines.push(`<li><strong>${Number(r.jp).toLocaleString('ko-KR')} JP</strong><small>상점에서 사용할 수 있어요</small></li>`);
  for(const id of r.badges||[])lines.push(`<li><strong>✦ ${escapeHtml(BADGES[id]?.name||id)}</strong><small>${escapeHtml(BADGES[id]?.description||'계정에 남는 특별 배지')}</small></li>`);
  for(const [id,n] of Object.entries(r.seeds||{}))lines.push(`<li><strong>${escapeHtml(SEEDS[id]?.name||id)} ×${n}</strong><small>나의 정원 씨앗 상자에 들어갔어요</small></li>`);
  for(const id of r.skins||[])lines.push(`<li><strong>스킨 · ${escapeHtml(id)}</strong><small>계정 보관함에 등록되었어요</small></li>`);
  for(const [id,n] of Object.entries(r.items||{}))lines.push(`<li><strong>${escapeHtml(ITEMS[id]?.name||id)} ×${n}</strong><small>출발 상점 보관함에 들어갔어요</small></li>`);
  return lines;
 }).join('');
 $('#overlay').innerHTML=`<div class="menu-panel gift-panel cloud-gift"><p class="eyebrow">SEED · 계정 선물</p><div class="account-mark">✦</div><h2>${escapeHtml(grants[0]?.label||'새 선물이 도착했어요')}</h2><ul class="cloud-reward-list">${rewards}</ul><p class="gift-line">이 선물은 계정 UID에 한 번만 지급되고 다른 기기에서도 이어집니다.</p><div class="gift-actions"><button id="gift-garden" class="menu-item"><strong>정원 보기</strong></button><button id="gift-ok" class="menu-item primary"><strong>확인</strong></button></div></div>`;
 $('#gift-ok').onclick=showIntro;$('#gift-garden').onclick=()=>showGarden(showIntro);
}
// 이름은 여러 화면에서 같은 모양으로 쓴다.
// 거른 별명을 쳤다가 다른 화면으로 넘어가도, 새 칸에 이유가 남게 한다.
let nameRejected=false;
function nameFieldHtml(){
 return `<form id="name-form" class="name-field"><label for="player-name">내 이름</label><input id="player-name" class="${nameRejected?'need':''}" maxlength="${NAME_MAX}" autocomplete="off" enterkeyhint="go" placeholder="${nameRejected?'그 별명은 쓸 수 없어요':'별명 (최대 '+NAME_MAX+'자)'}" value="${escapeHtml(playerName)}"><small id="name-hint">${nameRejected?'그 별명은 쓸 수 없어요 · 친구가 봐도 괜찮은 별명으로 바꿔 주세요':'이 이름으로 모두의 랭킹에 올라가요 · 실명 대신 별명'}</small><label class="ranking-consent"><input id="ranking-terms" type="checkbox" ${rankingTermsAccepted(runStorage)?'checked':''}><span><a href="${import.meta.env.BASE_URL}terms.html" target="_blank" rel="noopener">명예의 전당 이용규칙</a>에 동의</span></label></form>`;
}
function bindNameField(onSubmit=null){
 const input=$('#player-name');if(!input)return;
 input.oninput=()=>{input.classList.remove('need');const n=cleanName(input.value);
  if(n&&isBadName(n)){nameRejected=true;playerName=saveName(runStorage,'');input.classList.add('need');setText($('#name-hint'),'그 별명은 쓸 수 없어요 · 친구가 봐도 괜찮은 별명으로 바꿔 주세요');return;}
  if(n){nameRejected=false;playerName=saveName(runStorage,n);setText($('#name-hint'),'이 이름으로 모두의 랭킹에 올라가요 · 실명 대신 별명');}};
 // 칸을 벗어날 때 거른 별명이 남아 있으면 비우고 칸 안에 이유를 적는다(휴대폰에서는 안내 줄이 숨겨진다).
 input.onchange=()=>{const n=cleanName(input.value);if(n&&isBadName(n)){input.value='';input.placeholder='그 별명은 쓸 수 없어요';}};
 const consent=$('#ranking-terms');if(consent)consent.onchange=()=>setRankingTermsAccepted(runStorage,consent.checked);
 $('#name-form').onsubmit=ev=>{ev.preventDefault();if(!requireName())return;if(onSubmit)onSubmit();else showDungeon();};
}
// 던전 화면: 어떤 여정을 시작할지 고른다(스테이지를 직접 고르지는 않는다).
function showDungeon(){
 mode='ready';touch.reset();keys.clear();
 $('#overlay').classList.remove('ranking-overlay','garden-mode');$('#overlay').classList.add('intro','menu-screen');$('#overlay').hidden=false;
 const saved=readCheckpoint(actStore());
 const act2Ready=act2Available()&&act2Unlocked(profile);
 const saved2=act2Ready?readCheckpoint(actStorage(runStorage,2)):null;
 const where=saved?`여정 ${saved.cycle+1} · ${saved.mode==='crossroads'?'다음 여정':saved.mode==='austin'?AUSTIN.name:(saved.stage+1)+'번째 방'}`:'',shop=readShop(runStorage);
 $('#overlay').innerHTML=`<div class="menu-panel dungeon-panel">
  <p class="eyebrow">SEED · 던전</p><h2>어디로 갈까요</h2>
  ${nameFieldHtml()}
  <div class="menu-list">
   ${saved?`<button id="continue-run" class="primary menu-item"><strong>이어하기</strong><small>${escapeHtml(where)}</small></button>`:''}
   <button id="start-game" class="${saved?'':'primary '}menu-item"><strong>${saved?'새 씨앗으로 시작':'잠든 정원 · 1막'}</strong><small>${saved?'저장된 도전을 교체합니다':'첫 방부터 문지기까지'}</small></button>
   <button id="open-shop" class="menu-item"><strong>출발 상점</strong><small>새 여정에 가져갈 물약 · ${itemCounts(shop.carry)||'없음'}</small></button>
   ${act2Ready?`<button id="start-act2" class="menu-item act2-button"><strong>${ACT2_NAME}</strong><small>${saved2?`야간 경기장 · 여정 ${saved2.cycle+1} · ${saved2.stage+1}번째 방 이어하기`:'야간 경기장 · 기본 씨앗으로 새로 시작'}</small></button>${saved2?'<button id="new-act2" class="menu-item small-item">2막 새로 시작</button>':''}`
    :`<p class="act2-lock">${act2Available()?'오스틴을 쓰러뜨리면 2막 · 야간 경기장이 열려요':'2막 · 야간 경기장은 준비 중이에요'}</p>`}
   <button id="back-menu" class="menu-item small-item">돌아가기</button>
  </div>
  <p class="dungeon-hint">${touch.enabled?'왼손 스틱으로 이동 · ◇ 버튼으로 회피 · 공격은 자동':'W A S D 이동 · SPACE 회피 · 공격은 자동'}</p>
 </div>`;
 bindNameField(()=>{const s=readCheckpoint(actStore());$('#overlay').classList.remove('intro','menu-screen');if(s)restart(s);else startGame();});
 const enter=(run,region2=false)=>{if(!requireName())return;startRegion=region2?ACT2_REGION:'garden';$('#overlay').classList.remove('intro','menu-screen');if(run)restart(run);else startGame();};
 if($('#continue-run'))$('#continue-run').onclick=()=>enter(saved);
 $('#start-game').onclick=()=>enter(null);
 $('#open-shop').onclick=()=>showShop(showDungeon);
 if($('#start-act2'))$('#start-act2').onclick=()=>enter(saved2||null,true);
 if($('#new-act2'))$('#new-act2').onclick=()=>enter(null,true);
 $('#back-menu').onclick=showIntro;
}
// Every visible ranking line shows its build. Legacy runs explain why they cannot.
function rankBuild(entry,place){
 const b=parseBuild(entry.build);
 if(!b)return '<div class="rank-build none">이전 버전 기록 · 조합 미저장</div>';
 const boss=`<span class="rank-boss">${bossText(entry.build)}</span>`;
 const chips=[...b.forms.map(([id,lv])=>`<span class="rank-chip form">${formArt(id,'rank-art')}${FORMS[id].name} <i>Lv.${lv}</i></span>`),...b.laws.map(([id,lv])=>`<span class="rank-chip">${lawArt(id,'rank-art')}${LAWS[id].name} <i>Lv.${lv}</i></span>`),b.relic?`<span class="rank-chip relic">${relicArt(b.relic,'rank-art')}유물 ${RELICS[b.relic].name}</span>`:''].join('');
 return `<div class="rank-build" title="${escapeHtml(buildText(entry.build))}">${boss}${chips}</div>`;
}
function rankSafety(entry){
 if(!entry?.uid||entry.uid===online.uid())return '';
 return `<div class="rank-actions"><a href="${escapeHtml(rankingReportMailto(entry))}">신고</a><button type="button" data-block-ranker="${escapeHtml(entry.uid)}">이 사용자 숨기기</button></div>`;
}
function bindRankSafety(){document.querySelectorAll('[data-block-ranker]').forEach(button=>button.onclick=()=>{blockRankingUser(runStorage,button.dataset.blockRanker);button.closest('li')?.remove();$('#toast').textContent='이 사용자의 기록을 내 화면에서 숨겼어요';});}
function rankingBoard(board,mine=null,onlineView=false){
 // Only the top ten are listed. My line appears below only when I am outside them (inside, it is highlighted in the list).
 const shown=onlineView?visibleRanking(board,runStorage):board,shownMine=mine&&shown.includes(mine)?mine:null;
 const rank=shownMine?shown.indexOf(shownMine)+1:0,details=onlineView?(entry,place)=>rankBuild(entry,place)+rankSafety(entry):rankBuild;
 const top=`<section class="ranking-top"><strong>TOP 10</strong>${rankingTable(shown,shownMine,10,details)}</section>`;
 if(rank<=10)return top;
 return top+`<section class="ranking-self"><strong>내 순위</strong>${rankingTable([shownMine],shownMine,1,rankBuild,rank)}</section>`;
}
// 정원 화면: 정원은 3D 장면이 그리고, 오른쪽 상자에서 고른 대상을 다룬다.
let gardenReturn=showIntro;
function selectGardenSpot(hit){
 gardenSelection=hit&&(hit.kind==='plot'||hit.kind==='empty'||hit.kind==='center')?hit:null;
 if(gardenScene)gardenScene.select(gardenSelection&&gardenSelection.kind==='plot'?gardenSelection.index:-1);
 if(mode==='garden')paintGardenPanel();
}
function paintGardenPanel(){
 renderGardenPanel($('#overlay'),{
  garden,selection:gardenSelection,austinDefeated:austinKnown(),
  onChange:next=>{garden=next;writeGarden(runStorage,garden);refreshGardenEffects();ensureGardenScene();
   if(gardenSelection?.kind==='empty'&&garden.plots[gardenSelection.index])gardenSelection={kind:'plot',index:gardenSelection.index};
   if(gardenSelection?.kind==='plot'&&!garden.plots[gardenSelection.index])gardenSelection=null;
   if(gardenScene)gardenScene.select(gardenSelection?.kind==='plot'?gardenSelection.index:-1);
   paintGardenPanel();},
  onSelect:selectGardenSpot,
  onClose:()=>gardenReturn()
 });
}
function showGarden(back=showIntro){
 audio.setScene('garden');
 gardenReturn=back;mode='garden';touch.reset();keys.clear();
 refreshGardenEffects();ensureGardenScene();gardenSelection=null;if(gardenScene)gardenScene.select(-1);
 $('#overlay').hidden=false;$('#overlay').classList.remove('intro','menu-screen','ranking-overlay');$('#overlay').classList.add('garden-mode');
 paintGardenPanel();
}
// 새 소식 화면. 읽으면 점이 사라진다.
function showNotes(){
 mode='notes';touch.reset();keys.clear();markNotesSeen(runStorage);
 $('#overlay').hidden=false;$('#overlay').classList.remove('garden-mode','ranking-overlay');$('#overlay').classList.add('intro','menu-screen');
 $('#overlay').innerHTML=`<div class="menu-panel notes-panel"><p class="eyebrow">SEED · 새 소식</p><h2>무엇이 바뀌었나요</h2>
  <div class="notes-list">${PATCH_NOTES.map((note,index)=>`<section class="note${index?'':' newest'}"><header><strong>${escapeHtml(note.title)}</strong><small>${escapeHtml(note.date)}</small></header><ul>${note.lines.map(line=>`<li>${escapeHtml(line)}</li>`).join('')}</ul></section>`).join('')}</div>
  <button id="notes-back" class="menu-item small-item">돌아가기</button></div>`;
 $('#notes-back').onclick=showIntro;
}
function showRanking(view='online'){
 mode='ranking';$('#overlay').classList.remove('intro','menu-screen','garden-mode');$('#overlay').classList.add('ranking-overlay');const serial=++rankSerial;
 const remote=view==='online'||view==='archive',archive=view==='archive',locked=gameplayPaused();
 const localBoard=readRanking(view==='act2'?actStorage(runStorage,2):runStorage),localMine=localBoard.find(e=>e.name===playerName)||null;
 const tabs=locked?`<button class="primary" data-board="archive" aria-pressed="true">${ARCHIVE_SEASON.name}</button>`:`<button class="primary" data-board="online" aria-pressed="${view==='online'}">${SEASON.name}</button><button class="primary" data-board="archive" aria-pressed="${archive}">${ARCHIVE_SEASON.name}</button><button class="primary" data-board="local" aria-pressed="${view==='local'}">이 기기</button>${act2Available()&&act2Unlocked(profile)?`<button class="primary" data-board="act2" aria-pressed="${view==='act2'}">2막 · 이 기기</button>`:''}`;
 $('#overlay').innerHTML=`<div class="ranking-panel"><p>${archive?'첫 정원에 남은 기록':'가장 멀리 간 씨앗들'}</p><h2>명예의 전당</h2><div class="rank-tabs">${tabs}</div><p id="rank-status" class="form-note">${remote?'불러오는 중…':'상위 10명 · 10위 밖이면 내 순위를 아래에 표시'}</p><div id="rank-board">${!remote?rankingBoard(localBoard,localMine):''}</div></div><button class="primary" id="close-ranking">돌아가기</button>`;
 $('#close-ranking').onclick=locked?showSeasonPause:showIntro;document.querySelectorAll('[data-board]').forEach(b=>b.onclick=()=>showRanking(b.dataset.board));
 if(!remote)return;
 const readBoard=()=>online.top(500,playerName,archive?ARCHIVE_SEASON:SEASON);
 (archive?Promise.resolve():online.flush().catch(()=>0)).then(readBoard).then(board=>{
  if(serial!==rankSerial)return;setText($('#rank-status'),archive?'시즌 1.0 최종 상위 10명 · 기록은 그대로 보관됩니다':'상위 10명 · 10위 밖이면 내 순위를 아래에 표시');
  const mine=board.find(e=>e.uid===online.uid()&&e.name===playerName)||null,box=$('#rank-board');if(box){box.innerHTML=rankingBoard(board,mine,true);bindRankSafety();}
 }).catch(()=>{
  if(serial!==rankSerial)return;const status=$('#rank-status');if(status)status.innerHTML='랭킹 서버에 잠깐 연결하지 못했어요 · <b>모두의 기록은 서버에 그대로 있어요</b><br><button class="primary" id="rank-retry">다시 불러오기</button>';
  const retry=$('#rank-retry');if(retry)retry.onclick=()=>showRanking(view);
 });
}
// Falling ends the run: the score goes to this browser's board at once and to everyone's ranking in the background.
function showEnd(){touch.reset();$('#overlay').classList.remove('intro','menu-screen','garden-mode');activeVfx.clear();cancelActive(activeGauge);$('#active-cinematic').hidden=true;$('#active-cinematic').innerHTML='';$('#item-bar').hidden=true;$('#active-skill').hidden=true;$('#item-status').hidden=true;
 if(developerRun){$('#overlay').hidden=false;$('#overlay').classList.add('intro','menu-screen','developer-mode');$('#overlay').innerHTML='<div class="menu-panel developer-panel developer-end"><p class="eyebrow">SEED · ADMIN ONLY</p><h2>실험 종료</h2><p>점수·보상·도감·정원·저장에는 아무것도 남지 않았습니다.</p><div class="developer-footer"><button id="developer-retry">실험실로</button><button id="developer-end-main">메인으로</button></div></div>';$('#developer-retry').onclick=showDeveloperLab;$('#developer-end-main').onclick=showIntro;return;}
 const serial=++rankSerial,name=playerName||lastName(runStorage),ranked=!localInspection&&!developerRun&&score>0&&Boolean(name);
 const build=buildRecord({levels,forms:heldForms,relic:relics.equipped,wardens:wardensDefeated,austins:austinsDefeated});
 // 정원: 이번 여정이 남긴 씨앗을 넣고, 심어 둔 식물에 성장점을 준다.
 lastHarvest=harvestFromRun({levels:Object.fromEntries(effectiveLevels(levels,heldForms)),forms:Object.fromEntries(heldForms),wardens:wardensDefeated,austins:austinsDefeated,score,kills,journey:cycle+1,elapsed,dashes:runDashes,damageTaken:runDamageTaken});
 garden=growPlants(addHarvest(garden,lastHarvest),lastHarvest.growth);writeGarden(runStorage,garden);refreshGardenEffects();
 // 보낼 값은 판이 끝난 지금 그대로 찍어 둔다. 예전에는 flush()가 끝난 뒤에야 점수·처치를 읽어서,
 // 그 사이에 다음 판을 시작하면 앞뒤가 안 맞는 기록이 랭킹에 올라갔다.
 const entry={name,score,cycle,stage,kills,time:elapsed,build};
 const local=ranked?submitScore(actStore(),entry):null;
 const endBoard=local?.ranking||readRanking(actStore());$('#overlay').hidden=false;$('#overlay').innerHTML=`<p>씨앗은 다시 뿌리를 내립니다</p><h2>잠든 씨앗</h2><div class="final-score"><small>${name?escapeHtml(name)+'의 ':''}최종 점수</small><strong>${formatScore(score)}</strong><span>여정 ${cycle+1} · ${inAustinRoom()?AUSTIN.name:(stage+1)+'번째 방'} · ${kills} 처치 · ${Math.floor(elapsed)}초</span></div><p id="rank-status" class="rank-result">${ranked?(isAct2(region)?'2막 기록 저장 중…':'모두의 랭킹에 올리는 중…'):localInspection?'로컬 검사 · 랭킹에 올리지 않습니다':'점수가 없어서 랭킹에 올리지 않았어요'}</p><div id="rank-board">${rankingBoard(endBoard,local?.entry||endBoard.find(e=>e.name===name)||null)}</div><p class="garden-line">${escapeHtml(harvestLine(lastHarvest))}</p><p class="form-note">발견 ${profile.forms.length}/${Object.keys(FORMS).length}</p><div class="intro-links"><button class="primary" id="restart">다시 시작</button><button class="discovery-link" id="end-garden">정원 보기</button></div>`;
 $('#restart').onclick=showIntro;
 $('#end-garden').onclick=()=>showGarden(showEnd);
 if(!ranked)return;
 if(isAct2(region)){setText($('#rank-status'),'2막 기록은 이 기기에 저장했어요 · 2막 모두의 랭킹은 준비 중이에요');return;}
 if(!betaRankingEligible()){setText($('#rank-status'),'이 기기 기록에는 남았어요 · 베타 시즌 1.1 랭킹은 Android 앱 또는 등록된 PC 웹 테스터의 Google 계정 기록만 받아요');return;}
 // 화면 시계와 실제 시계가 크게 어긋난 판(게임 속도를 바꾸는 도구)은 모두의 랭킹에 올리지 않는다.
 if(!paceTrusted(paceGame,paceReal)){setText($('#rank-status'),'게임 속도가 평소와 달라서 이 판은 모두의 랭킹에 올리지 않았어요 · 이 기기 기록에는 남아요');return;}
 online.flush().catch(()=>0).then(()=>online.submit(entry,500)).then(r=>{
  if(serial!==rankSerial)return;
  const status=$('#rank-status'),box=$('#rank-board');
  if(status)status.innerHTML=r.rank?`모두의 랭킹 <b>${r.rank}위</b>에 올랐어요!`:r.bestRank?`기록했어요 · ${escapeHtml(name)}의 최고 기록은 <b>${r.bestRank}위</b>`:'기록했어요 · 아직 상위권 밖이에요';
  const mine=r.board[(r.rank||r.bestRank)-1]||r.board.find(e=>e.uid===online.uid()&&e.name===name)||null;if(box){box.innerHTML=rankingBoard(r.board,mine,true);bindRankSafety();}
 }).catch(()=>{
  if(serial!==rankSerial)return;
  const status=$('#rank-status');if(status)status.innerHTML='지금은 랭킹 서버에 연결하지 못했어요 · 이 기록은 기기에 보관했다가 다음에 자동으로 올라가요<br>아래는 <b>이 기기</b> 기록이에요 · 모두의 기록은 서버에 그대로 있어요';
 });
}
// 점검 중 화면. 정원은 뒤에 그대로 보이고, 들어갈 단추는 두지 않는다.
function showMaintenance(){
 mode='maintenance';touch.reset();keys.clear();
 $('#overlay').classList.remove('ranking-overlay','garden-mode');$('#overlay').classList.add('intro','menu-screen');$('#overlay').hidden=false;
 $('#overlay').innerHTML=`<div class="menu-panel maintenance-panel"><p class="eyebrow">SEED</p><h2>${escapeHtml(MAINTENANCE.title)}</h2>${MAINTENANCE.lines.map(line=>`<p class="maintenance-line">${escapeHtml(line)}</p>`).join('')}</div>`;
}
function restart(saved=null){if(gameplayPaused()){showSeasonPause();return;}if(maintenanceOn){showMaintenance();return;}const candidate=saved?.version===1?saved:null,act2Blocked=candidate&&playableRegion(candidate.region)!==candidate.region,restore=act2Blocked?null:candidate;region=playableRegion(restore?.region||startRegion);if(touch.enabled)appShell.enterFullscreen();if(!restore&&!developerRun)clearCheckpoint(actStore());heldForms.clear();rerollUsed=restore?.rerollUsed===true;if(restore)guideTarget=profile.forms.includes(restore.guideTarget)?restore.guideTarget:null;promptedForms.clear();clearEscorts();vfx.clear();wells.length=0;orbitGroup.visible=false;touch.reset();for(let e of enemies)releaseEnemy(e);for(const f of fallen)releaseEnemy(f.e);fallen.length=0;for(let p of [...shots,...enemyShots,...effects])release(p.ob);enemies=[];shots=[];enemyShots=[];effects=[];levels.clear();syncLaws();choicesTaken=0;choiceKills=0;runBonusOffer=null;dashLock=0;pulls.length=0;orbitHits.clear();chosen.clear();mutated.clear();roomCleared=false;exitOpen=false;growth.reset();playerMotion.reset();player.visible=true;evolutionTime=0;$('#evolution').hidden=true;$('#active-cinematic').hidden=true;$('#active-cinematic').innerHTML='';updateFormLabel();document.querySelectorAll('#rules>div').forEach(n=>n.classList.remove('active'));hp=maxPlayerHp();playerSlow=0;dashState=createDashState();invuln=1;shootCD=0;keyboardDash=false;keys.clear();player.userData.dashTime=0;stage=0;kills=0;elapsed=0;runDashes=0;runDamageTaken=0;player.position.set(0,0,5);mode='playing';paused=false;$('#overlay').hidden=true;$('#pause').textContent='Ⅱ';$('#toast').textContent='';$('#overlay').classList.remove('intro');lastMove.set(0,0,1);cycle=restore?.cycle||0;score=restore?restoredScore(restore):0;paceGame=0;paceReal=0;wardensDefeated=restore?restoredWardens(restore):0;austinsDefeated=restore?restoredAustins(restore):0;inventory=restore?normalizeInventory(restore.inventory):startingInventory();runBonuses=normalizeRunBonuses(restore?.runBonuses);if(!restore&&!developerRun)for(const [id,n] of Object.entries(claimCarry(runStorage)))addItem(inventory,id,n);turretPotionDry=restore?.turretPotionDry||0;hasteTime=0;shellTime=0;selectedItem=null;itemBarKey='';relics=normalizeRelics(restore?.relics);relicRewardPending=false;dashState=createDashState(restore?.dashEvolution);dashRewardPending=Boolean(restore&&wardensDefeated>=1&&!dashState.id);austinRoom=false;potionCD=0;
 if(restore){stage=restore.stage;hp=Math.min(maxPlayerHp(),restore.hp);kills=restore.kills;elapsed=restore.elapsed;runDashes=restore.playDashes||0;runDamageTaken=restore.playDamage||0;for(const [id,v] of levelsFromSave(restore))levels.set(id,v);syncLaws();choicesTaken=restore.choicesTaken||0;choiceKills=restore.choiceKills||0;growth.select(effectiveLaws(),mutated);growth.update(0,0,false);updateFormLabel();}
 for(const [id,lv] of Object.entries(restore?.forms||{}))if(Object.hasOwn(FORMS,id))heldForms.set(id,lv);
 // 변이는 이어하기에서만 돌아온다. 새 여정은 빈 상태로 시작한다.
 mutations.clear();for(const [law,kind] of mutationsFromSave(restore?.mutations))mutations.set(law,kind);
 clearRunes();
 activeGauge=createActiveGauge(restore?.activeGauge||0,restore?.activeCooldown||0);activeReadyAnnounced=false;audio.setPaused(false);finaleEchoes.length=0;promptedSolo.clear();promptedAwaken.clear();promptedSecond.clear();
 if(restore?.form&&!heldForms.size&&canFuse(levels,restore.form))fuse(levels,heldForms,restore.form);
 syncLaws();syncForms(true);growth.select(effectiveLaws(),mutated);
 if(restore?.mode==='crossroads')nextJourney();else{austinRoom=restore?.mode==='austin';wave();}
 if(!restore){
  itemBarKey='';
  const departure=itemCounts(inventory);
  $('#toast').textContent=departure
   ?`${departure} 가지고 출발해요${inventory.sprout?' · 다시 싹은 쓰러지면 자동 사용':' · Q로 사용'}`
   :'가져온 물약 없이 출발해요 · 출발 상점에서 준비할 수 있어요';
 }}

function togglePause(){if(mode!=='playing'&&mode!=='evolving')return;paused=!paused;touch.reset();keys.clear();keyboardDash=false;if(paused)player.visible=true;$('#pause').textContent=paused?'▶':'Ⅱ';$('#toast').textContent='';audio.setPaused(paused);if(paused)pauseBuild.show(levels,heldForms);else{pauseBuild.hide();$('#pause').focus({preventScroll:true});}}
window.addEventListener('keydown',e=>{if(e.target?.closest?.('input,textarea'))return;if(!e.repeat){const pick={Digit1:1,Digit2:2,Digit3:3,Numpad1:1,Numpad2:2,Numpad3:3}[e.code];if(pick){if(pickChoice(pick))e.preventDefault();}else if(e.code==='KeyF')useActive();else if(e.code==='KeyQ'&&e.shiftKey){selectedItem=nextHeld(inventory,selectedItem);itemBarKey='';if(selectedItem)$('#toast').textContent=`${ITEMS[selectedItem].name} 고름 · Q로 마시기`;}else if(e.code==='KeyQ')useInventoryItem(selectedItem&&inventory[selectedItem]>0?selectedItem:nextHeld(inventory));}if(['Space','KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();keys.add(e.code);if(e.code==='Space'&&!e.repeat&&mode==='playing'&&!paused)keyboardDash=true;if(!e.repeat&&(e.code==='KeyP'||e.code==='Escape'))togglePause();if(e.code==='KeyE'&&!e.repeat)useExit();if(e.code==='Enter'&&mode==='ready'){if($('#go-dungeon')){showDungeon();return;}if(!requireName())return;const saved=readCheckpoint(actStore());if(saved)restart(saved);else startGame();}});window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{keys.clear();keyboardDash=false;if(!paused&&(mode==='playing'||mode==='evolving'))togglePause();});$('#pause').onclick=togglePause;
window.addEventListener('pagehide',()=>{saveLeaveState();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)saveLeaveState();if(document.hidden&&!paused&&(mode==='playing'||mode==='evolving'))togglePause();if(!document.hidden)enforceCurrentWebAccess().catch(()=>{});});
if(!account.native&&!import.meta.env.DEV){
 setInterval(()=>enforceCurrentWebAccess().catch(()=>{}),WEB_ACCESS_POLL_MS);
 window.addEventListener('focus',()=>enforceCurrentWebAccess().catch(()=>{}));
 window.addEventListener('online',()=>enforceCurrentWebAccess().catch(()=>{}));
}
function update(dt,time){
if(mode==='evolving'){
  if(paused)return;
  evolutionTime=Math.min(evolutionDuration,evolutionTime+dt);
  const progress=evolutionTime/evolutionDuration;
  growth.update(dt,time,true,progress);$('#evolution').style.setProperty('--growth',progress);
  if(progress>=1){growth.update(0,time,false);$('#evolution').hidden=true;mode='playing';invuln=Math.max(invuln,.6);if(!offerForm(false,finishEvolutionChoices)&&!offerSolo()&&!offerAwaken()&&roomCleared)openExit();}
  return;
}
if(!paused)growth.update(dt,time,false);
if(mode!=='playing'||paused){cameraMoveX=0;cameraMoveZ=0;player.userData.updateArt(camera);return;}previousPlayer.copy(player.position);potionCD=Math.max(0,potionCD-dt);hasteTime=Math.max(0,hasteTime-dt);shellTime=Math.max(0,shellTime-dt);playerSlow=Math.max(0,playerSlow-dt);baseSlideCooldown=Math.max(0,baseSlideCooldown-dt);tickDash(dashState,dt*gardenCooldown());invuln=Math.max(0,invuln-dt);shootCD-=dt;const titleState=seedTitle.state();const move=moveVector.set(0,0,0);if(keys.has('KeyW')||keys.has('ArrowUp'))move.z-=1;if(keys.has('KeyS')||keys.has('ArrowDown'))move.z+=1;if(keys.has('KeyA')||keys.has('ArrowLeft'))move.x-=1;if(keys.has('KeyD')||keys.has('ArrowRight'))move.x+=1;move.x+=touch.axes.move.x;move.z+=touch.axes.move.y;move.clampLength(0,1);if(move.lengthSq()>.001)lastMove.copy(move).normalize();dashLock=Math.max(0,dashLock-dt);const touchDash=touch.consumeDash(),dashRequested=keyboardDash||touchDash;keyboardDash=false;if(dashRequested&&canUseExit({open:exitOpen,mode,paused,x:player.position.x,z:player.position.z,exit:arena.exit||EXIT})){useExit();return;}const dashMove=dashRequested&&dashLock<=0?spendDash(dashState):null;if(dashMove){baseSlideTime=0;runDashes++;invuln=Math.max(invuln,dashMove.invuln);player.userData.dashTime=dashMove.duration;player.userData.dashSpeed=dashMove.speed;player.userData.dashDir=lastMove.clone();vfx.burst(player.position,dashState.id==='molt'?'reflect':'seed',dashState.id==='molt'?22:14);vfx.dash(player.position,player.rotation.y);audio.play('dash');player.userData.dashFX=0;}if(player.userData.dashTime>0){player.userData.dashTime-=dt;player.position.addScaledVector(player.userData.dashDir,dt*(player.userData.dashSpeed||17));player.userData.dashFX+=dt;if(player.userData.dashFX>=.045){player.userData.dashFX=0;vfx.dash(player.position,player.rotation.y);}}else if(baseSlideTime>0){baseSlideTime=Math.max(0,baseSlideTime-dt);player.position.addScaledVector(baseSlideDir,dt*BASE_SLIDE.speed);if(Math.floor(baseSlideTime/.07)!==Math.floor((baseSlideTime+dt)/.07))vfx.dash(player.position,Math.atan2(baseSlideDir.x,baseSlideDir.z));}else{player.position.addScaledVector(move,dt*PLAYER_SPEED*runMoveScale(runBonuses)*(gardenStats()?.move||1)*titleState.moveSpeed*(playerSlow>0?.75:1)*(hasteTime>0?ITEMS.wind.speed:1));const slide=stadium.tryBaseSlide(player.position,baseSlideCooldown);if(slide){baseSlideDir.set(slide.dx,0,slide.dz);baseSlideTime=slide.duration;baseSlideCooldown=slide.cooldown;lastMove.copy(baseSlideDir);vfx.pulse(player.position,'chain',1.05,.26);audio.play('dash');}}collide(player.position);stadium.tick(dt,player.position,{hit:a=>{if(invuln>0||shellTime>0)return false;hitPlayer(a);return true;},sound:id=>audio.play(id)});aimRing.visible=false;targetTimer-=dt;if(targetTimer<=0||!cachedTarget||cachedTarget.dead){cachedTarget=acquireTarget(player.position,enemies,obstacles,segmentHitsCover);targetTimer=.1;}const autoTarget=cachedTarget;if(autoTarget)aim.copy(autoTarget.g.position);const aimdir=aimDirection.copy(aim).sub(player.position).setY(0).normalize();player.rotation.y=Math.atan2(aimdir.x,aimdir.z);cameraMoveX=player.position.x-previousPlayer.x;cameraMoveZ=player.position.z-previousPlayer.z;playerMotion.update(dt,player.position.x-previousPlayer.x,player.position.z-previousPlayer.z,{dashing:player.userData.dashTime>0});player.userData.updateArt(camera,player.position.x-previousPlayer.x,player.position.z-previousPlayer.z);player.visible=invuln<.5||Math.floor(time*20)%2===0;player.userData.halo.rotation.z=time*.4;
if(autoTarget&&shootCD<=0&&!roomCleared){shootCD=runCadenceInterval(.22/gardenCooldown(),runBonuses);growth.fire();shotOrigin.copy(player.position).addScaledVector(aimdir,.65);vfx.muzzle(shotOrigin,aimdir,[...chosen][0]||'seed');shotOrigin.copy(player.position).addScaledVector(aimdir,.6);projectile(shotOrigin,aimdir);audio.play('shot');}
enemyIndex.rebuild(enemies);
for(const [id,combat] of formCombats){const cd=(formCooldowns.get(id)||0)-dt;if(autoTarget&&cd<=0&&!roomCleared&&!FORMS[formAttacks.get(id)||id]?.passive){formCooldowns.set(id,runCadenceInterval(combat.fire(player.position,aimdir,autoTarget.g.position)/gardenCooldown(),runBonuses));audio.play('shot');}else formCooldowns.set(id,Math.max(-1,cd));}
if(!roomCleared)for(const combat of formCombats.values())combat.update(dt);updateActive(dt);updateEscorts(dt);updateAct2WardenSupport();
crowdTimer-=dt;if(crowdTimer<=0&&!roomCleared){spawnCrowd(2);crowdTimer=crowdInterval(cycle);}
enemyIndex.rebuild(enemies);
if(!roomCleared){trapClock+=dt;for(const t of traps){tickTrap(t,trapClock,{player:player.position,enemies,hurtPlayer:a=>{if(invuln>0)return false;hitPlayer(a);return true;},hurtEnemy:(e,a)=>damageEnemy(e,a,false)});const info=trapPhase(trapClock+t.offset);t.visual.update(info.phase,info.progress);}}else for(const t of traps)t.visual.update('idle',0);
for(let i=pulls.length-1;i>=0;i--){const w=pulls[i];w.life-=dt;w.pulse-=dt;if(w.life<=0){pulls.splice(i,1);continue;}if(w.pulse<=0){vfx.pulse(w.pos,'gravity',1.2,.3);w.pulse=.25;}const d=pullVector.copy(w.pos).sub(player.position).setY(0);if(d.length()<2.6&&player.userData.dashTime<=0){player.position.addScaledVector(d.normalize(),dt*2.6);collide(player.position);}}
for(let i=wells.length-1;i>=0;i--){const w=wells[i];w.life-=dt;w.pulse-=dt;if(w.life<=0){wells.splice(i,1);continue;}const radius=LS.gravityRadius||2.2;if(w.pulse<=0){vfx.pulse(w.pos,'gravity',radius*.45,.4);w.pulse=.3;}for(const e of enemyIndex.queryInto(w.pos,radius,nearbyEnemies)){const d=wellVector.copy(w.pos).sub(e.g.position);if(!e.dead&&!isBoss(e)&&e.type!=='turret'){e.g.position.addScaledVector(d,dt*1.5);collide(e.g.position,.4);}}}
orbitGroup.visible=chosen.has('orbit');orbitTime+=dt*3.1;
if(orbitGroup.visible){for(const [e,t] of orbitHits){if(e.dead||t<=dt)orbitHits.delete(e);else orbitHits.set(e,t-dt);}
 orbitGroup.children.forEach((o,i)=>{o.visible=i<LS.orbitPetals;if(!o.visible)return;const a=orbitTime+i*Math.PI*2/LS.orbitPetals,bob=Math.sin(orbitTime*1.7+i*1.9);o.position.set(player.position.x+Math.cos(a)*LS.orbitRadius,.68+bob*.075,player.position.z+Math.sin(a)*LS.orbitRadius);o.rotation.set(-.22,Math.PI/2-a,bob*.13);o.scale.setScalar(1+.06* Math.max(0,bob));
  for(const e of enemyIndex.queryInto(o.position,1.5,nearbyEnemies))if(!e.dead&&!orbitHits.has(e)&&Math.hypot(e.g.position.x-o.position.x,e.g.position.z-o.position.z)<(isBoss(e)?1.5:.95)){orbitHits.set(e,.28);const push=e.g.position.clone().sub(player.position).setY(0).normalize();applyLawHit(e,LS.orbitDamage*gardenPower());if(!e.dead&&!isBoss(e)&&e.type!=='turret'){e.g.position.addScaledVector(push,.4);collide(e.g.position,.4);}}
  for(const q of enemyShots)if(q.life>0&&!q.boss&&Math.hypot(q.ob.position.x-o.position.x,q.ob.position.z-o.position.z)<.6){q.life=0;q.struck=true;vfx.burst(q.ob.position,'orbit',8);}
 });}
for(let e of enemies){if(e.dead)continue;e.slow=Math.max(0,(e.slow||0)-dt);const edt=dt*difficulty(cycle,region).speed*(e.slow>0?(isBoss(e)?Math.max(.8,LS.frostFactor):LS.frostFactor):1);if(e.updateArt)e.updateArt(time);if(e.type==='austin'){tickAustin(e,dt*difficulty(cycle,region).bossTempo*(e.slow>0?Math.max(.9,LS.frostFactor):1),{player:player.position,collide,clearBolts:()=>{for(const p of enemyShots)release(p.ob);enemyShots=[];},bolt:austinBolt,hit:a=>{if(invuln>0||shellTime>0)return false;hitPlayer(a);return true;},burst,pulse:(p,c,r,l)=>vfx.pulse(p,c,r,l),sound:id=>audio.play(id)});clockFloor?.point(e.pendingRing>0?e.ringHour:e.hour);continue;}if(e.type==='alwaysbeginner'){tickAlwaysBeginner(e,dt*difficulty(cycle,region).bossTempo*(e.slow>0?Math.max(.9,LS.frostFactor):1),{player:player.position,collide,clearBolts:()=>{for(const p of enemyShots)release(p.ob);enemyShots=[];},bolt:stadiumBolt,hit:a=>{if(invuln>0||shellTime>0)return false;hitPlayer(a);return true;},burst,pulse:(p,c,r,l)=>vfx.pulse(p,c,r,l),sound:id=>audio.play(id),summon:types=>{for(const type of types){const pos=safeArenaSpawn(player.position,obstacles,crowdIndex++,arena);if(!pos)continue;const minion=spawnAct2(type,pos.x,pos.z);minion.hp*=difficulty(cycle,region).hp*levelPressure();minion.maxHp=minion.hp;vfx.pulse(minion.g.position,'amber',1.4,.35);}}});continue;}if(e.type==='turret'){tickTurret(e,edt,player.position,{fire:turretBolt,hurt:hitPlayer,strikeFx:p=>{vfx.arc(e.g.position.clone().setY(1.8),p);vfx.pulse(p,'chain',1.15,.3);vfx.burst(p,'chain',16);}});continue;}if(e.type==='shield'){tickShield(e,edt,player.position,{collide,hit:hitPlayer});continue;}if(e.type==='swarm'){e.hit=Math.max(0,e.hit-dt);e.timer-=dt;const d=enemyVector.copy(player.position).sub(e.g.position).setY(0),distance=d.length();d.normalize();e.g.rotation.y=Math.atan2(d.x,d.z);e.g.position.addScaledVector(d,edt*(1.6+stage*.14));{const ep=e.g.position;for(const other of enemyIndex.queryInto(ep,.65,separationEnemies))if(other!==e&&!other.dead){const ax=ep.x-other.g.position.x,az=ep.z-other.g.position.z,length=Math.hypot(ax,az);if(length>0&&length<.65){const k=edt*(.65-length)*4/length;ep.x+=ax*k;ep.z+=az*k;}}}collide(e.g.position,.28);e.g.children[0].rotation.z=Math.sin(time*14+e.phase)*.1;if(distance<.65&&e.timer<=0){hitPlayer(10);e.timer=.85;}continue;}if(isAct2Minion(e.type)){tickAct2Minion(e,edt,time,act2Ctx);continue;}if(e.type==='act2warden'){tickAct2Warden(e,edt,time,act2Ctx);continue;}if(e.type==='warden'){const wardenDamage=e.duoSupport?DUO_WARDEN.damage:1;tickWarden(e,edt,time,player.position,effectiveLaws(),{collide,bolt:(pos,dir,bounces,laws)=>bossBolt(pos,dir,bounces,laws,wardenDamage),hit:a=>hitPlayer(a*wardenDamage),burst,seal:(pos,r)=>{vfx.pulse(pos,'gravity',r,.5);vfx.burst(pos,'gravity',30,2);if(Math.hypot(player.position.x-pos.x,player.position.z-pos.z)<r){dashLock=SEAL.lock;hitPlayer(SEAL.damage*wardenDamage);$('#toast').textContent='회피 봉인 · 걸어서 피하세요';}}});continue;}previousEnemy.copy(e.g.position);let delta=enemyVector.copy(player.position).sub(e.g.position).setY(0),dist=delta.length();delta.normalize();e.tell.visible=e.state==='tell';e.tell.material.opacity=.12+Math.abs(Math.sin(time*9))*.17;e.timer-=edt;e.hit=Math.max(0,e.hit-edt);e.g.rotation.y=Math.atan2((e.state==='tell'||e.state==='commit'?e.dir:delta).x,(e.state==='tell'||e.state==='commit'?e.dir:delta).z);if(e.state==='stalk'){if(e.type==='hound'){e.g.position.addScaledVector(delta,edt*(1.65+stage*.15));if(e.timer<0&&dist<6){e.state='tell';e.timer=.58;e.dir.copy(delta);}}else{if(dist<4.8)e.g.position.addScaledVector(delta,-edt*.9);else if(dist>6.8)e.g.position.addScaledVector(delta,edt*.8);e.g.position.x+=delta.z*edt*.65*(e.phase<3?1:-1);e.g.position.z-=delta.x*edt*.65*(e.phase<3?1:-1);if(e.timer<0){e.state='tell';e.timer=.85;e.dir.copy(delta);}}}else if(e.state==='tell'){e.ring.material.opacity=.45+Math.sin(time*20)*.3;e.ring.scale.setScalar(1+(1-e.timer)*.3);if(e.timer<=0){e.state='commit';e.timer=e.type==='hound'?.48:.2;if(e.type==='caster'){const fan=stage>=2||cycle>0?2:1;for(let j=-fan;j<=fan;j++){let d=e.dir.clone().applyAxisAngle(new V(0,1,0),j*.17);let ob=enemyBolt(e.g.position,'caster');enemyShots.push({ob,dir:d,life:4,speed:(5+stage*.45)*difficulty(cycle,region).projectileSpeed});}}}}else if(e.state==='commit'){if(e.type==='hound'){e.g.position.addScaledVector(e.dir,edt*8);if(e.g.position.distanceTo(player.position)<1)hitPlayer(22);}if(e.timer<=0){e.state='recover';e.timer=1.25;e.ring.material.opacity=.16;e.ring.scale.setScalar(1);}}else if(e.timer<=0){e.state='stalk';e.timer=.55+rng()*.65;}collide(e.g.position,.65);e.motion.update(edt,e.g.position.x-previousEnemy.x,e.g.position.z-previousEnemy.z,{type:e.type,state:e.state,timer:e.timer,hit:e.hit});e.tell.visible=e.state==='tell';}
enemyIndex.rebuild(enemies);
for(let p of shots){const previous=previousShot.copy(p.ob.position);p.life-=dt;p.age+=dt;if(chosen.has('recall')&&!p.fragment&&p.age>.8){if(!p.returning){p.returning=true;p.hitSet.clear();p.hits=0;vfx.pulse(p.ob.position,'recall',.22,.2);}p.dir.copy(player.position).sub(p.ob.position).setY(0).normalize();if(Math.hypot(p.ob.position.x-player.position.x,p.ob.position.z-player.position.z)<.45){p.life=0;continue;}}p.ob.position.addScaledVector(p.dir,dt*(p.fragment?FRAGMENT_SPEED:SHOT_SPEED)*titleState.shotSpeed*(p.speedScale||1));p.ob.rotation.y=Math.atan2(p.dir.x,p.dir.z);p.trailTime+=dt;if(p.trailTime>=playerTrailInterval&&p.trailPos.distanceToSquared(p.ob.position)>.018){vfx.trail(p.trailPos,p.ob.position,p.tint,p.fragment);p.trailPos.copy(p.ob.position);p.trailTime=0;}let pos=p.ob.position;let wallHit=reflectArenaBoundary(previous,pos,p.dir,arena);for(let o of obstacles){if(Math.abs(pos.x-o.x)<o.w/2+.1&&Math.abs(pos.z-o.z)<o.d/2+.1){wallHit=true;let dx=Math.abs(pos.x-o.x)/(o.w/2),dz=Math.abs(pos.z-o.z)/(o.d/2);if(dx>dz)p.dir.x*=-1;else p.dir.z*=-1;break;}}if(wallHit){if(chosen.has('reflect')&&p.bounces<LS.reflectBounces){pos.addScaledVector(p.dir,.1);constrainToArena(pos,.05,arena);p.bounces++;vfx.reflect(pos,p.dir);audio.play('reflect');p.trailPos.copy(pos);if(hasMutation(mutations,'reflect','speed')){p.speedScale=reflectBounceSpeed(mutations,p.bounces);p.life+=TUNE.reflectSpeed.lifePerBounce;}if(hasMutation(mutations,'reflect','rune'))dropRune(pos);if(hasMutation(mutations,'reflect','burst')&&p.bounces>=LS.reflectBounces)mutationBurst(pos.clone(),TUNE.reflectBurst.radius,TUNE.reflectBurst.damage);}else{if(chosen.has('reflect')&&hasMutation(mutations,'reflect','burst'))mutationBurst(pos.clone(),TUNE.reflectBurst.radius,TUNE.reflectBurst.damage);p.life=0;}}if(p.life<=0)continue;for(let e of enemyIndex.queryInto(pos,1.2,nearbyEnemies)){if(p.hits<LS.pierceHits&&!e.dead&&e!==p.ignoreEnemy&&!p.hitSet.has(e)&&Math.hypot(e.g.position.x-pos.x,e.g.position.z-pos.z)<(isBoss(e)?1.2:.9)){if(blocksShield(e,p.dir)){p.life=0;e.block=.18;catcherReturn(e,act2Ctx);vfx.pulse(e.g.position,'reflect',.65,.18);break;}p.hitSet.add(e);p.hits++;applyLawHit(e,(p.fragment?8:18)*damageScale(levels)*runPowerScale(runBonuses)*gardenPower()*(p.returning?LS.recallReturn:1)*(p.critical?LS.critDamage:1),false,p.critical);if(p.hits>=LS.pierceHits){if(!(chosen.has('recall')&&!p.returning&&!p.fragment))p.life=0;}if(chosen.has('split')&&!p.fragment&&shots.length<MAX_SHOTS){vfx.split(pos,p.dir,Math.min(5,LS.splitCount));audio.play('split');const spread=LS.splitCount>3?.85:.65;if(hasMutation(mutations,'split','rune'))dropRune(pos);for(let angle of Array.from({length:LS.splitCount},(_,k)=>LS.splitCount===1?0:-spread+2*spread*k/(LS.splitCount-1))){const fragment=projectile(pos.clone().addScaledVector(p.dir,.85),p.dir.clone().applyAxisAngle(new V(0,1,0),angle),true,e);if(fragment){fragment.speedScale=fragmentSpeedScale(mutations);fragment.life+=fragmentExtraLife(mutations);fragment.burstOnEnd=hasMutation(mutations,'split','burst');}}}break;}}}
for(let p of enemyShots){p.life-=dt;p.age=(p.age||0)+dt;if(p.recall&&p.age>1.3){p.dir.copy(p.origin).sub(p.ob.position).setY(0).normalize();if(p.ob.position.distanceTo(p.origin)<.8){p.life=0;continue;}}const previous=previousEnemyShot.copy(p.ob.position);if(p.curve)p.dir.applyAxisAngle(AXIS_Y,p.curve*dt);p.ob.rotation.y+=dt*(p.boss?5:8);p.ob.position.addScaledVector(p.dir,dt*(p.speed??(5+stage*.45)));const outside=reflectArenaBoundary(previous,p.ob.position,p.dir,arena);
 if((!p.pierce&&segmentHitsCover(previous,p.ob.position,obstacles,.13))||outside){if(p.bounces>0){const next=p.ob.position;let flipX=false,flipZ=false;for(const o of obstacles)if(!p.pierce&&!outside&&segmentHitsCover(previous,next,[o],.13)){if(Math.abs(previous.x-o.x)>=o.w/2+.13)flipX=true;else flipZ=true;break;}if(flipX)p.dir.x*=-1;if(flipZ)p.dir.z*=-1;p.ob.position.copy(previous);p.bounces--;audio.play('reflect');}else p.life=0;continue;}
 if(Math.hypot(p.ob.position.x-player.position.x,p.ob.position.z-player.position.z)<(p.boss?.6:.55)){const couldHit=invuln<=0;hitPlayer(p.damage??13);if(couldHit){p.struck=true;if(p.frost)playerSlow=1.2;}p.life=0;}}

for(let arr of [shots,enemyShots,effects])for(let i=arr.length-1;i>=0;i--){let p=arr[i];if(arr===effects){p.life-=dt;if(p.vel)p.ob.position.addScaledVector(p.vel,dt);p.ob.scale.setScalar(Math.max(.01,p.life/p.max));}if(p.life<=0){if(arr===enemyShots)endEnemyShot(p);if(p.burstOnEnd)mutationBurst(p.ob.position.clone(),TUNE.splitBurst.radius,TUNE.splitBurst.damage);release(p.ob);arr.splice(i,1);}}
updateEscorts(0);updateFallen(dt,time);updateRunes(dt);const bossFalling=fallen.some(f=>f.hold);
enemies=enemies.filter(e=>!e.dead);if(!enemies.length&&crowdLeft===0&&mode==='playing'&&!roomCleared&&!bossFalling){for(let p of enemyShots)release(p.ob);enemyShots=[];roomCleared=true;score+=roomPoints(stage,cycle);clearForms();for(const p of shots)release(p.ob);shots=[];if(stage<4)openExit();else cardChoice();}
if(mode==='playing'&&!roomCleared&&!bossFalling&&choiceKills>=killsForChoice(choicesTaken)){choiceKills-=killsForChoice(choicesTaken);choicesTaken++;cardChoice(true);}}
// 판 시간은 게임 시계(프레임 간격)가 아니라 실제 시계로 잰다. 게임을 느리게 돌리는 도구를 쓰면
// 예전에는 기록 시간이 그만큼 줄어 '분당 처치'가 부풀려졌다. 실제 시계는 그렇게 줄지 않는다.
let last=performance.now(),realLast=Date.now(),paceGame=0,paceReal=0,frames=[],frameCounter=0;function animate(now){requestAnimationFrame(animate);let raw=(now-last)/1000;last=now;
 {const realNow=Date.now();const realDelta=(realNow-realLast)/1000;realLast=realNow;if(mode==='playing'&&!paused&&realDelta>0&&realDelta<2){elapsed+=realDelta;paceReal+=realDelta;paceGame+=Math.min(2,Math.max(0,raw));}}frames.push(raw*1000);qualityGovernor.sample(raw*1000,mode==='playing'&&!paused&&!document.hidden);if(frames.length>180)frames.shift();const visualDt=Math.min(.1,Math.max(0,raw)),timeScale=cameraFeel.stepEffects(visualDt),dt=advanceFrame(raw*timeScale,now*.001,(step,time)=>update(step,time));audio.tick(visualDt);if(!paused)vfx.update(visualDt);frameCounter++;
 // Ambient motes move slowly: 30 Hz looks identical and low quality can omit both batches entirely.
 if(moteMeshes[0].visible&&(frameCounter===1||frameCounter%2===0)){for(const m of motes){m.y+=Math.sin(now*.001+m.seed)*visualDt*(frameCounter===1?.08:.16);moteMatrix.makeTranslation(m.x,m.y,m.z);moteMeshes[m.kind].setMatrixAt(m.index,moteMatrix);}for(const m of moteMeshes)m.instanceMatrix.needsUpdate=true;}
 const cameraPose=cameraFeel.follow(visualDt,{playerX:player.position.x,playerZ:player.position.z,moveX:cameraMoveX,moveZ:cameraMoveZ,followX:viewLayout.followX,followZ:viewLayout.followZ,baseZoom:viewLayout.zoom});look.set(cameraPose.x,0,cameraPose.z);if(Math.abs(camera.zoom-cameraPose.zoom)>.0005){camera.zoom=cameraPose.zoom;camera.updateProjectionMatrix();}camera.position.set(look.x,22,15.5+look.z);cameraShake=Math.max(0,cameraShake-visualDt);if(cameraShake>0)camera.position.x+=(rng()-.5)*cameraShake;camera.lookAt(look);camera.updateMatrixWorld();stadium.update(now*.001);seedTitle.update(camera,canvasRect,player.visible&&mode==='playing'&&!paused);presentFrame(now*.001);renderer.info.autoReset=false;renderer.info.reset();shadowClock+=Math.max(0,raw||0);if(sun.castShadow&&shadowClock>=SHADOW_REFRESH){shadowClock=0;renderer.shadowMap.needsUpdate=true;}const showGardenScene=(mode==='ready'||mode==='garden'||mode==='notes'||mode==='maintenance'||mode==='gift')&&gardenScene;
 if(showGardenScene)gardenScene.update(visualDt);
 renderPass.scene=showGardenScene?gardenScene.scene:scene;renderPass.camera=showGardenScene?gardenScene.camera:camera;
 if(bloomPass.enabled)composer.render();else renderer.render(renderPass.scene,renderPass.camera);if(inspection&&frameCounter%30===0)inspection.textContent=JSON.stringify(window.seedDebug.getState());}
function renderBossHud(boss,group=[boss]){
 const hud=$('#boss-hud'),hpTotal=group.reduce((n,e)=>n+Math.max(0,e.hp),0),maxTotal=group.reduce((n,e)=>n+e.maxHp,0),pct=Math.max(0,hpTotal/maxTotal*100);setHidden(hud,false);setWidth(hud.querySelector('i'),pct.toFixed(1)+'%');
 if(boss.type==='austin'){
  const phase=PHASES[boss.phase];if(hud.dataset.phase!==boss.phase)hud.dataset.phase=boss.phase;
  setText(hud.querySelector('strong'),`${AUSTIN.name} · ${phase.label} · ${Math.ceil(pct)}%`);setText(hud.querySelector('.boss-move'),austinPatternName(boss));setHidden(hud.querySelector('.boss-move'),false);setText(hud.querySelector('small'),austinHint(boss));
 }else if(boss.type==='alwaysbeginner'){
  const phase=ALWAYS_PHASES[boss.phase];if(hud.dataset.phase!==boss.phase)hud.dataset.phase=boss.phase;
  setText(hud.querySelector('strong'),`${ALWAYS_BEGINNER.name} · ${phase.label} · ${Math.ceil(pct)}%`);setText(hud.querySelector('.boss-move'),alwaysBeginnerPatternName(boss));setHidden(hud.querySelector('.boss-move'),false);setText(hud.querySelector('small'),alwaysBeginnerHint(boss));
 }else if(boss.type==='act2warden'){
  delete hud.dataset.phase;setText(hud.querySelector('strong'),group.length>1?`연계 문지기 · ${Math.ceil(pct)}%`:`${boss.config.name} · ${Math.ceil(pct)}%`);setText(hud.querySelector('.boss-move'),boss.moveName||'다음 공격 준비');setHidden(hud.querySelector('.boss-move'),false);setText(hud.querySelector('small'),act2WardenHint(boss)+(act2Support?' · 생명 60%에서 다음 문지기 난입':''));
 }else{
  delete hud.dataset.phase;setHidden(hud.querySelector('.boss-move'),!boss.moveName);setText(hud.querySelector('.boss-move'),boss.moveName||'');setText(hud.querySelector('strong'),group.length>1?`쌍문지기 · ${Math.ceil(pct)}%`:`${boss.config?.name||'기억의 문지기'} · ${Math.ceil(pct)}%`);
  setText(hud.querySelector('small'),boss.moveName?'진화의 성질을 흉내 냅니다 · 예고된 틈으로 피하세요':pendingEscorts.length?'호위 등장 예고 · 주황 원에서 떨어지세요':boss.variant==='seal'?'보라 원이 닫힐 때 안에 있으면 회피가 봉인됩니다':boss.variant==='hunter'?'돌진 뒤 곧바로 한 번 더 돌진합니다':boss.learned.length?'습득: '+boss.learned.map(id=>LAW_NAMES[id]).join(' · '):boss.copiedForm?`${boss.config?.echoEvery||4}번째 공격마다 ${boss.copiedForm.name} 모방`:'생명 67% · 34%에서 당신의 법칙을 배웁니다');
 }
}
let hudLast=-Infinity,hudMode='',hudPaused=false;
function presentFrame(time){
 contactShadows.update(player,enemies,fallen);player.userData.updateEvolutionArt?.(time,activeGauge.plan?.state==='OVERDRIVE');
 trackOverhead();
 const hudInterval=1/(mobileDevice?20:30),hudDue=time-hudLast>=hudInterval||mode!==hudMode||paused!==hudPaused;if(!hudDue)return;hudLast=time;hudMode=mode;hudPaused=paused;
 const dm=dashMeter(dashState),dashExit=canUseExit({open:exitOpen,mode,paused,x:player.position.x,z:player.position.z,exit:arena.exit||EXIT});touch.update(mode==='playing'&&!paused,Math.max(dm.ready?0:dm.recharge,dashLock),dm,{exit:dashExit});setHidden($('#save-exit'),!(paused&&(mode==='playing'||mode==='evolving')));
 const dashPips=$('#dash-pips'),dashPipKey=`${dm.charges}/${dm.maxCharges}`;setHidden(dashPips,dm.maxCharges<2);if(dashPips&&dashPips.__key!==dashPipKey){dashPips.innerHTML=Array.from({length:dm.maxCharges},(_,i)=>`<i class="${i<dm.charges?'ready':''}"></i>`).join('');dashPips.__key=dashPipKey;}
 // 메뉴·정원 화면에서는 전투 HUD를 감춘다(정원이 그대로 보이게).
 const menuMode=['ready','garden','ranking','discoveries','notes','maintenance','gift'].includes(mode);
 if(document.body.__menuMode!==menuMode){document.body.classList.toggle('menu-mode',menuMode);document.body.__menuMode=menuMode;}
 updateGauges();
 setText($('#score-hud b'),formatScore(score));setText($('#score-hud small'),playerName?playerName+' · 점수':'점수');setHidden($('#score-hud'),!['playing','cards','forms','evolving'].includes(mode));
 renderItemBar();renderActiveButton($('#active-skill'),{forms:heldForms,gauge:activeGauge,live:mode==='playing'&&!paused,touch:document.body.classList.contains('touch-mode')});
 const readyNow=mode==='playing'&&!paused&&!activeGauge.plan&&activeGauge.cooldown<=0&&activeGauge.value>=ACTIVE.max&&activeState(heldForms).state!=='LOCKED';if(readyNow&&!activeReadyAnnounced)audio.play('ultimateReady');activeReadyAnnounced=readyNow;
 if(mode!=='playing'||paused)return;
 const wardenGroup=enemies.filter(e=>(e.type==='warden'||e.type==='act2warden')&&!e.dead&&(stage===4||!e.elite)),boss=enemies.find(e=>e.type==='austin'||e.type==='alwaysbeginner')||wardenGroup.find(e=>e.moveName)||wardenGroup.find(e=>!e.duoSupport&&!e.support)||wardenGroup[0];if(boss)renderBossHud(boss,(boss.type==='austin'||boss.type==='alwaysbeginner')?[boss]:wardenGroup);else setHidden($('#boss-hud'),true);const nearExit=canUseExit({open:exitOpen,mode,paused,x:player.position.x,z:player.position.z,exit:arena.exit||EXIT});setHidden($('#exit-room'),!nearExit);setText($('#exit-room'),stage===4?(finalBossAhead()?'최종 보스에게 · E':'다음 여정으로 · E'):touch.enabled?'다음 방으로':'다음 방으로 · E');gateHalo.rotation.y=time*.6;setWidth($('#hpbar'),(hp/maxPlayerHp()*100).toFixed(1)+'%');setText($('#hptext'),`${displayHp(hp)} / ${displayHp(maxPlayerHp())}`);setText($('#dashname'),`◇  ${dashState.id?DASH_EVOLUTIONS[dashState.id].name:'회피'}`);setWidth($('#dashbar'),(dm.fill*100).toFixed(1)+'%');setText($('#dashtext'),dashLock>0?'봉인 '+dashLock.toFixed(1)+'s':dm.maxCharges>1?`${dm.charges}/${dm.maxCharges}${dm.charges<dm.maxCharges?' · '+dm.recharge.toFixed(1)+'s':''}`:dm.ready?'준비':dm.recharge.toFixed(1)+'s');
}
// The item bar is rebuilt only when counts or the selection change, never every frame.
function renderItemBar(){
 const bar=$('#item-bar'),status=$('#item-status'),live=mode==='playing'&&!paused,show=live&&heldItems(inventory).length>0;
 setHidden(bar,!show);
 const effects=[hasteTime>0?`${ITEMS.wind.name} ${hasteTime.toFixed(1)}초`:'',shellTime>0?`${ITEMS.shell.name} ${shellTime.toFixed(1)}초`:''].filter(Boolean).join(' · ');
 setHidden(status,!(live&&effects));setText(status,effects);
 if(!show)return;
 if(!(selectedItem&&usable(selectedItem)&&inventory[selectedItem]>0))selectedItem=nextHeld(inventory);
 const key=ITEM_ORDER.map(id=>inventory[id]).join(',')+'|'+selectedItem;
 if(key===itemBarKey)return;itemBarKey=key;
 bar.innerHTML=heldItems(inventory).map(id=>{const it=ITEMS[id];
  if(!usable(id))return `<span class="item-chip" title="${it.desc}">${itemArt(id)}<b>×${inventory[id]}</b><small>${it.name}</small></span>`;
  return `<button class="item-button${id===selectedItem?' selected':''}" data-item="${id}"${id==='potion'?' id="use-potion"':''} aria-label="${it.name} · ${it.desc}" title="${it.name} · ${it.desc}">${itemArt(id)}<b>×${inventory[id]}</b><small>${id===selectedItem?'Q':''}</small></button>`;
 }).join('');
}
function trackOverhead(){
 const overhead=$('#overhead'),show=mode==='playing'&&!paused;setHidden(overhead,!show);if(!show)return;
 overheadWorld.copy(player.position);overheadWorld.y=1.95;overheadWorld.project(camera);const r=canvasRect;
 const x=r.left+(overheadWorld.x+1)*r.width/2,y=r.top+(1-overheadWorld.y)*r.height/2;
 const transform=`translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) translate(-50%,-100%)`;
 if(overhead.__transform!==transform){overhead.style.transform=transform;overhead.__transform=transform;}
}
function updateGauges(){
 const need=killsForChoice(choicesTaken),have=Math.min(need,choiceKills);
 setText($('#growth-progress span'),`다음 법칙까지 ${need-have} 처치 · 슬롯 ${slotsUsed(levels,heldForms)}/${SLOT_CAP}`);setWidth($('#growth-progress i'),(have/need*100).toFixed(1)+'%');
 if(mode!=='playing'||paused)return;
 setWidth($('#overhead .oh-hp i'),(hp/maxPlayerHp()*100).toFixed(1)+'%');const low=hp<=maxPlayerHp()*.35,hpBox=$('#overhead .oh-hp');if(hpBox.__low!==low){hpBox.classList.toggle('low',low);hpBox.__low=low;}
 setHidden($('#overhead .oh-lock'),dashLock<=0);
 const dm=dashMeter(dashState);setWidth($('#overhead .oh-dash i'),(dashLock>0?0:dm.fill*100).toFixed(1)+'%');const ready=dm.ready&&dashLock<=0,dashBox=$('#overhead .oh-dash');if(dashBox.__ready!==ready){dashBox.classList.toggle('ready',ready);dashBox.__ready=ready;}const double=dm.maxCharges>1;if(dashBox.__double!==double){dashBox.classList.toggle('double',double);dashBox.__double=double;}
}
// ---------------- render quality ----------------
function syncPixelRatio(w=document.documentElement.clientWidth,h=renderer.domElement.clientHeight||document.documentElement.clientHeight){
 const ratio=renderPixelRatio(QUALITY_LEVELS[qualityLevel],{width:w,height:h,dpr:devicePixelRatio});
 if(renderer.getPixelRatio()!==ratio){renderer.setPixelRatio(ratio);composer.setPixelRatio(ratio);}
}
function sizeBloom(w=document.documentElement.clientWidth,h=renderer.domElement.clientHeight||document.documentElement.clientHeight){
 const q=QUALITY_LEVELS[qualityLevel],ratio=renderer.getPixelRatio();
 bloomPass.enabled=q.bloom!=='off';
 if(q.bloom==='half')bloomPass.setSize(Math.max(1,Math.round(w*ratio/2)),Math.max(1,Math.round(h*ratio/2)));
}
function behindCover(pos){if(!obstacles.length)return false;const dx=camera.position.x-pos.x,dz=camera.position.z-pos.z,d=Math.hypot(dx,dz)||1,reach=Math.min(d,OCCLUSION_REACH);return segmentHitsCover({x:pos.x,z:pos.z},{x:pos.x+dx/d*reach,z:pos.z+dz/d*reach},obstacles,.35);}
function applyQuality(level,{save=true}={}){
 qualityLevel=level;const q=QUALITY_LEVELS[level];
 document.body.dataset.quality=String(level);
 syncPixelRatio();
 for(const light of lanternLights)light.visible=q.lanternLights;
 for(const mote of moteMeshes)mote.visible=level>0;
 scene.traverse(o=>{if(o.name==='quality-occlusion-ghost')o.visible=level>0;});
 // Actor silhouettes: only when cover stands within OCCLUSION_REACH in front of the actor, toward the camera (a generous test; the
 // silhouette's own depth test still hides it when nothing is really in front).
 configureOcclusion({enabled:level>0,test:behindCover});
 player.userData.setQuality?.(level);
 vfx.setQuality(level);activeVfx.setQuality(level);playerTrailInterval=mobileDevice?[.12,.075,.055][level]:[.075,.055,.045][level];
 if(sun.castShadow!==q.shadows){sun.castShadow=q.shadows;}shadowClock=SHADOW_REFRESH;
 if(q.shadows&&sun.shadow.mapSize.x!==q.shadowSize){sun.shadow.mapSize.set(q.shadowSize,q.shadowSize);sun.shadow.map?.dispose();sun.shadow.map=null;}
 if(save){try{runStorage.setItem(QUALITY_KEY,String(level));}catch{}}
 resize();
}
// Manual choice in the pause sheet: cycles high → medium → low → high and is remembered on this device.
function qualityButtonLabel(){return `화질 · ${QUALITY_NAMES[qualityLevel]}`;}
// 효과음 켜기·끄기. 교실이나 밤에 조용히 하고 싶을 때. 이 기기에 기억한다.
const SOUND_KEY='seed-sound-v1';
function mountSoundButton(){
 let on=true;try{on=runStorage.getItem(SOUND_KEY)!=='off';}catch{}
 audio.setMuted(!on);
 const footer=document.querySelector('#pause-build footer');if(!footer||footer.querySelector('#sound-toggle'))return;
 const button=document.createElement('button');button.id='sound-toggle';button.type='button';
 const label=()=>on?'소리 · 켜짐':'소리 · 꺼짐';button.textContent=label();
 button.onclick=()=>{on=!on;audio.setMuted(!on);try{runStorage.setItem(SOUND_KEY,on?'on':'off');}catch{}button.textContent=label();};
 footer.prepend(button);
}
function mountQualityButton(){
 const footer=document.querySelector('#pause-build footer');if(!footer||footer.querySelector('#quality-toggle'))return;
 const button=document.createElement('button');button.id='quality-toggle';button.type='button';button.textContent=qualityButtonLabel();
 button.title='느리면 낮춰 보세요 · 게임 규칙은 그대로예요';
 button.onclick=()=>{applyQuality((qualityLevel+2)%3);button.textContent=qualityButtonLabel();};
 footer.prepend(button);
}
function themeButtonLabel(){return `무료 테마 체험 · ${THEMES[combatTheme].short}`;}
function applyCombatTheme(id,{save=true}={}){
 combatTheme=id;document.body.dataset.combatTheme=id;vfx.setTheme(id);activeVfx.setTheme(id);player.userData.setTheme?.(id);for(const combat of formCombats.values())combat.setTheme(id);
 for(const law of ['seed',...Object.keys(LAWS)])mats['shot-'+law].color.setHex(themeColor(id,`shot:${law}`,FX_COLORS[law])).multiplyScalar(2);
 if(save)writeTheme(runStorage,id);
 const button=document.getElementById('theme-toggle');if(button)button.textContent=themeButtonLabel();
 return combatTheme;
}
function mountThemeButton(){
 const footer=document.querySelector('#pause-build footer');if(!footer||footer.querySelector('#theme-toggle'))return;
 const button=document.createElement('button');button.id='theme-toggle';button.type='button';button.textContent=themeButtonLabel();
 button.title='무료 전투 외형 시제품 · 상점 상품이 아니며 능력치는 바뀌지 않아요';
 button.onclick=()=>{$('#toast').textContent=`${THEMES[applyCombatTheme(nextTheme(combatTheme))].name} 전투 외형 · 능력치는 그대로예요`;};
 footer.prepend(button);
}
const qualityGovernor=createQualityGovernor(qualityLevel,{onChange:level=>{applyQuality(level);const qb=document.getElementById('quality-toggle');if(qb)qb.textContent=qualityButtonLabel();$('#toast').textContent=`기기가 느려 화질을 '${QUALITY_NAMES[level]}'으로 낮췄어요 · 게임 규칙은 그대로예요`;}});
function resize(){const w=document.documentElement.clientWidth,viewHeight=document.documentElement.clientHeight,h=touch.enabled&&viewHeight>w?Math.max(250,viewHeight-160):viewHeight;syncPixelRatio(w,h);renderer.setSize(w,h,false);renderer.domElement.style.width='100%';renderer.domElement.style.height=h+'px';camera.aspect=w/h;viewLayout=responsiveView(w,h,touch.enabled);document.body.classList.toggle('phone-landscape',viewLayout.phone);camera.zoom=viewLayout.zoom;camera.updateProjectionMatrix();composer.setSize(w,h);sizeBloom(w,h);canvasRect=renderer.domElement.getBoundingClientRect();if(gardenScene)gardenScene.resize(w,h);if(touch.enabled&&mode==='playing'&&!paused)togglePause();}window.addEventListener('resize',resize);
// 정원에서는 화면을 눌러 식물과 빈 자리를 고른다.
renderer.domElement.addEventListener('pointerdown',event=>{
 if(mode!=='garden'||!gardenScene)return;
 const rect=canvasRect,hit=gardenScene.pick((event.clientX-rect.left)/Math.max(1,rect.width),(event.clientY-rect.top)/Math.max(1,rect.height));
 selectGardenSpot(hit);
});applyQuality(qualityLevel,{save:false});applyCombatTheme(combatTheme,{save:false});mountQualityButton();mountThemeButton();mountSoundButton();Promise.all([cloud.start(),loadSeasonStatus({enabled:!import.meta.env.DEV})]).then(async([result,status])=>{seasonStatus=status;await refreshAccessMode();const honored=await claimFirstGardenPioneer(runStorage,[account.user()?.uid,legacyRankingUid(rawStorage)]);if(honored&&account.user())await cloud.syncNow();if(result?.changed||honored){location.reload();return;}showEntry();}).catch(async()=>{seasonStatus=DEFAULT_SEASON_STATUS;await account.ready().catch(()=>null);await refreshAccessMode();showEntry();});requestAnimationFrame(animate);
// Read-only live diagnostics for performance and real-input validation.
if(import.meta.env.DEV||localInspection)window.seedDebug={getState:()=>({pace:{game:+paceGame.toFixed(1),real:+paceReal.toFixed(1),trusted:paceTrusted(paceGame,paceReal)},mutations:mutationsToSave(mutations),runes:runes.length,gardenFx,theme:{id:combatTheme,...THEMES[combatTheme]},quality:{level:qualityLevel,name:QUALITY_NAMES[qualityLevel],bloom:bloomPass.enabled,pixelRatio:renderer.getPixelRatio(),shadows:sun.castShadow,lanternLights:lanternLights.filter(l=>l.visible).length,governor:qualityGovernor.state()},items:{hasteTime,shellTime,selectedItem},runBonuses:{...runBonuses},active:{value:activeGauge.value,cooldown:activeGauge.cooldown,state:activeState(heldForms).state,forms:activeState(heldForms).forms,plan:activeGauge.plan&&{state:activeGauge.plan.state,forms:activeGauge.plan.forms,time:activeGauge.plan.time,tags:activeGauge.plan.tags,archetype:activeGauge.plan.archetype},visual:activeVfx.state()},relics:normalizeRelics(relics),relicStats:{...LS},score,wardensDefeated,austinsDefeated,austinRoom,austinTitle:seedTitle.isUnlocked(),inventory:{...inventory},fallen:fallen.length,levels:Object.fromEntries(levels),choicesTaken,choiceKills,nextChoice:killsForChoice(choicesTaken),dashLock,dash:dashMeter(dashState),forms:Object.fromEntries(heldForms),orbitCore:orbitCore(heldForms,FORMS),traps:traps.length,turrets:enemies.filter(e=>e.type==='turret').map(e=>e.laws),pulls:pulls.length,formCombat:Object.fromEntries([...formCombats].map(([id,c])=>[id,c.state()])),discoveries:profile,guideTarget,rerollUsed,arena,escortWaves,pendingEscorts:pendingEscorts.length,cycle,region,stadium:stadium.state(),baseSlide:{time:baseSlideTime,cooldown:baseSlideCooldown,dx:baseSlideDir.x,dz:baseSlideDir.z},saveAvailable:Boolean(readCheckpoint(actStore())),autoAttack,crowdLeft,midReward,roomKills:kills-roomStartKills,vfx:vfx.state(),mode,paused,hp,stage:stage+1,room:roomFor(stage,cycle,region).name,arenaShape:arena.id||arena.shape,exit:{open:exitOpen,x:(arena.exit||EXIT).x,z:(arena.exit||EXIT).z,near:canUseExit({open:exitOpen,mode,paused,x:player.position.x,z:player.position.z,exit:arena.exit||EXIT})},mutated:[...mutated],kills,playerVisible:player.visible,touch:touch.state(),motion:{...player.userData.motion},evolution:growth.state(),artFrame:player.userData.artFrame,evolutionArt:player.userData.evolutionArt,secondaryEvolutionArt:player.userData.secondaryEvolutionArt,contactShadows:contactShadows.mesh.count,rules:[...chosen],invulnerable:invuln>0,player:{x:player.position.x,z:player.position.z},enemies:enemies.map(e=>({type:e.type,escort:Boolean(e.escort),elite:Boolean(e.elite),inScene:Boolean(e.g.parent)&&e.g.visible,phase:e.phase,hour:e.hour,bellWarn:e.bellWarn,alarms:e.alarms?.length,hp:e.hp,maxHp:e.maxHp,learned:e.learned,attacks:e.attacks,pattern:e.pattern,state:e.state,motion:{...e.g.userData.motion},facing:e.g.rotation.y,x:e.g.position.x,z:e.g.position.z})),projectiles:shots.length,enemyProjectiles:enemyShots.length,bossShots:enemyShots.filter(q=>q.boss&&q.life>0).map(q=>({x:q.ob.position.x,z:q.ob.position.z,pierce:q.pierce})),elapsed,fps:frames.length/(frames.reduce((a,b)=>a+b,0)/1000),frameMsP95:[...frames].sort((a,b)=>a-b)[Math.floor(frames.length*.95)],drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,coverBounds:obstacles.map(o=>({...o}))}),// Local QA only (localhost + ?inspect or the dev server): shorten long boss fights and hand out a potion to test the flows.
qa:{hurtBoss:fraction=>{const b=enemies.find(e=>isBoss(e)&&!e.elite&&!e.dead);if(b)damageEnemy(b,b.maxHp*fraction,false);return b?b.hp:null;},givePotion:()=>addItem(inventory,'potion',1),fillActive:()=>{activeGauge.cooldown=0;activeGauge.value=ACTIVE.max;return activeGauge.value;},showAustinTitle:()=>{seedTitle.setUnlocked(true);return seedTitle.isUnlocked();},giveForm:(id,level=4)=>{if(!Object.hasOwn(FORMS,id))return false;heldForms.set(id,level);syncForms();return true;},setLaw:(id,level)=>{if(!Object.hasOwn(LAWS,id))return false;levels.set(id,level);syncLaws();return true;},offerSolo:()=>offerSolo(finishChoice,true),giveItem:(id,n=1)=>{const got=addItem(inventory,id,n);itemBarKey='';return got;},setHp:v=>{hp=Math.max(1,Math.min(100,v));},giveCoins:(n=500)=>earnCoins(runStorage,Math.max(0,Math.floor(n))).coins,startAustin:()=>{restart();stage=4;wardensDefeated=Math.max(5,wardensDefeated);austinRoom=true;wave();return true;},startAct2Stage:value=>{const room=Math.max(0,Math.min(4,Math.floor(value)||0));developerRun=true;startRegion=ACT2_REGION;labSafe=true;restart({version:1,region:ACT2_REGION,stage:room,mode:'entry',hp:100,kills:0,elapsed:0,rules:[],mutated:[],forms:{}});return arena.id||arena.shape;}},census:()=>{const out={casters:{},meshes:0,shadowCasters:0,sprites:0,instanced:0,points:0,lines:0,lights:0,materials:new Set(),byParent:{}};scene.traverseVisible(o=>{if(o.isLight)out.lights++;if(o.isSprite)out.sprites++;else if(o.isInstancedMesh)out.instanced++;else if(o.isMesh){out.meshes++;if(o.castShadow){out.shadowCasters++;const key=(o.parent?.name||o.parent?.type||'?')+'/'+(o.name||o.geometry?.type||o.type);out.casters[key]=(out.casters[key]||0)+1;}}else if(o.isLineSegments)out.lines++;if(o.material)out.materials.add(o.material);if(o.isMesh||o.isSprite){const key=(o.parent?.name||o.parent?.type||'?')+'/'+(o.name||o.geometry?.type||o.type);out.byParent[key]=(out.byParent[key]||0)+1;}});out.materials=out.materials.size;out.behindCover=enemies.filter(e=>behindCover(e.g.position)).length;out.obstacles=obstacles.length;out.byParent=Object.fromEntries(Object.entries(out.byParent).sort((a,b)=>b[1]-a[1]).slice(0,25));out.programs=renderer.info.programs?.length;return out;},worldToScreen:(x,z)=>{let p=new V(x,.5,z).project(camera);const r=renderer.domElement.getBoundingClientRect();return {x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2};}};

// A local screenshot hook for checking every Act-2 room without playing through a full run.
if(localInspection&&new URLSearchParams(location.search).has('roomLab'))setTimeout(()=>window.seedDebug?.qa.startAct2Stage(Number(new URLSearchParams(location.search).get('roomLab'))),1200);

// Visible local-only controls for CUA testing; absent on the public host.
function startDuoInspection(){restart();cycle=5;stage=4;wardensDefeated=5;austinsDefeated=1;austinRoom=false;heldForms.set('infiniteprism',6);syncForms();wave();}
if(localInspection&&new URLSearchParams(location.search).has('bossLab')){
 const lab=document.createElement('aside');lab.id='boss-lab';lab.style.cssText='position:fixed;top:6px;left:6px;z-index:30;background:#102020dd;padding:4px;font-size:10px';
 lab.innerHTML='<span>로컬 합성 검사 · 랭킹 전송 없음</span><button id="lab-austin">오스틴 바로</button><button id="lab-duo">쌍문지기 검사</button><button id="lab-coins">상점 500원</button><button id="lab-choice">선택 12처치</button><button id="lab-hurt">보스 다음 단계</button><button id="lab-heal">검사 생명 회복</button><button id="lab-safe">검사 보호 꺼짐</button><button id="lab-active">오버드라이브 준비</button><button id="lab-portal">차원 융합 준비</button><button id="lab-title">오스틴 칭호</button><button id="lab-dash">회피 진화 선택</button><button id="lab-solo-card">단독 선택 이미지</button><button id="lab-solo">단독 진화 외형</button><button id="lab-fusion">완성 진화 외형</button><button id="lab-second">재융합 선택</button><button id="lab-orbit">공전 5종 외형</button><button id="lab-mix">진화 겹침</button><button id="lab-awaken">각성 선택</button><button id="lab-twin">쌍둥이 각성 선택</button>';
 lab.querySelector('#lab-duo').onclick=startDuoInspection;
 const fusionArtIds=Object.keys(FIRST_FORMS),secondPairs=[['prism','f02-reflect-chain'],['prism','thunderlance']],orbitArtIds=['base','starring','frostguard','stormcrown','mirrorguard'];let soloArtIndex=0,fusionArtIndex=0,secondArtIndex=0,orbitArtIndex=0;document.body.append(lab);lab.querySelector('#lab-austin').onclick=()=>window.seedDebug.qa.startAustin();lab.querySelector('#lab-coins').onclick=()=>window.seedDebug.qa.giveCoins(500);lab.querySelector('#lab-choice').onclick=()=>{if(mode!=='playing')restart();kills+=12;choiceKills=12;choicesTaken=1;score+=120;hp=68;addItem(inventory,'potion',1);runBonusOffer=runBonusOffers(runBonuses,{hp,choicesTaken});cardChoice(true,['reflect','split','chain']);};lab.querySelector('#lab-hurt').onclick=()=>window.seedDebug.qa.hurtBoss(1);lab.querySelector('#lab-heal').onclick=()=>window.seedDebug.qa.setHp(100);lab.querySelector('#lab-safe').onclick=()=>{labSafe=!labSafe;lab.querySelector('#lab-safe').textContent=labSafe?'검사 보호 켜짐':'검사 보호 꺼짐';};lab.querySelector('#lab-active').onclick=()=>{window.seedDebug.qa.giveForm('collapse',5);window.seedDebug.qa.giveForm('prism',5);window.seedDebug.qa.fillActive();};lab.querySelector('#lab-portal').onclick=()=>{heldForms.clear();window.seedDebug.qa.giveForm('f09-reflect-portal',5);window.seedDebug.qa.fillActive();$('#toast').textContent='외형 검사 · 차원경 개문';};lab.querySelector('#lab-title').onclick=()=>window.seedDebug.qa.showAustinTitle();lab.querySelector('#lab-dash').onclick=()=>{dashState=createDashState();dashRewardPending=true;offerDashEvolution(()=>{mode='playing';$('#overlay').hidden=true;});};lab.querySelector('#lab-solo-card').onclick=()=>{for(const form of Object.values(SOLO_FORMS))levels.set(form.requires[0],5);syncLaws();offerSolo(finishChoice,true);};lab.querySelector('#lab-solo').onclick=()=>{const id=Object.keys(SOLO_FORMS)[soloArtIndex++%Object.keys(SOLO_FORMS).length];heldForms.clear();heldForms.set(id,5);syncForms();$('#toast').textContent=`외형 검사 · ${FORMS[id].name}`;};lab.querySelector('#lab-fusion').onclick=()=>{const id=fusionArtIds[fusionArtIndex++%fusionArtIds.length];heldForms.clear();heldForms.set(id,5);syncForms();$('#toast').textContent=`외형 검사 · ${FORMS[id].name}`;};lab.querySelector('#lab-second').onclick=()=>{const pair=secondPairs[secondArtIndex++%secondPairs.length];heldForms.clear();for(const id of pair)heldForms.set(id,5);syncForms();promptedSecond.clear();offerSecondFusion(finishChoice,true);};lab.querySelector('#lab-orbit').onclick=()=>{const id=orbitArtIds[orbitArtIndex++%orbitArtIds.length];heldForms.clear();syncForms();chosen.delete('orbit');if(id==='base'){levels.set('orbit',1);chosen.add('orbit');LS=lawStats(levels);}else{heldForms.set(id,5);syncForms();}$('#toast').textContent=id==='base'?'외형 검사 · 기본 공전 씨앗잎':`외형 검사 · ${FORMS[id].name}`;};lab.querySelector('#lab-awaken').onclick=()=>{heldForms.clear();heldForms.set('collapse',5);heldForms.set('blackhole',5);heldForms.set('flarebloom',4);syncForms();promptedAwaken.clear();offerAwaken(finishChoice,true);};lab.querySelector('#lab-twin').onclick=()=>{heldForms.clear();heldForms.set('glassspear',5);heldForms.set('blackhole',5);syncForms();promptedAwaken.clear();offerAwaken(finishChoice,true);};lab.querySelector('#lab-mix').onclick=()=>{heldForms.clear();heldForms.set('collapse',6);heldForms.set('winterbreath',7);heldForms.set('prism',7);syncForms();activeGauge.value=ACTIVE.max;$('#toast').textContent='대표 겨울 숨결 · 보조 프리즘 가시';};
}

import {createModeBossOutbox} from './mode-boss-outbox.js';
import {journeyRunId} from './journey-run-id.js';
import {addJourneyBossReceipt} from './journey-boss-receipts.js';
import {recordModeBossVictory,MODE_BOSSES} from './mode-boss-titles.js';
import {emptyRelics,normalizeRelics,relicOffers,relicLawStats,relicFormScale,relicEffect,equipRelic,wardenRelicDrop,relicSplitAngle,RELICS} from './relics.js';
import {showRelicChoice} from './relic-ui.js';
import {relicArt} from './relic-art.js';
import {itemArt} from './item-art.js';
import {createPauseBuild} from './pause-build.js';
import {advanceFrame,paceTrusted,createFramePacer} from './frame-time.js';
import {formArt} from './form-art.js';
import {buildCoverArt,buildStadiumCoverArt} from './world-art.js';
// FORMS here means every live evolution the seed can hold: authored first fusions, solo evolutions and awakenings.
import {ALL_FORMS as FORMS,FORMS as FIRST_FORMS,SOLO_FORMS,TWIN_FORMS,DISCOVERY_FORMS,eligibleForms,formUpgradeLine,soloReady,attackPartsOf,isTwinForm,SECOND_FORMS} from './forms.js';
import {createActiveGauge,chargeActive,killCharge,bossCharge,startActive,tickActive,cancelActive,activeState,ACTIVE,SIGNATURES} from './actives.js';
import {ACTIVE_BUTTON_HTML,ACTIVE_EFFECT_HTML,renderActiveButton,announceActive,announceFinale} from './active-ui.js';
import {createActiveVFX} from './active-vfx.js';
import {QUALITY_KEY,QUALITY_LEVELS,QUALITY_NAMES,initialQuality,resetAutoLowered,renderPixelRatio} from './quality.js';
import {DASH_EVOLUTIONS,createDashState,tickDash,spendDash,dashMeter,dashEvolutionCards} from './dash-evolution.js';
// Forms that fly as a projectile can be stopped by a shield's face; area and orbit forms go around it.
// Movement and seed-shot tempo (2026-09-15: +5% each; were 5.8, 13.8 and 9.2). Dash, enemy shots and evolution bolts are unchanged.
const PLAYER_SPEED=5.8*1.05,SHOT_SPEED=13.8*1.05,FRAGMENT_SPEED=9.2*1.05;
const DIRECT_FORMS=new Set(['returnblade','prism','thunderlance','seedstorm','mirrorguard','gravitymirror','blastlance','frostkaleidoscope','lightningpetal','returnflare','mirrormaze','fullbloom','glassspear','rewind','icicle','refractlance','halobloom','sunmirror','pierceshower','rimeback','rimepetal','echolane']);
import {readDiscoveries,writeDiscoveries,recordDiscovery,growthGuide,rerollUnlocked} from './discoveries.js';
import {createCombatAnalysis,recordPersonalBests,combatGrade} from './combat-analysis.js';
import {createFormCombat} from './form-combat.js';
import {createTwinInteractionEngine} from './twin-interactions.js';
import {formCard,soloCard,awakenCard,secondFusionCard,discoveryBook,formLawHint} from './form-ui.js';
import {buildArenaBoundary,arenaFor,constrainToArena,reflectArenaBoundary,safeArenaSpawn,shouldBuildArenaBoundary} from './arena.js';
import {escortWave,escortTypes} from './boss-escorts.js';
import './forms.css';
import './final-identity-art.css';
import './combo-art.css';
import './dash-evolution.css';
import {ACTOR_ART_GEOMETRIES,ACTOR_MOTION_GEOMETRIES,ACTOR_THREAT_GEOMETRIES,configureActorArt,configureOcclusion,attachActorArt} from './actor-art.js';
import {attachBossActionRig} from './boss-action-rig.js';
import {BOSS_PETS,createBossPet,readBossPet,unlockedBossPets,writeBossPet} from './boss-pets.js';
import {createSpatialIndex} from './spatial-index.js';
import {createShield,tickShield,blocksShield} from './shield.js';
import {readCheckpoint,writeCheckpoint,clearCheckpoint,roomExitCheckpoint,difficulty,replaceLaw,REGION_NAMES,restoredScore,restoredWardens,restoredAustins} from './run-save.js';
import {createExpansionEntry,createExpansionSaveStore,expansionExitCheckpoint} from './expansion-run-save.js';
import {acquireExpansionSaveLease} from './expansion-save-lease.js';
import {createExpansionAccountEntry,createExpansionAccountSaveStore,expansionAccountEligible,expansionAccountExitCheckpoint} from './expansion-account-save.js';
import {createExpansionAccountSync} from './expansion-account-sync.js';
import {createExpansionPublicCampaign,completeExpansionPublicBoss,advanceExpansionPublicCampaign,settleExpansionPublicTitles,expansionCampaignBoss,EXPANSION_CAMPAIGN_CLEARS} from './expansion-public-campaign.js';
import {createSeedBody} from './seed-body.js';
import {createSeedTitle,AUSTIN_TITLE,AUSTIN_TITLE_PERK,ALWAYS_BEGINNER_TITLE,ALWAYS_BEGINNER_TITLE_PERK} from './seed-title.js';
import {codexNews,CODEX,AUSTIN_CLEAR_TITLE,AUSTIN_VETERAN_TITLE,ALWAYS_CLEAR_TITLE,ALWAYS_VETERAN_TITLE,JOHAN_TITLE,JOHAN_CLEAR_TITLE,JOHAN_VETERAN_TITLE,CLEAR_ALL_STATS} from './titles.js';
import {ACT2_REGION,ACT2_NAME,ACT2_PRESSURE,isAct2,actOf,act2Unlocked,act2Available,playableRegion,actStorage} from './act2.js';
import {ACT2_ART,ACT2_GEOMETRIES,isAct2Minion,createAct2Minion,tickAct2Minion,catcherReturn} from './act2-enemies.js';
import {ACT2_WARDENS,ACT2_WARDEN_ART,act2WardenEncounter,createAct2Warden,tickAct2Warden,act2WardenHint} from './act2-wardens.js';
import {ALWAYS_BEGINNER,ALWAYS_BEGINNER_ART,ALWAYS_PHASES,createAlwaysBeginner,tickAlwaysBeginner,damageAlwaysBeginner,alwaysBeginnerHint,alwaysBeginnerPatternName} from './always-beginner.js';
import {baseSlideFor,stadiumBaseAt,BASE_SLIDE,STADIUM_BASES,createStadium} from './stadium.js';
import {RELAY,createRelayRig,isRelayPart,relayName,relayPotionDrop,relayRoom,stopRelay,tickRelayRig} from './act2-relay.js';
import {ACT3_REGION,ACT3_NAME,ACT3_PRESSURE,act3RoomPressure,isAct3,act3Unlocked,act3Available,playableAct3Region,act3Storage,act3CrowdType,act3ReinforcementSpawn,act3SupplyDrop} from './act3.js';
import {ACT3_GEOMETRIES,ACT3_MATERIALS,ACT3_ART,isAct3Minion,createAct3Minion,tickAct3Minion,createAct3Warden,tickAct3Warden,TEMPEST_CARRIER,createTempestCarrier,tickTempestCarrier,damageTempestCarrier,act3BossHint,act3BossPatternName} from './act3-enemies.js';
import {createSkyway} from './skyway.js';
import * as expansionRuntime from './expansion-journey.js';
import {createSurvivalExpansion,migrateSurvivalToFiveActs} from './survival-expansion.js';
import {EXPANSION_ACTS,expansionCircuitReleased,publicCircuitActCount} from './act-expansion.js';
import {expansionJourneyResult,expansionRankView} from './expansion-journey-result.js';
import {expansionActorArt,expansionEnemyArt} from './expansion-actor-art.js';
let expansionApi=expansionRuntime,survivalExpansion=null;
import {createContactShadows} from './contact-shadows.js';
import {MIRROR_ATTACK_CADENCE,MIRROR_BREAK,MIRROR_GUARD,mirrorDamageAllowed,MIRROR_TRIAL_PROTOTYPE,clearMirrorCheckpoint,mirrorAttackCooldown,mirrorFloorRules,readMirrorCheckpoint,refundMirrorAttackCooldown,readMirrorRecord,recordMirrorResult,writeMirrorCheckpoint} from './mirror-trial.js';
import {MIRROR_ARENA,MIRROR_BURST,MIRROR_VIEW,buildMirrorObstacleArt,createMirrorFighter,createMirrorPanels,mirrorFloorObstacles,mirrorProjectileSpeed,reflectMirrorPanels,tickMirrorFighter} from './mirror-fighter.js';
import {projectileVisualScale,applyProjectileTheme} from './projectile-art.js';
import {activeCombatEvolutions,orbitCore,isOrbitEvolution,canAcquireEvolution,orbitShieldRole} from './evolution-family.js';
import {lawArt} from './law-art.js';
import * as THREE from 'three';
import {SURVIVAL,SURVIVAL_BASES,SURVIVAL_SLIDE,SURVIVAL_ACTS,survivalAct,survivalActTime,survivalScaling,advanceSurvivalAct,createSurvivalSession,survivalPressure,tickSurvivalRush,survivalEnemySpec,survivalSpawn,survivalChoiceKills,takeSurvivalSupply,tickSurvival,settleSurvivalKill,survivalBossOrdinal,survivalOutcome,readSurvivalRecord,recordSurvivalResult} from './survival-rules.js';
import {createSurvivalSaveStore,captureCombatFields,restoreCombatFields,captureSurvivalSession,queueSurvivalTitle,settleSurvivalTitles,survivalTitleEvents,SURVIVAL_TITLE_LIMIT} from './survival-save.js';
import {createSurvivalSync,survivalSyncLabel} from './survival-sync.js';
import {createSurvivalArt} from './survival-art.js';
import {mountSurvivalComparison} from './survival-readability.js';
import './survival.css';
import {SURVIVAL_BENCHES,createSurvivalBenchmark,survivalBenchmarkPick,survivalBenchmarkMove,sampleSurvivalBenchmark} from './survival-benchmark.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import './style.css';
import './journey.css';
import {ROOMS,EXIT,LAW_NAMES,rewardOptions,canUseExit,roomFor,FINAL_BOSS_CAP,MAX_RUN_CYCLE,bossCapReached} from './journey.js';
import {createWarden,tickWarden,wardenVariantFor,wardenEncounter,DUO_WARDEN,WARDEN_VARIANTS,SEAL} from './warden.js';
import {AUSTIN,PHASES,AUSTIN_ARENA,AUSTIN_ART,createAustin,tickAustin,damageAustin,austinHint,austinPatternName,createClockFloor} from './austin.js';
import {killPoints,roomPoints,submitScore,readRanking,lastName,saveName,cleanName,escapeHtml,rankingTable,formatScore,NAME_MAX,formatTime,clearBonus,CLEAR_BONUS} from './score.js';
import {createOnlineRanking,SEASON,ACT,runAct,FIREBASE} from './online-ranking.js';
import {createSurvivalRanking} from './survival-ranking.js';
import {createDefenseRanking,defenseRankEntry,parseDefenseTowers} from './defense-ranking.js';
import {createRankingRetry} from './ranking-retry.js';
import {createAdventureRanking,createDuelRanking,createPuzzleRanking,adventureRankEntry,duelRankEntry,puzzleRankEntry} from './mode-ranking.js';
import {survivalRecordStorage,readSurvivalAccountRecord,createSurvivalRecordSync} from './survival-record-sync.js';
import {GARDEN_KEY,readGarden,writeGarden,normalizeGarden,autoPlantSeeds,gardenEffects,harvestFromRun,addHarvest,growPlants,harvestLine,activeSlots,centerInfo,SEEDS,grantBossMastery,masteryLine,MASTERY_STEP,MASTERY,dominantLaw} from './garden.js';
import {expansionBossTreeReward} from './expansion-garden-reward.js';
import {rollTreeReward,waterTree,TREE_SEEDS,TREE_RARITY} from './tree-of-life.js';
// 보스 방에 들어올 때까지 받은 피해(그 뒤로 더 맞지 않고 이기면 '노히트' — 전설 씨앗 조건).
let bossFightDamage0=0;
import {GARDEN_THEMES,themeUnlocked,themeItemCount} from './garden-themes.js';
import {spotsFilled} from './garden-spots.js';
import {renderGardenPanel,renderGardenPeek} from './garden-ui.js';
import {createGardenScene} from './garden-scene.js';
import {PATCH_NOTES,hasUnseenNotes,markNotesSeen,latestNoteId} from './patch-notes.js';
import {MAINTENANCE} from './maintenance.js';
const maintenanceOn=MAINTENANCE.on&&!import.meta.env.DEV;
import {isBadName} from './name-filter.js';
import {MUTATIONS,RUNE,TUNE,MAX_SHOTS,parseMutationChoice,withMutationOffer,applyMutation,mutationOf,hasMutation,
 mutationsToSave,mutationsFromSave,mutationLabel,reflectBounceSpeed,chainRange,chainFalloff,fragmentSpeedScale,fragmentExtraLife} from './mutations.js';
import {buildRecord,parseBuild,bossText,buildText} from './ranking-build.js';
import {ITEMS,ITEM_ORDER,emptyInventory,startingInventory,normalizeInventory,addItem,useItem,tryRevive,austinDrops,goldenFruitPotion,turretPotionDrop,nextHeld,heldItems,usable} from './inventory.js';
import {SHOP_STOCK_MAX,SHOP_PRICES,STASH_ITEMS,STASH_ORDER,readShop,earnCoins,spendCoins,buyTonics,setCarry,claimCarry,grantGift,grantGiftSet,stashItem} from './shop.js';
import {SUPPORT_RELEASED,SUPPORT_PRODUCTS,supportRewardLines,supportPriceLabel,supportRoom} from './support.js';
import {createBilling,completeSupportPurchase,recoverSupportPurchases} from './billing.js';
import './shop.css';
import './ranking.css';
import {SLOT_CAP,killsForChoice,levelOf,damageScale,consumedUpgrades,FUSION_BONUS_KEEP,lawStats,offerChoices,chooseLaw,levelsFromSave,levelsToSave,upgradeLine,offeredForm,offeredFusion,slotsUsed,fusionLevel,canFuse,fuse,secondFusionOptions,secondFusionLevel,fuseSecond,evolveSolo,effectiveLevels,baseShotLevels,buildLevel,awakenOptions,awakenLevel,awaken} from './progression.js';
import {createTurret,tickTurret,turretSpots,copiedLaws,TURRET} from './turret.js';
import {trapsFor,tickTrap,createTrapVisuals,trapPhase} from './traps.js';
import './feedback.css';
import './combat-analysis.css';
import './mobile.css';
import './choice.css';
import './account.css';
import './developer-lab.css';
import {mountDeveloperLab} from './developer-lab-view.js';
import {setupMobileApp} from './mobile-app.js';
import {createNativeUpdateGate} from './native-update.js';
import './native-update.css';
import './dungeon-menu.css';
import {accountRole,accountCanRank,rankingDecision,classifySubmitError,logRankingFailure} from './ranking-eligibility.js';
import {createPerfMonitor,describeEnvironment,saveSession,uploadSession,S as PS,E as PE} from './perf-monitor.js';
import {mountPerfDevMenu} from './perf-dev-menu.js';
import {createProjectileSprites,projectileCellGeometry} from './projectile-sprites.js';
import {createAccountAuth,FIREBASE_APP} from './account-auth.js';
import {anonymousTelemetrySession,createWebTelemetry} from './web-telemetry.js';
import {readUsageDays,usageTotals,usageModeTotals,USAGE_MODE_NAMES} from './usage-dashboard.js';
import {createCloudSync} from './cloud-sync.js';
import {CLOUD_OWNER_KEY,readCheckpointBackups,setCheckpointBackup} from './cloud-save.js';
import {readAccountProfile,writeAccountProfile,recordBestScore,accountBadgeLine,BADGES} from './account-profile.js';
import {claimFirstGardenPioneer,legacyRankingUid} from './legacy-honor.js';
import {publicWebBetaLocked,BETA_NOTICE} from './beta-access.js';
import {BETA_TEST_URL} from './beta-signup.js';
import {DEFAULT_SEASON_STATUS,gameplayIsPaused,isSeasonAdmin,isBetaTester,loadSeasonStatus} from './season-access.js';
import {bindPointerAction,createTouchControls} from './touch.js';
import {createGameAudio,musicSceneFor,ultimateAudioEvent} from './audio.js';
import {applyFrostContact} from './frost-status.js';
import {RUN_BONUSES,emptyRunBonuses,normalizeRunBonuses,runBonusOffers,rareRunBonusOffers,rareRunBonusChance,applyRunBonus,runBonusSummary,moveScale as runMoveScale,cadenceScale as runCadenceScale,cadenceInterval as runCadenceInterval,powerScale as runPowerScale} from './run-bonuses.js';
import {rankingTermsAccepted,setRankingTermsAccepted,blockRankingUser,visibleRanking,rankingReportMailto} from './ranking-safety.js';
import {responsiveView} from './responsive-view.js';
import {createCameraFeel} from './camera-feel.js';
const revealApp=()=>document.documentElement.classList.add('seed-loaded');
const mobileDevice=matchMedia('(any-pointer: coarse)').matches||navigator.maxTouchPoints>0||(typeof location!=='undefined'&&['localhost','127.0.0.1'].includes(location.hostname)&&new URLSearchParams(location.search).has('touchPreview'));
let rawStorage;try{rawStorage=window.localStorage;}catch{rawStorage=null;}
const account=createAccountAuth({storage:rawStorage});
const cloud=createCloudSync({storage:rawStorage,account,onSynced:()=>{
 cloudSaveFailed=false;
 document.querySelector('.cloud-save-warning')?.remove();
}});
const runStorage=cloud.storage;
const webTelemetry=createWebTelemetry({
 enabled:!import.meta.env.DEV&&(account.native||location.hostname==='kukuma1004.github.io'),
 platform:account.native?'android':'web',
 databaseURL:FIREBASE_APP.databaseURL,
 session:()=>anonymousTelemetrySession(FIREBASE_APP)
});
import {createMotion} from './motion.js';
import {createVFX,FX_COLORS,VFX_ATLAS_FILE} from './vfx.js';
import {createShotAuras,shotAuraLook,SHOT_ATLAS_FILE} from './shot-auras.js';
import {FLOOR_ATLAS_FILE,floorSlabVariant,floorSlabUV} from './floor-art.js';
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
const survivalComparisonEnabled=localInspection&&new URLSearchParams(location.search).has('survivalArt');
let survivalReadability=survivalComparisonEnabled&&new URLSearchParams(location.search).get('survivalArt')!=='classic',survivalComparison=null,survivalVisualTime=0;
const localAdminLab=localInspection&&new URLSearchParams(location.search).has('adminLab');
let seasonStatus=DEFAULT_SEASON_STATUS,adminMode=false,betaTesterMode=false,developerRun=false,developerForm='';
const gameplayPaused=()=>gameplayIsPaused({status:seasonStatus,native:account.native,admin:adminMode||betaTesterMode,dev:import.meta.env.DEV});
const refreshAccessMode=async()=>{const user=account.user();adminMode=localAdminLab||await isSeasonAdmin(user);betaTesterMode=!adminMode&&await isBetaTester(user);return adminMode||betaTesterMode;};
const WEB_ACCESS_POLL_MS=15_000;
let webAccessCheck=null;
const inspection=localInspection?document.createElement('pre'):null;if(inspection){inspection.id='seed-inspection';inspection.hidden=!new URLSearchParams(location.search).has('perfLab');inspection.setAttribute('aria-label','로컬 실행 성능');document.body.append(inspection);}
resetAutoLowered(runStorage,{mobile:mobileDevice});
let qualityLevel=initialQuality({search:location.search,stored:(()=>{try{return runStorage.getItem(QUALITY_KEY);}catch{return null;}})(),mobile:mobileDevice});
// A 512px directional atlas is still sharper than its in-game footprint and
// cuts decoded actor texture memory to one quarter on phones and tablets.
configureActorArt({reducedTextures:mobileDevice});
let combatTheme=readTheme(runStorage);
// Mobile pixels are already softened by DPR and post-processing. Context MSAA cost more fill-rate than it returns there.
const renderer=new THREE.WebGLRenderer({canvas:$('#game'),antialias:qualityLevel>1&&!mobileDevice,powerPreference:'high-performance'});renderer.debug.checkShaderErrors=!import.meta.env.PROD;renderer.setPixelRatio(Math.min(devicePixelRatio,QUALITY_LEVELS[qualityLevel].pixelRatio));renderer.shadowMap.enabled=true;renderer.shadowMap.type=qualityLevel<2?THREE.PCFShadowMap:THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
// Shadows come from the fixed sun onto a mostly static room; actors use contact shadows. The shadow map is redrawn a few times a
// second (and at once on room or quality changes) instead of every frame, which removes a whole scene pass on phones (2026-09-15).
const SHADOW_REFRESH=.25,OCCLUSION_REACH=3;let shadowClock=SHADOW_REFRESH;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
// Phones under memory pressure can drop the WebGL context: the picture freezes or goes black, which players see as the game crashing.
// Stop the run and reload once the browser gives the context back (or on a tap). Quality is never lowered automatically
// (2026-09-21 사용자 결정); the notice tells the player where to lower it if it keeps happening.
// The run continues from the saved room entrance, so only the current room is replayed.
renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();if(mode==='playing'&&!paused)paused=true;
 const box=document.createElement('div');box.id='context-lost';box.innerHTML='<div><strong>그래픽 메모리가 부족해서 화면이 멈췄어요</strong><span>다시 불러와요 · 방 입구부터 이어서 할 수 있어요 · 자주 멈추면 일시정지 메뉴에서 화질을 낮춰 주세요</span><button class="primary">다시 불러오기</button></div>';
 box.querySelector('button').onclick=()=>location.reload();document.body.append(box);},false);
renderer.domElement.addEventListener('webglcontextrestored',()=>location.reload(),false);
const scene=new THREE.Scene();scene.background=new THREE.Color('#2a4550');scene.fog=new THREE.FogExp2('#2d4a55',.011);
// Higgsfield 이펙트 아틀라스(2026-09-21 첫 시험). 로컬 점검에서 ?vfxtex=0 이면 예전 조각으로 그려 전후를 비교한다.
// 불러오자마자 GPU에 올려 첫 폭발 때 멈칫하지 않게 한다. 그림이 오기 전에도 재질은 같아서 셰이더가 다시 컴파일되지 않는다.
const vfxAtlas=localInspection&&new URLSearchParams(location.search).get('vfxtex')==='0'?null:new THREE.TextureLoader().load(import.meta.env.BASE_URL+VFX_ATLAS_FILE,texture=>renderer.initTexture(texture));
// 빛 소재라 밝기 값을 그대로 쓴다(sRGB로 풀면 부드러운 테두리가 너무 어두워져 조각이 작고 흐리게 보였다).
if(vfxAtlas)vfxAtlas.colorSpace=THREE.NoColorSpace;
const vfx=createVFX(scene,{mobile:mobileDevice,theme:combatTheme,quality:qualityLevel,atlas:vfxAtlas});
// Higgsfield 탄환 소재(2026-09-22): 씨앗 탄 뒤에 법칙 빛 무늬와 꼬리를 겹친다. ?vfxtex=0 이면 함께 꺼진다(전후 비교).
const shotAtlas=vfxAtlas&&!(localInspection&&new URLSearchParams(location.search).get('shotaura')==='0')?new THREE.TextureLoader().load(import.meta.env.BASE_URL+SHOT_ATLAS_FILE,texture=>renderer.initTexture(texture)):null;
if(shotAtlas)shotAtlas.colorSpace=THREE.NoColorSpace;
const shotAuras=createShotAuras(scene,{atlas:shotAtlas,capacity:(MAX_SHOTS+90)*2,mobile:mobileDevice}),auraList=[],projectileBodyList=[],shotAurasOn=Boolean(shotAtlas);
let playerTrailInterval=mobileDevice?.075:.045;
const activeVfx=createActiveVFX(scene,{mobile:mobileDevice,theme:combatTheme,quality:qualityLevel,spriteAtlas:vfxAtlas});
const camera=new THREE.PerspectiveCamera(39,1,.1,100);const look=new V(0,0,0);camera.position.set(16,22,22);camera.lookAt(look);
vfx.setCamera(camera);
const composer=new EffectComposer(renderer);const renderPass=new RenderPass(scene,camera);composer.addPass(renderPass);const bloomPass=new UnrealBloomPass(new THREE.Vector2(1,1),.42,.5,1.1);composer.addPass(bloomPass);const outputPass=new OutputPass();composer.addPass(outputPass);
// 채도 +20%(2026-09-21 사용자 결정): 톤 매핑 뒤 화면 색 변환 직전에 한 줄. 이미 매 프레임 도는 출력 단계라 따로 한 번 더 그리지 않는다.
// 화질 '낮음'(블룸 꺼짐)도 같은 출력 단계를 거쳐 모든 화질의 색이 같다.
const COLOR_SATURATION=1.2;
outputPass.material.uniforms.seedSaturation={value:COLOR_SATURATION};
outputPass.material.fragmentShader=outputPass.material.fragmentShader.replace('uniform sampler2D tDiffuse;','uniform sampler2D tDiffuse;\nuniform float seedSaturation;').replace('// color space','gl_FragColor.rgb=max(mix(vec3(dot(gl_FragColor.rgb,vec3(.2126,.7152,.0722))),gl_FragColor.rgb,seedSaturation),0.);\n// color space');
outputPass.material.needsUpdate=true;
const pmrem=new THREE.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(new RoomEnvironment(),.04).texture;scene.environmentIntensity=.35;
scene.add(new THREE.HemisphereLight(0xcfe3ea,0x44564a,1.5));let sun=new THREE.DirectionalLight(0xffedcf,2.2);sun.position.set(-9,17,6);sun.castShadow=true;sun.shadow.mapSize.set(QUALITY_LEVELS[qualityLevel].shadowSize,QUALITY_LEVELS[qualityLevel].shadowSize);Object.assign(sun.shadow.camera,{left:-16,right:16,top:16,bottom:-16,far:50});sun.shadow.normalBias=.035;scene.add(sun);
// 2026-09-29 처음 화면 그림(사용자가 GPT로 받은 home-v2): 메뉴 화면 뒤에 깔고, 그림이 화면을 덮는 동안은 3D를 그리지 않는다(배터리).
// 그림을 못 불러오면 예전처럼 3D 정원이 보인다. CSS 변수 속 상대 주소는 CSS 파일(assets/) 기준으로 풀려 assets/assets/가 되므로 절대 주소로 넣는다. 3D 정원은 정원 → 생명의 나무에서 그대로.
const MENU_ART=import.meta.env.BASE_URL+'assets/menu/home-v2.webp';let menuArtReady=false;
{const im=new Image();im.onload=()=>{menuArtReady=true;document.documentElement.style.setProperty('--menu-art',`url("${new URL(MENU_ART,document.baseURI).href}")`);document.body.classList.add('menu-art');};im.src=MENU_ART;}
function menuArtCovers(){const o=document.getElementById('overlay');return menuArtReady&&!!o&&!o.hidden&&o.classList.contains('menu-screen')&&!o.classList.contains('survival-overlay');}
const texloader=new THREE.TextureLoader(), stone=texloader.load(import.meta.env.BASE_URL+'assets/garden-stone-v4.png'),normal=mobileDevice?null:texloader.load(import.meta.env.BASE_URL+'assets/garden-stone-normal.png');stone.colorSpace=THREE.SRGBColorSpace;for(let t of [stone,normal].filter(Boolean)){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(.34,.34);t.anisotropy=mobileDevice?2:8;}
// Higgsfield 1막 바닥(2026-09-22): 판석 4종 2×2 아틀라스(PC 1024 · 휴대폰 512). ?vfxtex=0 이면 예전 돌 그림(전후 비교, 로컬 점검 전용).
const floorArt=!(localInspection&&new URLSearchParams(location.search).get('vfxtex')==='0');
const floorTex=floorArt?texloader.load(import.meta.env.BASE_URL+(mobileDevice?'assets/mobile/':'assets/')+FLOOR_ATLAS_FILE,texture=>renderer.initTexture(texture)):null;
if(floorTex){floorTex.colorSpace=THREE.SRGBColorSpace;floorTex.anisotropy=mobileDevice?2:8;}
const mats={stone:new THREE.MeshStandardMaterial({color:0xb8c9c3,map:stone,roughness:.88,metalness:.02}),dark:new THREE.MeshStandardMaterial({color:0x667c75,roughness:.9,map:stone}),root:new THREE.MeshStandardMaterial({color:0x3b3528,roughness:.9}),leaf:new THREE.MeshStandardMaterial({color:0x3e6242,roughness:.72,side:THREE.DoubleSide}),jade:new THREE.MeshStandardMaterial({color:0x91f2c0,emissive:0x38ffb0,emissiveIntensity:2.8,roughness:.2}),amber:new THREE.MeshStandardMaterial({color:0xffdb83,emissive:0xff970f,emissiveIntensity:3}),orbitPetal:new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,emissive:0x4ccf83,emissiveIntensity:.55,roughness:.38,metalness:.08}),armor:new THREE.MeshStandardMaterial({color:0xd7cbae,map:stone,roughness:.57}),enemy:new THREE.MeshStandardMaterial({color:0xa48969,map:stone,roughness:.7}),black:new THREE.MeshStandardMaterial({color:0x536160,map:stone,roughness:.5}),cover:new THREE.MeshStandardMaterial({color:0xa1a28c,map:stone,roughness:.85}),enemyBolt:new THREE.MeshStandardMaterial({color:0x3a0710,emissive:0xff2a3c,emissiveIntensity:2.4,roughness:.35}),enemyHalo:new THREE.MeshBasicMaterial({color:0xff4050,transparent:true,opacity:.85,side:THREE.DoubleSide,forceSinglePass:true,depthWrite:false,toneMapped:false}),bossBolt:new THREE.MeshStandardMaterial({color:0x22021a,emissive:0xd21cff,emissiveIntensity:2.8,roughness:.3}),bossHalo:new THREE.MeshBasicMaterial({color:0xff3cc8,transparent:true,opacity:.9,side:THREE.DoubleSide,forceSinglePass:true,depthWrite:false,toneMapped:false}),frostBolt:new THREE.MeshStandardMaterial({color:0x0a2436,emissive:0x5fd8ff,emissiveIntensity:2.4,roughness:.3})};
function tintGeometry(geometry,color){const g=geometry.index?geometry.toNonIndexed():geometry,c=new THREE.Color(color),values=new Float32Array(g.getAttribute('position').count*3);for(let i=0;i<values.length;i+=3){values[i]=c.r;values[i+1]=c.g;values[i+2]=c.b;}g.setAttribute('color',new THREE.BufferAttribute(values,3));return g;}
const baseOrbitGeo=projectileCellGeometry(4);baseOrbitGeo.name='seed-law-orbit-petal-2d';
const sharedDynamicMaterials=new Set([...Object.values(mats),...Object.values(ACT3_MATERIALS)]);
// Enemy bolts, tells and rings reuse these instead of creating and uploading new buffers for every shot and spawn.
const enemyGeos={tellHound:new THREE.PlaneGeometry(.9,4.8),tellCaster:new THREE.RingGeometry(1.1,1.3,48)},ringGeos=new Map();
const sharedGeometries=new Set([...Object.values(ACT2_GEOMETRIES),...Object.values(ACT3_GEOMETRIES),...Object.values(enemyGeos),baseOrbitGeo,...Object.values(ACTOR_ART_GEOMETRIES),...ACTOR_MOTION_GEOMETRIES,...ACTOR_THREAT_GEOMETRIES]);
function release(object){disposeObject(object,sharedDynamicMaterials,sharedGeometries);}
function releaseEnemy(e){release(e.g);if(e.world)release(e.world);}
// All moving projectiles now share flat painterly atlas batches.
const projectileSprites=createProjectileSprites(scene,camera,{mobile:mobileDevice,baseUrl:import.meta.env.BASE_URL,capacity:MAX_SHOTS+480,haloAtlas:vfxAtlas,onReady:texture=>renderer.initTexture(texture)});
// ---------------- 셰이더 미리 준비 ----------------
// 메뉴에서는 정원 장면만 그려서, 전투 장면의 셰이더가 판을 시작하는 순간 한꺼번에 컴파일되며 멈췄다
// (2026-09-21 휴대폰 흉내 측정: 판 시작 0.1~0.9초, 첫 궁극기 약 0.1초). 메뉴에 있는 동안 전투 장면 전체(숨은 궁극기 연출 포함)와
// 판 중에 생기는 물체의 견본을 비동기로 미리 컴파일한다. 그리는 것은 없고 화면도 바뀌지 않는다.
// 견본은 보이지 않는 묶음에 두고 재질을 버리지 않는다(재질을 버리면 셰이더도 함께 지워진다).
let shaderWarmGroup=null,shaderWarmKey='',shaderWarmTimer=0;
function buildShaderWarmGroup(){
 const g=new THREE.Group();g.name='shader-warmup';g.visible=false;
 const proto=tintGeometry(new THREE.BoxGeometry(.01,.01,.01),0xffffff);proto.name='shader-warmup-proto';
 for(const material of sharedDynamicMaterials){const m=new THREE.Mesh(proto,material);m.castShadow=m.receiveShadow=true;g.add(m);}
 ring(g,1,0xffffff);
 // 포탑·문지기·오스틴의 양면 투명 표식은 뒷면을 먼저 그리는 두 번째 셰이더가 따로 필요하다.
 for(const toneMapped of [false,true])g.add(new THREE.Mesh(proto,new THREE.MeshBasicMaterial({transparent:true,opacity:.5,depthWrite:false,side:THREE.DoubleSide,toneMapped})));
 createTrapVisuals(g,trapsFor(3,0,'garden'),mats);
 // 적 그림(명암 셰이더)과 가려질 때 보이는 윤곽: 적이 처음 나오는 순간 컴파일되던 두 가지.
 const actor={g:new THREE.Group()};g.add(actor.g);attachActorArt(actor,camera,release,{file:'enemy-hound-v4.png',size:1,directional:true,occlusion:true});
 return g;
}
function warmShaders(){
 shaderWarmTimer=0;
 try{
  // 화질에 따라 그림자·등불 빛이 바뀌면 셰이더 종류도 바뀌므로 화질마다 한 번씩 준비한다.
  const key=`q${qualityLevel}:${bloomPass.enabled}`;if(shaderWarmKey===key)return;shaderWarmKey=key;
  if(!shaderWarmGroup)shaderWarmGroup=buildShaderWarmGroup();
  // 견본은 컴파일하는 동안만 장면에 둔다(두면 매 프레임 행렬 갱신 대상이 된다). 재질은 그대로 살아 있어 셰이더도 남는다.
  scene.add(shaderWarmGroup);
  const previous=renderer.getRenderTarget();renderer.setRenderTarget(composer.readBuffer);
  // 정원 등불(점광원)은 '높음' 화질에서만 켜지고 2막·3막에서는 정원과 함께 숨는다. 켜진 빛의 수가 다르면 셰이더도 달라지므로
  // 등불이 보이는 상태와 모두 꺼진 상태를 한 번씩 준비한다(휴대폰 기본 화질은 등불이 없어 한 번이면 된다).
  const litLanterns=lanternLights.filter(l=>l.visible);
  try{
   renderer.compileAsync(scene,camera).catch(()=>{});
   if(litLanterns.length){for(const l of litLanterns)l.visible=false;try{renderer.compileAsync(scene,camera).catch(()=>{});}finally{for(const l of litLanterns)l.visible=true;}}
  }finally{renderer.setRenderTarget(previous);shaderWarmGroup.removeFromParent();}
 }catch{}
}
function scheduleShaderWarm(delay=700){if(!shaderWarmTimer)shaderWarmTimer=setTimeout(warmShaders,delay);}
function mesh(geo,mat,parent,x=0,y=0,z=0){let m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
const box=(p,x,y,z,w,h,d,m=mats.stone)=>mesh(new THREE.BoxGeometry(w,h,d),m,p,x,y,z);
// 색은 예전 돌 재질과 같게 둔다(아틀라스를 예전 바닥 평균 밝기에 맞춰 가공했다).
if(floorTex)mats.floor=new THREE.MeshStandardMaterial({color:0xb8c9c3,map:floorTex,roughness:.88,metalness:.02});
// 판석마다 아틀라스 네 칸 중 하나와 뒤집기를 격자 위치로 고른다(장면 난수 순서를 건드리지 않아 정원 배치는 그대로).
function floorSlab(parent,x,y,z){
 const geometry=new THREE.BoxGeometry(1.47,.2,1.47);
 if(mats.floor){const variant=floorSlabVariant(x,z),uv=geometry.attributes.uv;for(let i=0;i<uv.count;i++){const [u,v]=floorSlabUV(variant,uv.getX(i),uv.getY(i));uv.setXY(i,u,v);}}
 return mesh(geometry,mats.floor||mats.stone,parent,x,y,z);
}
const orb=(p,x,y,z,r,m)=>mesh(new THREE.IcosahedronGeometry(r,1),m,p,x,y,z);
function limb(p,a,b,r,m=mats.root,r2=r*.65){let av=new V(...a),bv=new V(...b),v=bv.clone().sub(av);let ob=mesh(new THREE.CylinderGeometry(r2,r,v.length(),7),m,p);ob.position.copy(av.add(bv).multiplyScalar(.5));ob.quaternion.setFromUnitVectors(new V(0,1,0),v.normalize());return ob;}
function path(points,r,mat,parent=terrain){return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new V(...p))),Math.max(10,points.length*6),r,5,false),mat,parent);}
let randseed=487;function rng(){randseed=(randseed*1664525+1013904223)>>>0;return randseed/4294967296;}
const terrain=new THREE.Group();scene.add(terrain);box(terrain,0,-.7,0,22,1.4,18,mats.dark);
for(let x=-10.5;x<11;x+=1.5)for(let z=-8.5;z<9;z+=1.5){let t=floorSlab(terrain,x,-.035+rng()*.025,z);t.rotation.y=(rng()-.5)*.035;}
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
const player=createSeedBody(scene,{occlusion:qualityLevel>0});player.scale.setScalar(1.25);player.position.set(0,0,5);let hp=100,invuln=0,shootCD=0,mirrorBurst=null,elapsed=0,stage=0,mode='ready',paused=false,kills=0,runDashes=0,runDamageTaken=0;const chosen=new Set(),mutated=new Set(),levels=new Map();let shotPierce=false,bankedUpgrades=0;let LS=lawStats(levels),choicesTaken=0,choiceKills=0;let dashState=createDashState(),dashLock=0,cachedTarget=null,targetTimer=0;const pulls=[],orbitHits=new Map();let cycle=0,region='garden',mirrorSession=null,survivalSession=null,survivalArt=null;let roomCleared=false,exitOpen=false,skywayAdvance=0,roomStartKills=0,midReward=false,crowdLeft=0,crowdTimer=0,crowdIndex=0,autoAttack=true,playerSlow=0,orbitTime=0,orbitHitCD=0;const wells=[];const orbitGroup=new THREE.Group(),orbitRoll=new THREE.Quaternion(),orbitAxis=new V(0,0,1),orbitPaint=new THREE.MeshBasicMaterial({map:projectileSprites.baseTexture,transparent:true,alphaTest:.07,depthWrite:false,depthTest:true,side:THREE.DoubleSide,toneMapped:false});scene.add(orbitGroup);for(let i=0;i<7;i++){const o=mesh(baseOrbitGeo,orbitPaint,orbitGroup,0,.65,0);o.castShadow=false;o.receiveShadow=false;}orbitGroup.visible=false;let enemies=[],shots=[],effects=[],enemyShots=[];const keys=new Set(),lastMove=new V(0,0,1);let keyboardDash=false;const aim=new V(0,0,-3);
const enemyIndex=createSpatialIndex(2.5),nearbyEnemies=[],explosionEnemies=[],separationEnemies=[];
const previousPlayer=new V(),moveVector=new V(),aimDirection=new V(),pullVector=new V(),wellVector=new V(),enemyVector=new V(),previousEnemy=new V(),previousShot=new V(),previousEnemyShot=new V(),shotOrigin=new V(),fanDir=new V();
const contactShadows=createContactShadows(scene);
const heldForms=new Map(),formCombats=new Map(),formCooldowns=new Map(),formAttacks=new Map();const AWAKEN_TWIN_STAGGER=5;const combatKey=(id,i)=>isTwinForm(id)?`${id}#${i}`:id;const combatsOf=id=>attackPartsOf(id).map((_,i)=>formCombats.get(combatKey(id,i))).filter(Boolean);let activeGauge=createActiveGauge(),activeReadyAnnounced=false;const finaleEchoes=[];const promptedSolo=new Set(),promptedAwaken=new Set(),promptedSecond=new Set();let guideTarget=null,rerollUsed=false;const promptedForms=new Set();let arena=arenaFor(0),escortWaves=0,bossDefeated=false;const pendingEscorts=[];
// Score, boss counts and potions live for one run. Every fifth warden opens the way to the real boss.
let labSafe=false;
let baseSlideTime=0,baseSlideCooldown=0,baseSlideLock=-1,baseSlideDir=new V(),baseSlideTarget=new V(),baseSlideRemaining=new V();
// Potion effects run on their own timers: a dodge rewrites invuln, so the shell must not rely on it.
let hasteTime=0,shellTime=0,selectedItem=null,itemBarKey='';
let currentJourneyRunId=null,currentJourneyOwner=null,pendingJourneyBossTitles=[];
let score=0,wardensDefeated=0,austinsDefeated=0,austinRoom=false,inventory=emptyInventory(),runBonuses=emptyRunBonuses(),runBonusOffer=null,turretPotionDry=0,skywaySupplyClaimed=false,relics=emptyRelics(),relicRewardPending=false,dashRewardPending=false,dashRelicReady=false,clockFloor=null,potionCD=0,act2Support=null,bossRewardLine='';const fallen=[];const JOURNEY_HEAL=25;
const combatAnalysis=createCombatAnalysis();let lastRoomAnalysis=null,trainingSession=null;
const isBoss=e=>e.expansionBoss||e.type==='warden'||e.type==='austin'||e.type==='act2warden'||e.type==='alwaysbeginner'||e.type==='act3warden'||e.type==='tempestcarrier'||e.type==='mirrorseed';
function inAustinRoom(){return austinRoom&&stage===4;}
function austinAhead(){return !isAct2(region)&&!isAct3(region)&&!austinRoom&&Math.floor(wardensDefeated/gardenFx.austinEvery)>austinsDefeated;}
function act2BossAhead(){return isAct2(region)&&!austinRoom&&Math.floor(wardensDefeated/5)>austinsDefeated;}
function act3BossAhead(){return isAct3(region)&&!austinRoom&&Math.floor(wardensDefeated/5)>austinsDefeated;}
function finalBossAhead(){return austinAhead()||act2BossAhead()||act3BossAhead();}
// 한 판에서 찐보스를 세 번째로 이긴 순간인가. 옛 저장은 다음 찐보스에서 완주한다.
function runComplete(){return !mirrorSession&&!trainingSession&&austinRoom&&stage===4&&bossCapReached(austinsDefeated);}
function completeRun(){
 for(const p of enemyShots)release(p.ob);enemyShots=[];if(!developerRun&&protectJourneyBossReceipts())clearCheckpoint(actStore());mode='dead';
 // 빨리 끝낸 만큼 완주 보너스(score.js CLEAR_BONUS).
 const bonus=clearBonus(elapsed);score+=bonus;
 // Each act awards its own one-run three-boss clear title.
 const clearId=isAct3(region)?'johanclear':isAct2(region)?'alwaysclear':'austinclear';
 const already=clearId==='johanclear'?seedTitle.isJohanClearUnlocked():clearId==='alwaysclear'?seedTitle.isAlwaysClearUnlocked():seedTitle.isAustinClearUnlocked();
 const newTitle=!developerRun&&!already?{name:clearId==='johanclear'?JOHAN_CLEAR_TITLE:clearId==='alwaysclear'?ALWAYS_CLEAR_TITLE:AUSTIN_CLEAR_TITLE,perk:`모든 능력 +${Math.round(CLEAR_ALL_STATS*100)}%`}:null;
 if(!developerRun)remember('bosses',clearId);
 showEnd(null,{cleared:true,newTitle,bonus});
}
function finalBossName(){return isAct3(region)?TEMPEST_CARRIER.name:isAct2(region)?ALWAYS_BEGINNER.name:AUSTIN.name;}
const appShell=setupMobileApp({offlineIdle:()=>mode==='ready'||mode==='ranking'});
const nativeUpdate=createNativeUpdateGate({enabled:appShell.nativeApp&&window.Capacitor?.getPlatform?.()==='android'});
const audio=createGameAudio();audio.installUnlock(document);
const touch=createTouchControls(()=>mode==='playing'&&!paused);
const playerMotion=createMotion(player,player.userData.legs);const growth=createSeedEvolution(player,playerMotion.body);const cameraFeel=createCameraFeel();let cameraMoveX=0,cameraMoveZ=0;let evolutionTime=0;const evolutionDuration=1.4;
function ring(parent,r,color){let mat=new THREE.MeshBasicMaterial({color,transparent:true,opacity:.75,side:THREE.DoubleSide,forceSinglePass:true});let geo=ringGeos.get(r);if(!geo){geo=new THREE.RingGeometry(r-.035,r,48);ringGeos.set(r,geo);sharedGeometries.add(geo);}let m=mesh(geo,mat,parent);m.castShadow=false;m.rotation.x=-Math.PI/2;m.position.y=.12;return m;}
const mirrorReadyRing=new THREE.Mesh(new THREE.TorusGeometry(.39,.03,4,24),new THREE.MeshBasicMaterial({color:0xdbfff5,transparent:true,opacity:.2,depthWrite:false,toneMapped:false}));mirrorReadyRing.rotation.x=Math.PI/2;mirrorReadyRing.visible=false;mirrorReadyRing.castShadow=false;scene.add(mirrorReadyRing);
function enemy(type,x,z){let g=new THREE.Group();scene.add(g);g.position.set(x,0,z);let legs=[],arms=[];/* The painted sprite (attachActorArt below) replaces the body, so no 3D parts are built only to be disposed on the same frame (2026-09-15: ~40 geometries per spawn made wave starts hitch on phones). */g.scale.setScalar(type==='hound'?1.3:1.22);let e={g,type,hp:type==='hound'?78+stage*10:92+stage*12,timer:.35+rng()*.7,state:'stalk',dir:new V(),legs,phase:rng()*6,hit:0};e.motion=createMotion(g,legs,arms);e.ring=ring(g,type==='hound'?.9:1.1,0xed7d30);e.ring.material.opacity=.25;
let tellMat=new THREE.MeshBasicMaterial({color:0xff932d,transparent:true,opacity:.2,depthWrite:false,side:THREE.DoubleSide,forceSinglePass:true});
let tell=mesh(type==='hound'?enemyGeos.tellHound:enemyGeos.tellCaster,tellMat,g,0,.095,type==='hound'?2.7:0);tell.castShadow=false;tell.rotation.x=-Math.PI/2;tell.visible=false;e.tell=tell;
attachActorArt(e,camera,release,{file:type==='hound'?'enemy-hound-v4.png':'enemy-caster-v4.png',size:type==='hound'?1.75:2.2,directional:true,occlusion:qualityLevel>0});enemies.push(e);return e;}
function swarm(x,z){
 const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);
 const act2=isAct2(region),e={g,type:'swarm',hp:(26+stage*5)*difficulty(cycle,region).hp*levelPressure()*(act2?ACT2_PRESSURE.hp:1),state:'stalk',timer:0,phase:Math.random()*6,hit:0,slow:0},art=act2?ACT2_ART.runner:null;attachActorArt(e,camera,release,{file:art?.file||'enemy-hound-v4.png',size:act2 ? .82 : .95,directional:true,baseline:art?.baseline||.04,occlusion:qualityLevel>0});enemies.push(e);
}
function spawnCrowd(n){for(let i=0;i<n&&crowdLeft>0&&enemies.length<CROWD_CAP;i++){const index=crowdIndex++,p=isAct3(region)?act3ReinforcementSpawn(index):safeArenaSpawn(player.position,obstacles,index,arena);if(!p)break;if(isAct3(region))spawnAct3(act3CrowdType(index,stage),p.x,p.z);else swarm(p.x,p.z);crowdLeft--;}}
function applyLawHit(e,amount,secondary=false,critical=false){
 if(expansionTerrain?.owns(e)){damageExpansionCrystal(e,amount,chosen.has('burst')?'burst':null);return;}
 damageEnemy(e,amount*(secondary&&isBoss(e)?.65:1),!secondary,critical&&!secondary);
 if(chosen.has('frost')&&!e.dead){
  if(secondary){e.slow=Math.max(e.slow||0,LS.frostTime);}else{
   const frost=applyFrostContact(e,{duration:LS.frostTime,now:elapsed,boss:isBoss(e)});
   if(frost.first)vfx.burst(e.g.position,'frost',5,.38);
   else if(!frost.shatter)vfx.burst(e.g.position,'frost',2,.18+.09*frost.stacks);
   if(frost.shatter){vfx.burst(e.g.position,'frost',18,1.3);vfx.frostWeb(e.g.position.clone().add(new V(-.55,.2,-.55)),e.g.position.clone().add(new V(.55,.2,.55)));audio.play('frostHit');damageEnemy(e,amount*frost.bonus,false,false,{kind:'frost-shatter'});}
  }
  combatAnalysis.utility('freeze');
 }
 if(secondary)return;
 if(chosen.has('burst')){
  const radius=LS.burstRadius;vfx.explosion(e.g.position,'burst',Math.max(.8,radius*.48));
  for(const other of expansionNearby(e.g.position,radius,explosionEnemies))if(other!==e&&!other.dead)applyLawHit(other,amount*.5,true);
 }
 if(chosen.has('gravity')){if(wells.length>=6)wells.shift();wells.push({pos:e.g.position.clone(),life:1.6,pulse:0});combatAnalysis.utility('pull');}
}
const gate=new THREE.Group();gate.position.set(EXIT.x,0,EXIT.z);scene.add(gate);
const gateRing=ring(gate,1,0xa9ffda);const gateHalo=mesh(new THREE.TorusGeometry(.7,.08,6,40),mats.jade,gate,0,1.1,0);gate.visible=false;
document.body.insertAdjacentHTML('beforeend','<button id="exit-room" hidden>다음 방으로 · E</button><div id="boss-hud" hidden><strong>기억의 문지기</strong><div><i></i></div><em class="boss-move" hidden></em><small></small></div><div id="score-hud" hidden><small>점수</small><b>0</b></div><div id="item-bar" hidden role="group" aria-label="물약 가방"></div>'+ACTIVE_BUTTON_HTML+ACTIVE_EFFECT_HTML+'<div id="item-status" hidden aria-live="polite"></div><section id="room-analysis" hidden aria-live="polite"></section>');
bindPointerAction($('#active-skill'),{onPress:button=>{useActive();button.blur();}});
bindPointerAction($('#item-bar'),{selector:'[data-item]',onPress:button=>{useInventoryItem(button.dataset.item);button.blur();}});
$('#rules').innerHTML=Object.entries(LAWS).map(([id,v])=>`<div data-rule="${id}" title="${v.name}">${lawArt(id)}<span>${v.name}</span></div>`).join('');
document.body.insertAdjacentHTML('beforeend','<div id="growth-progress"><span></span><div><i></i></div></div><div id="overhead" hidden><div class="oh-hp"><i></i></div><div class="oh-dash"><i></i></div><b class="oh-lock" hidden>회피 봉인</b></div>');
$('#exit-room').onclick=useExit;$('#stages').innerHTML=ROOMS.map(()=>'<span>♧</span>').join('<i></i>');
// ---------------- later acts ----------------
// The run's region decides the act. Every act keeps an independent checkpoint.
let startRegion='garden';const actStore=()=>isAct3(region)?act3Storage(runStorage):actStorage(runStorage,actOf(region)),AXIS_Y=new V(0,1,0);
const worldLights=scene.children.filter(o=>o.isHemisphereLight||o.isDirectionalLight||o.isAmbientLight),hiddenGarden=[terrain,...scene.children.filter(o=>o.name?.startsWith('garden-'))];
const stadium=createStadium(scene,{lights:worldLights,hide:hiddenGarden,mobile:mobileDevice});
const skyway=createSkyway(scene,{lights:worldLights,hide:[...hiddenGarden,...moteMeshes],mobile:mobileDevice});
const mirrorPanels=createMirrorPanels(scene);let mirrorPanelsActive=false;
let expansionJourney=null,expansionJourneyView=null,expansionTerrain=null,expansionCrystalTexture=null,expansionTerrainDirty=false,expansionEntry=null,expansionSaveOwner=null,expansionEnvironmentArt=null,expansionLaunch=0,expansionSaveLease=null,expansionChannel='inspection',expansionPublicEntry=null,expansionPublicSync=null,expansionFreshExpected=null,expansionPendingBossCheckpoint=null;
const expansionOwner=()=>account.user()?.uid||'guest';
const expansionPublicFacts=()=>({currentOwner:expansionOwner(),inspection:localInspection,practice:developerRun,acts:expansionApi.EXPANSION_ACTS});
const expansionStore=act=>expansionChannel==='public'?createExpansionAccountSaveStore(rawStorage,act,expansionSaveOwner||expansionOwner(),{context:expansionPublicFacts,lease:expansionSaveLease}):createExpansionSaveStore(rawStorage,act,expansionSaveOwner||expansionOwner());
function releaseExpansionSaveLease(){const lease=expansionSaveLease;expansionSaveLease=null;return lease?.release()||Promise.resolve();}
function ownsExpansionSaveLease(){const store=expansionJourney?expansionStore(expansionJourney.act):null;return Boolean(store&&expansionSaveLease?.active()&&expansionSaveLease.key===(store.lockKey||store.key));}
function canSaveExpansion(){return Boolean(expansionJourney&&!expansionJourney.inspectionPreview&&expansionSaveOwner===expansionOwner()&&ownsExpansionSaveLease()&&(expansionChannel==='public'?expansionAccountEligible(expansionJourney.act,expansionSaveOwner,expansionPublicFacts()):localInspection));}
function syncPublicExpansion(){return expansionChannel==='public'&&expansionPublicSync?expansionPublicSync.flush():Promise.resolve({kind:'ineligible'});}
function expansionRunSnapshot(){
 return {version:1,cycle,region:'garden',stage:expansionJourney.room,mode:'entry',hp,rules:[...chosen],mutated:[...mutated],levels:levelsToSave(levels),banked:bankedUpgrades,choicesTaken,choiceKills,kills,elapsed,playDashes:runDashes,playDamage:Math.round(runDamageTaken),forms:Object.fromEntries(heldForms),inventory:{...inventory},runBonuses:{...runBonuses},relics:normalizeRelics(relics),dashEvolution:dashState.id,activeGauge:Math.floor(activeGauge.value),activeCooldown:activeGauge.cooldown,mutations:mutationsToSave(mutations),rerollUsed,score,wardens:wardensDefeated,austins:austinsDefeated,turretPotionDry};
}
function captureExpansionEntry(){
 if(!canSaveExpansion())return false;
 const run=expansionRunSnapshot();
 const value=createExpansionEntry(expansionJourney,run,player.position.toArray(),expansionEntry||{});if(!value)return false;
 const publicValue=expansionChannel==='public'?(expansionPublicEntry?{...expansionPublicEntry,entry:value}:createExpansionAccountEntry(expansionJourney,run,player.position.toArray(),{owner:expansionSaveOwner,...expansionPublicFacts(),id:value.id})):null;
 const result=expansionStore(expansionJourney.act).write(expansionChannel==='public'?publicValue:value,{fresh:!expansionEntry,expected:expansionFreshExpected});
 if(result.ok){expansionEntry=expansionChannel==='public'?result.value.entry:result.value;expansionPublicEntry=expansionChannel==='public'?result.value:null;expansionFreshExpected=null;if(expansionChannel==='public')void syncPublicExpansion();}return result.ok;
}
function settleExpansionTitles(){
 if(expansionChannel!=='public'||!expansionPublicEntry?.campaign||!canSaveExpansion())return false;
 const result=settleExpansionPublicTitles(expansionStore(expansionJourney.act),expansionPublicEntry,(runId,event)=>awardModeBoss('journey',runId,event.boss,event.ordinal,false));
 expansionPublicEntry=result.value;expansionEntry=result.value.entry.ended?null:result.value.entry;if(result.ok)void syncPublicExpansion();return result.ok;
}
function persistExpansionBossVictory(){
 if(!expansionPendingBossCheckpoint||!canSaveExpansion())return false;
 const result=expansionStore(expansionJourney.act).write(expansionPendingBossCheckpoint);if(!result.ok)return false;
 expansionPublicEntry=result.value;expansionEntry=result.value.entry;expansionPendingBossCheckpoint=null;settleExpansionTitles();return true;
}
function saveExpansionBossVictory(){
 if(expansionChannel!=='public'||!canSaveExpansion()||!expansionEntry||expansionJourney.phase!=='boss')return false;
 if(expansionPublicEntry.campaign.bossCleared)return true;
 if(!expansionPendingBossCheckpoint){
  const campaign=completeExpansionPublicBoss(expansionPublicEntry.campaign,expansionJourney.act),canonical=expansionApi.restoreExpansionJourney(expansionEntry.journey);
  if(!campaign||!canonical)return false;
  // Use the accepted boss entrance's canonical world state. Retain gains only
  // from this genuine completed boss, never an unfinished course snapshot.
  const entry=createExpansionEntry(canonical,expansionRunSnapshot(),expansionEntry.position,expansionEntry);if(!entry)return false;
  expansionPendingBossCheckpoint={...expansionPublicEntry,entry,campaign};
 }
 return persistExpansionBossVictory();
}
function saveExpansionLeave(){
 if(expansionPendingBossCheckpoint&&!persistExpansionBossVictory())return false;
 if(!expansionEntry||hp<=0||!canSaveExpansion())return false;
 const losses={hp,inventory,rerollUsed},value=expansionChannel==='public'?expansionAccountExitCheckpoint(expansionPublicEntry,losses):expansionExitCheckpoint(expansionEntry,losses);if(!value)return false;
 const result=expansionStore(expansionJourney.act).write(value);if(result.ok){expansionEntry=expansionChannel==='public'?result.value.entry:result.value;if(expansionChannel==='public')expansionPublicEntry=result.value;}return result.ok;
}
function finishExpansionEntry(){
 if(expansionPendingBossCheckpoint&&!persistExpansionBossVictory())return false;
 if(!expansionEntry){void releaseExpansionSaveLease();return true;}
 if(!canSaveExpansion())return false;
 const result=expansionStore(expansionJourney.act).finish(expansionChannel==='public'?expansionPublicEntry:expansionEntry);if(expansionChannel==='public'?!result.ok:!result)return false;
 expansionEntry=null;
 if(expansionChannel==='public'){
  expansionPublicEntry=result.value;const lease=expansionSaveLease;expansionSaveLease=null;
  // Keep the borrowed lease alive until the terminal record's upload settles.
  // Failure leaves the local tombstone available for a later eligible retry.
  void syncPublicExpansion().finally(()=>lease.release());
 }else void releaseExpansionSaveLease();return true;
}
const expansionTargets=[],expansionNear=[];
function expansionCombatTargets(){
 if(!expansionTerrain)return enemies;expansionTargets.length=0;expansionTargets.push(...enemies);for(const e of expansionTerrain.targets)if(!e.dead)expansionTargets.push(e);return expansionTargets;
}
function expansionNearby(pos,radius,out){enemyIndex.queryInto(pos,radius,out);if(expansionTerrain){expansionTerrain.query(pos,radius,expansionNear);out.push(...expansionNear);}return out;}
function syncExpansionCrystals(){if(expansionTerrain){expansionTerrain.sync();expansionJourneyView?.syncCrystals(expansionJourney?.course.walls||survivalExpansion?.terrain||[],camera);expansionTerrainDirty=false;}}
async function prepareExpansionAssets(act=null){
 const view=await import('./expansion-journey-view.js');
 if(!expansionCrystalTexture){expansionCrystalTexture=texloader.load(import.meta.env.BASE_URL+'assets/'+(mobileDevice?'mobile/':'')+'mirror-crystal-v1.webp');expansionCrystalTexture.colorSpace=THREE.SRGBColorSpace;}
 expansionJourneyView??=view.createExpansionJourneyView(scene,stone,expansionCrystalTexture);
 if(act==='crystalGorge')await prepareExpansionCover();
}
async function expansionArtCache(){
 const art=await import('./expansion-environment-art.js');
 expansionEnvironmentArt??=art.createExpansionEnvironmentArt({loader:texloader,baseUrl:import.meta.env.BASE_URL,mobile:mobileDevice});
 return expansionEnvironmentArt;
}
async function prepareExpansionEnvironment(act){
 try{const art=await expansionArtCache(),texture=await art.load(act);if(texture)expansionJourneyView.setPlate(act,texture);}
 catch{console.warn('Expansion environment unavailable; retaining the existing course floor.');}
}
async function prepareExpansionCover(){
 try{const art=await expansionArtCache(),texture=await art.loadCover();if(texture){expansionJourneyView.setCoverTexture(texture);syncExpansionCrystals();}}
 catch{console.warn('Expansion cover unavailable; retaining the existing cover art.');}
}
function damageExpansionCrystal(e,amount,law){
 if(!expansionTerrain?.owns(e))return false;const hit=expansionTerrain.damage(e,amount,{law});if(hit){expansionTerrainDirty=true;if(e.dead)vfx.burst(e.g.position,'frost',4,.55);}return hit;
}
function traceExpansionShot(shot,previous,next){
 if(!expansionTerrain||shot.life<=0)return false;
 const damage=(shot.fragment?8:BASE_SHOT_DAMAGE)*damageScale(levels,bankedUpgrades)*runPowerScale(runBonuses)*gardenPower()*(shot.returning?LS.recallReturn:1)*(shot.critical?LS.critDamage:1)*(shot.dashStrike?1.8:1)*(shot.relicBounce?1.25:1);
 const result=expansionApi.traceCrystalProjectile(expansionTerrain,shot,previous,next,{damage,laws:shotPierce?[...chosen,'pierce']:[...chosen],maxBounces:LS.reflectBounces});
 if(result.hits.some(h=>h.damage>0))expansionTerrainDirty=true;return result.blocked;
}
function reflectExpansionCrystals(a,b,d){
 if(!expansionTerrain)return false;const contact=expansionTerrain.sweep(a,b,{law:'reflect',damage:0,radius:0});if(!contact.reflected)return false;
 b.x=contact.point.x;b.z=contact.point.z;d.x=contact.dir.x;d.z=contact.dir.z;return true;
}
function traceExpansionFormShot(shot,previous,next,dir,meta){
 if(!expansionTerrain)return null;
 if(shot.crystalReturning!==Boolean(shot.returning)){shot.crystalHits?.clear();shot.crystalReturning=Boolean(shot.returning);}
 const consumed=FORMS[meta.kind].requires,family=[...consumed,meta.finalLaw];
 const nativeLaws=meta.ricochet?family.filter(id=>id!=='pierce'):family;
 // Some authored return legs fly over cover to reach the moving seed. This
 // changes only terrain traversal, not the held laws or enemy hit budget.
 const laws=meta.passCover?[...nativeLaws,'pierce']:nativeLaws;
 const damage=meta.damage*damageScale(levels,bankedUpgrades)*relicFormScale(relics,consumed)*runPowerScale(runBonuses)*gardenPower();
 const result=expansionApi.traceCrystalProjectile(expansionTerrain,shot,previous,next,{damage,laws,bounces:0,maxBounces:meta.remainingBounces});
 if(result.reflected){dir.x=result.dir.x;dir.z=result.dir.z;}
 if(result.hits.some(h=>h.damage>0))expansionTerrainDirty=true;return result;
}
async function startPublicExpansionJourney(act,{resume=false}={}){return startExpansionJourney(0,act,{resume,publicRun:true});}
async function startExpansionJourney(room=0,act='crosswind',{resume=false,publicRun=false,bossPreview=false}={}){
 if(bossPreview&&(publicRun||resume||!localInspection))return false;
 if(publicRun?localInspection||!account.user()?.uid||account.user()?.isAnonymous||gameplayPaused()||maintenanceOn:!localInspection)return false;
 const launch=++expansionLaunch;
 const [rules,view,inspectionPreview]=await Promise.all([import('./expansion-journey.js'),import('./expansion-journey-view.js'),bossPreview?import('./expansion-boss-inspection.js'):Promise.resolve(null)]);expansionApi=rules;
 if(launch!==expansionLaunch||!Object.hasOwn(rules.EXPANSION_ACTS,act))return false;
 const owner=expansionOwner(),facts=()=>({currentOwner:expansionOwner(),inspection:localInspection,practice:!publicRun||launch!==expansionLaunch,acts:rules.EXPANSION_ACTS});
 if(publicRun&&!expansionAccountEligible(act,owner,facts()))return false;
 const storeFor=lease=>publicRun?createExpansionAccountSaveStore(rawStorage,act,owner,{context:facts,lease}):createExpansionSaveStore(rawStorage,act,owner);
 let store=storeFor(null),saved=resume?store.read():null;
 if(!publicRun&&resume&&!saved){$('#toast').textContent='이어할 로컬 저장이 없거나 다른 버전의 기록이에요.';return false;}
 if(!expansionCrystalTexture){expansionCrystalTexture=texloader.load(import.meta.env.BASE_URL+'assets/'+(mobileDevice?'mobile/':'')+'mirror-crystal-v1.webp');expansionCrystalTexture.colorSpace=THREE.SRGBColorSpace;}
 expansionJourneyView??=view.createExpansionJourneyView(scene,stone,expansionCrystalTexture);
 await prepareExpansionEnvironment(act);if(act==='crystalGorge')await prepareExpansionCover();
 if(launch!==expansionLaunch||owner!==expansionOwner())return false;
 const previousLease=expansionSaveLease,lockKey=store.lockKey||store.key,reused=previousLease?.active()&&previousLease.key===lockKey;
 const lease=reused?previousLease:await acquireExpansionSaveLease(act,owner);
 if(launch!==expansionLaunch||owner!==expansionOwner()){if(!reused&&lease.ok)await lease.release();return false;}
 if(!lease.ok||!lease.active()){$('#toast').textContent=lease.reason==='busy'?'같은 막을 다른 탭에서 진행 중이에요. 그곳에서 저장하고 나간 뒤 이어하세요.':'이 환경에서는 안전한 저장을 시작하지 못했어요. 기존 여정은 계속 이용할 수 있어요.';return false;}
 let publicSync=null,publicSyncKind=null;
 try{
  store=storeFor(lease);
  if(publicRun){
   const local=store.read();if(local?.campaign?.pendingBossTitles.length){const settled=settleExpansionPublicTitles(store,local,(runId,event)=>launch===expansionLaunch&&owner===expansionOwner()&&awardModeBoss('journey',runId,event.boss,event.ordinal,false));if(!settled.ok){if(!reused)await lease.release();$('#toast').textContent='보관된 보스 보상을 저장하지 못했어요. 기록은 그대로 남아 있습니다.';return false;}}
   publicSync=createExpansionAccountSync({storage:rawStorage,account,act,databaseURL:FIREBASE_APP.databaseURL,context:facts,acts:rules.EXPANSION_ACTS,activeLease:()=>lease,isActive:()=>false});
   const result=await publicSync.sync({allowPull:true});publicSyncKind=result.kind;
   if(!['synced','empty','offline'].includes(result.kind)){$('#toast').textContent='계정 기록을 안전하게 확인하지 못했어요. 기존 저장은 보존했습니다.';if(!reused)await lease.release();return false;}
  }
  // Read under the exclusive lease, after both scenery and remote validation.
  let record=store.read();
  if(publicRun&&record?.campaign?.pendingBossTitles.length){const settled=settleExpansionPublicTitles(store,record,(runId,event)=>launch===expansionLaunch&&owner===expansionOwner()&&awardModeBoss('journey',runId,event.boss,event.ordinal,false));record=settled.value;if(!settled.ok){if(!reused)await lease.release();$('#toast').textContent='이전 보스 보상을 저장하지 못했어요. 기록을 보존하고 재시도를 기다립니다.';return false;}}
  if(publicRun&&record&&!record.entry.ended&&!record.campaign){const upgraded={...record,campaign:createExpansionPublicCampaign(act),entry:{...record.entry,run:{...record.entry.run,cycle:0}}},result=store.write(upgraded);if(!result.ok){if(!reused)await lease.release();return false;}record=result.value;}
  saved=publicRun?(record&&!record.entry.ended?record.entry:null):(resume?record:null);
  if(resume&&!saved||publicRun&&!resume&&(record&&!record.entry.ended||publicSyncKind==='offline')){if(!reused)await lease.release();$('#toast').textContent='이어할 기록을 먼저 확인해 주세요. 기존 기록은 남겨 두었습니다.';return false;}
  if(previousLease&&previousLease!==lease)await previousLease.release();
  if(launch!==expansionLaunch||owner!==expansionOwner()||!lease.active()||publicRun&&(!expansionAccountEligible(act,owner,facts())||gameplayPaused()||maintenanceOn)){if(!reused)await lease.release();return false;}
  expansionSaveLease=lease;expansionSaveOwner=owner;expansionChannel=publicRun?'public':'inspection';expansionPublicSync=publicSync;expansionPublicEntry=publicRun&&saved?record:null;expansionFreshExpected=publicRun&&!saved?record:null;expansionPendingBossCheckpoint=null;
  expansionJourney=null;expansionEntry=saved;mirrorSession=null;survivalSession=null;trainingSession=null;developerRun=!publicRun;labSafe=false;startRegion='garden';restart(saved?.run,{expansion:true});
  for(const e of enemies)releaseEnemy(e);enemies=[];for(const f of fallen)releaseEnemy(f.e);fallen.length=0;
  expansionJourney=bossPreview?inspectionPreview.createJourneyBossInspection(act):saved?expansionApi.restoreExpansionJourney(saved.journey):expansionApi.createExpansionJourney(act,Math.max(0,Math.min(4,room|0)),413);stage=expansionJourney.room;mode='playing';paused=false;wave();
  if(publicRun&&!expansionEntry)throw Error('checkpoint');
  if(saved)player.position.fromArray(saved.position);
  if(publicRun)void webTelemetry.playStart(rules.EXPANSION_ACTS[act].number);
  $('#toast').textContent=(act==='crosswind'?'4막':'5막')+(bossPreview?' 로컬 보스 시연 · 구간 생략 · 저장/보상/랭킹 제외':publicRun?' · 방 입구 저장 · 계정 동기화 상태는 일시정지에서 확인':' 로컬 시제품 · 방 입구 이어하기 · 계정 보상/랭킹 제외');return true;
 }catch{
  if(expansionSaveLease===lease&&launch===expansionLaunch){expansionSaveLease=null;expansionJourney=null;expansionEntry=null;expansionPublicEntry=null;expansionPublicSync=null;expansionPendingBossCheckpoint=null;expansionTerrain=null;mode='ready';paused=false;$('#toast').textContent='여정을 시작하지 못했어요. 기존 저장은 남겨 두었습니다.';}
  if(!reused||expansionSaveLease!==lease)await lease.release();return false;
 }
}

function spawnExpansionActor(spec,boss=false){
 const g=new THREE.Group();scene.add(g);const e={g,type:boss?'expansion-boss':'expansion-minion',hp:boss?2400:spec.hp,maxHp:boss?2400:spec.hp,hit:0,slow:0,state:'entry',phase:0,immovable:boss,radius:boss ? .8 : .65,expansionActor:true,expansionBoss:boss,config:{name:boss?expansionApi.EXPANSION_ACTS[expansionJourney.act].bossName:expansionJourney.act==='crosswind'?'잎배 편대':'수정 정찰대'}};
 if(expansionChannel==='public'){const scale=difficulty(cycle,'garden');e.hp*=boss?scale.bossHp:scale.hp;e.maxHp=e.hp;}
 g.position.set(spec.position.x,0,spec.position.z);
 if(!boss)e.expansionThreat=expansionApi.createExpansionThreat(spec);
 if(boss){e.expansionMotion=expansionJourney.boss;attachActorArt(e,camera,release,expansionActorArt(expansionJourney.bossId));}
 else attachActorArt(e,camera,release,expansionEnemyArt(expansionJourney.act));
 enemies.push(e);return e;
}
function expansionBolt(q){if(enemyShots.length>=48)return;const spec=expansionChannel==='public'?{...q.spec,speed:q.spec.speed*difficulty(cycle,'garden').projectileSpeed}:q.spec;skywayBolt(new V(q.position.x,0,q.position.z),new V(q.dir.x,0,q.dir.z),spec);}
function updateExpansionCourse(dt){
 if(!expansionJourney)return;
 expansionJourneyView.beginFrame();syncExpansionCrystals();if(roomCleared)return;if(expansionJourney.phase!=='course')return;
 const out=expansionApi.stepExpansionJourney(expansionJourney,dt,{player:player.position,enemyCount:enemies.length,projectileCount:enemyShots.length});
 for(const spec of out.spawns)spawnExpansionActor(spec);crowdLeft=out.finish?0:1;
}
function tickExpansionActor(e,dt){
 if(!expansionJourney)return;e.hit=Math.max(0,e.hit-dt);const before=(e.expansionPrevious??=new V()).copy(e.g.position);
 let out;if(e.expansionBoss){
  out=expansionApi.stepExpansionJourney(expansionJourney,dt,{position:e.g.position,player:player.position,walls:expansionJourney.course.walls,activeProjectiles:enemyShots.length,hpRatio:e.hp/e.maxHp});
  e.g.position.x+=out.move.x;e.g.position.z+=out.move.z;collide(e.g.position,.8,before);e.state=out.state;e.takenScale=expansionApi.expansionBossDamageMultiplier(expansionJourney.act,e.state,out.coreOpen);
  if(expansionTerrain&&out.terrain.length){expansionTerrain.apply(out.terrain,[{position:player.position,radius:.4},...enemies]);syncExpansionCrystals();}
  for(const t of out.telegraphs)expansionJourneyView.tell(t);
  for(const contact of out.contacts){contact.to.x=e.g.position.x;contact.to.z=e.g.position.z;if(e.lastExpansionContact!==contact.hitId&&expansionApi.expansionContactHits(contact,player.position)){e.lastExpansionContact=contact.hitId;hitPlayer(contact.damage);}}
  for(const evt of out.events)if(evt.type==='boss-tell')$('#toast').textContent=evt.hint;
 }else{
  const model=e.expansionThreat;model.position.x=e.g.position.x;model.position.z=e.g.position.z;model.hp=e.hp;
  out=expansionApi.stepExpansionThreat(model,dt,{player:player.position,projectiles:enemyShots.length});e.g.position.set(model.position.x,0,model.position.z);collide(e.g.position,.65,before);e.state=model.phase;
  if(out.tell)expansionJourneyView.tell(out.tell);
  if(out.contact){out.contact.to.x=e.g.position.x;out.contact.to.z=e.g.position.z;if(!model.contactHit&&expansionApi.expansionContactHits(out.contact,player.position)){model.contactHit=true;hitPlayer(out.contact.damage);}}
  if(expansionJourney.act==='crosswind'&&e.g.position.x<expansionJourney.course.distance-23){e.dead=true;releaseEnemy(e);return;}
 }
 const facing=expansionApi.expansionFacing(e.expansionBoss?expansionJourney.boss:e.expansionThreat,e.g.position,player.position);e.g.rotation.y=Math.atan2(facing.x,facing.z);for(const q of out.bolts)expansionBolt(q);
}
function waveExpansionJourney(){
 const s=expansionJourney,definition=expansionApi.EXPANSION_ACTS[s.act];stage=s.room;crowdLeft=s.phase==='course'?1:0;
 if(s.phase==='boss'&&expansionChannel==='public'&&expansionPublicEntry?.campaign?.bossCleared){roomCleared=true;crowdLeft=0;settleExpansionTitles();openExit();return;}
 if(s.phase==='boss')spawnExpansionActor({position:{x:s.act==='crosswind'?s.course.distance+7:5,z:0}},true);
 combatAnalysis.begin(elapsed,{stage:stage+1,cycle:1,region:s.act});$('#encounter').textContent=definition.number+(expansionChannel==='public'?'막 · ':'막 로컬 · ')+(s.phase==='boss'?definition.bossName:definition.name+' · '+(stage+1)+' / 5');
 $('#boss-hud strong').textContent=definition.bossName;$('#boss-hud').hidden=s.phase!=='boss';$('#stages').hidden=false;
 [...document.querySelectorAll('#stages span')].forEach((n,i)=>n.classList.toggle('active',i<=stage));
 if(!s.inspectionPreview&&!captureExpansionEntry())$('#toast').textContent='로컬 저장을 만들지 못했어요. 저장 공간 또는 다른 탭의 기록을 확인하세요.';
}
function showExpansionResult(won,ended=true){
 const act=expansionJourney.act,name=expansionApi.EXPANSION_ACTS[act].name,isPublic=expansionChannel==='public',serial=++rankSerial;
 const entry=isPublic?expansionJourneyResult({act,owner:expansionSaveOwner,currentOwner:expansionOwner(),inspection:localInspection,practice:developerRun,ended,done:won,name:playerName,score,cycle,stage,kills,time:elapsed,build:buildRecord({levels,forms:heldForms,relic:relics.equipped,wardens:wardensDefeated,austins:austinsDefeated}),acts:expansionApi.EXPANSION_ACTS}):null;
 mode='ready';paused=false;touch.reset();keys.clear();pauseBuild.hide();perfFinish(won?'cleared':'ended');activeVfx.clear();cancelActive(activeGauge);$('#item-bar').hidden=true;$('#active-skill').hidden=true;$('#item-status').hidden=true;$('#save-exit').hidden=true;$('#boss-hud').hidden=true;$('#exit-room').hidden=true;gate.visible=false;$('#overlay').hidden=false;
 $('#overlay').innerHTML='<div class="menu-panel"><h2>'+name+(won?' 완주':' 도전 종료')+'</h2><p>'+(ended?'방 입구 기록을 종료했어요.':'기록 종료를 확인하지 못했어요. 기존 기록은 보존했습니다.')+(isPublic?'':' 실험 기록은 계정·칭호·랭킹에 반영하지 않습니다.')+'</p>'+(isPublic?'<div class="final-score"><strong>'+formatScore(score)+'</strong><span>'+(won?'3회 격파 · 완주 · ':'')+kills+' 처치 · '+formatTime(elapsed)+'</span></div><p id="expansion-rank-status">'+(entry?'랭킹 등록을 확인하고 있어요.':'이 판은 랭킹 등록 조건을 충족하지 못했어요. 저장 기록은 보존합니다.')+'</p>':'')+'<button id="expansion-retry">다시 출발</button>'+(isPublic?'<button id="expansion-ranking">랭킹 보기</button>':'')+'<button id="expansion-back">돌아가기</button></div>';
 $('#expansion-retry').onclick=()=>isPublic?startPublicExpansionJourney(act):startExpansionJourney(0,act);$('#expansion-back').onclick=showIntro;
 if(isPublic)$('#expansion-ranking').onclick=()=>showRanking(expansionRankView(act));
 if(!entry)return;
 const before=readAccountProfile(runStorage),key='act'+entry.act,after=recordBestScore(before,key,entry.score);
 if(after.bestScores[key]>before.bestScores[key]&&!writeAccountProfile(runStorage,after))setText($('#expansion-rank-status'),'기기 최고 기록을 저장하지 못했어요.');
 const role=accountRole({admin:adminMode,tester:betaTesterMode}),decision=rankingDecision({isTestRun:developerRun,localInspection,score:entry.score,name:entry.name,native:account.native,admin:role.isAdmin,tester:role.isTester,user:account.user(),paceTrusted:paceTrusted(paceGame,paceReal)});
 if(!decision.eligible){logRankingFailure(runStorage,{uid:entry.uid,score:entry.score,reason:decision.reason});setText($('#expansion-rank-status'),'이 판은 모두의 랭킹 등록 조건을 충족하지 못했어요.');return;}
 online.flush().catch(()=>0).then(()=>{if(expansionOwner()!==entry.uid)throw Error('account changed');return online.submit(entry,500);}).then(r=>{
  if(serial!==rankSerial)return;setText($('#expansion-rank-status'),r.rank?'모두의 랭킹 '+r.rank+'위에 올랐어요!':'랭킹에 기록했어요.');
 }).catch(error=>{logRankingFailure(runStorage,{uid:entry.uid,score:entry.score,reason:classifySubmitError(error)});if(serial===rankSerial)setText($('#expansion-rank-status'),expansionOwner()!==entry.uid?'계정이 바뀌어 등록을 중단했어요.':'서버 등록을 확인하지 못했어요. 랭킹 화면에서 다시 확인하세요.');});
}

function advancePublicExpansionLap(){
 if(!canSaveExpansion()||!settleExpansionTitles())return false;
 const campaign=advanceExpansionPublicCampaign(expansionPublicEntry.campaign,expansionJourney.act);if(!campaign)return false;
 const next=expansionApi.createExpansionJourney(expansionJourney.act,0,expansionJourney.course.seed),run={...expansionRunSnapshot(),cycle:campaign.lap,stage:0,hp:Math.min(maxPlayerHp(),hp+JOURNEY_HEAL)},entry=createExpansionEntry(next,run,[0,0,5],expansionEntry);
 if(!entry)return false;const result=expansionStore(next.act).write({...expansionPublicEntry,entry,campaign});if(!result.ok)return false;
 expansionPublicEntry=result.value;expansionEntry=result.value.entry;expansionJourney=next;cycle=campaign.lap;stage=0;hp=run.hp;wave();return true;
}
function exitExpansionJourney(){
 if(!exitOpen)return;touch.reset();keys.clear();exitOpen=false;
 if(expansionJourney.phase==='boss'){
  if(expansionChannel==='public'){
   if(!settleExpansionTitles()){$('#toast').textContent='보스 보상 저장을 다시 확인해야 해요. 격파 기록은 보존했습니다.';exitOpen=true;return;}
   const wins=expansionPublicEntry.campaign.bossWins[expansionCampaignBoss(expansionJourney.act)];
   if(wins<EXPANSION_CAMPAIGN_CLEARS){if(!advancePublicExpansionLap()){exitOpen=true;$('#toast').textContent='다음 순환 입구를 저장하지 못했어요. 완료한 보스 기록은 남아 있습니다.';}return;}
  }
  if(!finishExpansionEntry()){$('#toast').textContent='기록을 종료하지 못했어요. 계정과 저장 공간을 확인하세요.';exitOpen=true;return;}
  expansionJourney.phase='finished';showExpansionResult(true);return;
 }
 expansionApi.advanceExpansionJourney(expansionJourney);stage=expansionJourney.room;wave();
}

for(const material of new Set([stadium.coverMaterial,...Object.values(stadium.boundaryMaterials)]))sharedDynamicMaterials.add(material);
for(const material of new Set([...skyway.materials,skyway.coverMaterial,...Object.values(skyway.boundaryMaterials)]))sharedDynamicMaterials.add(material);
for(const geometry of skyway.geometries)sharedGeometries.add(geometry);
for(const material of mirrorPanels.materials)sharedDynamicMaterials.add(material);for(const geometry of mirrorPanels.geometries)sharedGeometries.add(geometry);
const act2Ctx={get player(){return player.position;},collide:(p,r)=>collide(p,r),hit:a=>hitPlayer(a),
 bolt:(pos,dir,spec)=>stadiumBolt(pos,dir,{...spec,speed:spec.speed*difficulty(cycle,region).projectileSpeed*ACT2_PRESSURE.projectile}),
 blocked:(a,b)=>segmentHitsCover({x:a.x,z:a.z},{x:b.x,z:b.z},obstacles,.1),shots:()=>shots,
 batShot:shot=>{shot.life=0;vfx.pulse(shot.ob.position,'reflect',.8,.22);vfx.burst(shot.ob.position,'amber',10,1.2);},canBat:()=>LS.pierceHits<=1,random:rng,burst:(p,c,n)=>vfx.burst(p,c,n,1.25),sound:id=>audio.play(id)};
const relayCtx={get player(){return player.position;},hit:a=>{if(invuln>0||shellTime>0)return false;hitPlayer(a);return true;},sound:id=>audio.play(id)};
function spawnAct2(type,x,z){const e=createAct2Minion(scene,type,rng);e.g.position.set(x,0,z);const art=ACT2_ART[type];attachActorArt(e,camera,release,{file:art.file,size:art.size,directional:true,baseline:art.baseline,occlusion:qualityLevel>0});enemies.push(e);return e;}
function spawnAct2WardenAt(x,z,variant,{support=false,scaled=false}={}){const encounter=act2WardenEncounter(cycle,austinsDefeated),e=createAct2Warden(scene,variant),art=ACT2_WARDEN_ART[e.variant];e.g.position.set(x,0,z);e.support=support;e.hp=e.maxHp=e.maxHp*encounter.hpScale;attachActorArt(e,camera,release,{file:art.file,size:art.size,directional:true,baseline:art.baseline,occlusion:qualityLevel>0});if(scaled){e.hp*=difficulty(cycle,region).bossHp*levelPressure();e.maxHp=e.hp;}enemies.push(e);return e;}
const act3Ctx={get player(){return player.position;},collide:(p,r)=>collide(p,r),hit:a=>{if(invuln>0||shellTime>0)return false;hitPlayer(a);return true;},bolt:(pos,dir,spec)=>skywayBolt(pos,dir,{...spec,speed:spec.speed*difficulty(cycle,region).projectileSpeed*act3RoomPressure(stage).projectile}),sound:id=>audio.play(id),summon:types=>{for(const type of types){const p=act3ReinforcementSpawn(crowdIndex++),minion=spawnAct3(type,p.x,p.z);minion.hp*=difficulty(cycle,region).hp*ACT3_PRESSURE.hp*levelPressure();minion.maxHp=minion.hp;vfx.pulse(minion.g.position,'chain',1.25,.3);}}};
 function spawnAct3(type,x,z){const e=createAct3Minion(scene,type,rng),art=ACT3_ART[type];e.home.set(x,0,Math.max(-6.15,z));e.homeReady=true;e.g.position.set(x,0,-8.05);attachActorArt(e,camera,release,{file:art.file,size:art.size,atlasFrame:art.frame,topDownFacing:true,baseline:art.baseline,occlusion:false,lighting:false});enemies.push(e);return e;}
function spawnAct3WardenAt(x,z){const e=createAct3Warden(scene),art=ACT3_ART.act3warden;e.g.position.set(x,0,z);attachActorArt(e,camera,release,{file:art.file,size:art.size,atlasFrame:art.frame,topDownFacing:true,baseline:art.baseline,occlusion:false,lighting:false});enemies.push(e);return e;}
function drawRoom(){
 if(!expansionJourney)expansionTerrain=null;
 expansionJourneyView?.setActive(Boolean(expansionJourney||survivalSession?.actCount===5&&survivalSession.act>=3));
 if(expansionJourney){
  for(const group of [arenaGroup,roomCover,trapGroup])for(const child of [...group.children])release(child);
  obstacles.length=0;traps=[];clockFloor=null;stadium.setActive(false);skyway.setActive(false);mirrorPanels.setActive(false);mirrorPanelsActive=false;survivalArt?.setActive(false);
  for(const object of hiddenGarden)object.visible=false;player.scale.setScalar(1.25);
  const s=expansionJourney,distance=s.course.distance,canyon=s.act==='crystalGorge',length=s.phase==='boss'?distance+14:140;
  expansionJourneyView.setCourse(s.act);expansionJourneyView.setTerrainOnly(false);expansionTerrain=canyon?expansionApi.createCrystalCombatBridge(s.course.walls,{position:(x,z)=>new V(x,0,z)}):null;
  arena=canyon?{shape:'rect',halfWidth:8,halfDepth:10,start:s.phase==='boss'?{x:-4,z:0}:{x:0,z:7},exit:{x:0,z:-7,radius:2}}:{shape:'rect',halfWidth:length,halfDepth:7,start:{x:s.phase==='boss'?distance-4:0,z:0},exit:{x:distance,z:0,radius:2}};
  gate.position.set(arena.exit.x,0,arena.exit.z);syncExpansionCrystals();return;
 }
 if(survivalSession){
  arena=SURVIVAL.arena;clockFloor=null;shadowClock=SHADOW_REFRESH;
  for(const group of [arenaGroup,roomCover,trapGroup])for(const child of [...group.children])release(child);
  obstacles.length=0;traps=[];stadium.setActive(false);skyway.setActive(false);mirrorPanelsActive=false;mirrorPanels.setActive(false);
  for(const object of hiddenGarden)object.visible=false;
  if(!survivalArt)survivalArt=createSurvivalArt(scene,camera,{baseUrl:import.meta.env.BASE_URL,mobile:mobileDevice,capacity:SURVIVAL.maxEnemies,groundTexture:stone,arena});
  survivalArt.setReadability(!survivalComparisonEnabled||survivalReadability);player.scale.setScalar(!survivalComparisonEnabled||survivalReadability?1.55:1.25);
  survivalArt.setAct(survivalSession.act);survivalArt.setActive(true);
  if(survivalSession.actCount===5&&survivalSession.act>=3){
   if(!survivalExpansion||survivalExpansion.act!==survivalSession.act||survivalExpansion.lap!==survivalSession.lap){survivalExpansion=createSurvivalExpansion(survivalSession);survivalExpansion.lap=survivalSession.lap;}
   expansionJourneyView?.setCourse(survivalSession.act===3?'crosswind':'crystalGorge');expansionJourneyView?.setTerrainOnly(true);
   if(survivalSession.act===4)void prepareExpansionCover();
   expansionTerrain=survivalExpansion.terrain.length?expansionApi.createCrystalCombatBridge(survivalExpansion.terrain,{position:(x,z)=>new V(x,0,z)}):null;syncExpansionCrystals();
  }else survivalExpansion=null;
  $('#stages').hidden=true;return;
 }
 survivalArt?.setActive(false);player.scale.setScalar(1.25);$('#stages').hidden=false;
 shadowClock=SHADOW_REFRESH;const mirrorRoom=Boolean(mirrorSession),clockRoom=!mirrorRoom&&inAustinRoom()&&!isAct2(region)&&!isAct3(region),bossRoom=mirrorRoom||inAustinRoom();arena=mirrorRoom?MIRROR_ARENA:clockRoom?AUSTIN_ARENA:arenaFor(stage,cycle,region);
 for(const child of [...arenaGroup.children])release(child);buildRoomBoundary();clockFloor=clockRoom?createClockFloor(arenaGroup):null;
 for(const child of [...roomCover.children])release(child);obstacles.splice(0,obstacles.length,...(mirrorRoom?mirrorFloorObstacles(mirrorSession.floor):bossRoom?[]:roomFor(stage,cycle,region).covers).map(o=>({...o})));
 const exitSpot=arena.exit||EXIT;gate.position.set(exitSpot.x,0,exitSpot.z);if(mirrorRoom)buildMirrorObstacleArt(roomCover,obstacles,{camera,mobile:mobileDevice});else if(isAct2(region))buildStadiumCoverArt(roomCover,obstacles,stadium.coverMaterial);else if(!isAct3(region))buildCoverArt(roomCover,obstacles,mats);
 for(const child of [...trapGroup.children])release(child);traps=bossRoom?[]:trapsFor(stage,cycle,region);createTrapVisuals(trapGroup,traps,mats).forEach((visual,i)=>traps[i].visual=visual);
 if(!isAct2(region)||mirrorRoom)stadium.setActive(false);if(!isAct3(region)||mirrorRoom)skyway.setActive(false);if(!mirrorRoom&&isAct2(region))stadium.setActive(true,arena);if(!mirrorRoom&&isAct3(region))skyway.setActive(true);
 mirrorPanelsActive=mirrorRoom&&effectiveLaws().includes('reflect');mirrorPanels.setActive(mirrorPanelsActive);
 if(mirrorRoom)for(const object of hiddenGarden)object.visible=false;else if(!isAct2(region)&&!isAct3(region))for(const object of hiddenGarden)object.visible=true;
 freezeStatic(arenaGroup);freezeStatic(roomCover);
}
// 방 안에서 움직이지 않는 것들의 행렬을 잠근다(함정과 배우는 제외).
function freezeStatic(group){group.updateMatrixWorld(true);group.traverse(o=>{o.matrixAutoUpdate=false;});}
// Everyone's ranking lives on the jpmathlab Firebase project; this browser's board stays as the fallback.
const online=localInspection?{flush:async()=>0,top:async()=>[],personalRank:async()=>({entry:null,rank:0}),uid:()=>null,submit:async()=>{throw new Error('Local inspection never submits rankings');}}:createOnlineRanking({storage:runStorage,authProvider:()=>account.tokenSession()});let playerName=lastName(runStorage),rankSerial=0;
// 관리자(개발자) 계정도 모두의 랭킹을 받는다. 빠지는 것은 실험 판(developerRun)뿐이다.
const betaRankingEligible=()=>accountCanRank({native:account.native,admin:adminMode,tester:betaTesterMode,user:account.user()});
// 정원의 식물은 시각 기록이고, 각 막의 최종 보스가 남긴 작은 성장점만 전투에 적용된다.
let garden=readGarden(runStorage);
// A read-only-looking local art board assembled from in-memory data. It never
// writes over the tester's garden and cannot be enabled on the public host.
if(localInspection&&new URLSearchParams(location.search).has('gardenLab'))garden=normalizeGarden({...garden,harvests:30,mastery:{power:4,move:4,critical:4,cooldown:4,maxHp:4},plots:[
 {seed:'reflect',growth:0,style:'balanced'},{seed:'split',growth:2,style:'agile'},
 {seed:'chain',growth:4,style:'rush'},{seed:'orbit',growth:9,style:'endure'},
 {seed:'gravity',growth:9,style:'agile'},{seed:'frost',growth:9,style:'rush'}
]});
let gardenFx=gardenEffects(garden),lastHarvest=null;
const gardenStats=()=>gardenFx.mastery;
// 도감 칭호: 10종마다 +0.5%, 30종마다 추가 +0.5%(150종에서 최대 +10%). 정원 숙련과 더한다.
const codexRate=()=>mirrorSession?0:(seedTitle?.state().codexBonus||0);
const masteryRate=id=>mirrorSession?0:((gardenStats()?.points?.[id]||0)*MASTERY_STEP)+codexRate()+(seedTitle?.state().clearStatBonus||0)+(id==='cooldown'?(seedTitle?.state().cooldownBonus||0):id==='power'?(seedTitle?.state().powerBonus||0):id==='critical'?(seedTitle?.state().criticalBonus||0):0);
let seedTitle=null;
const maxPlayerHp=()=>mirrorSession?100:100*(1+masteryRate('maxHp'))+(seedTitle?.state().maxHpBonus||0);
const gardenPower=()=>mirrorSession?1:1+masteryRate('power');
const gardenCooldown=()=>mirrorSession?1:1+masteryRate('cooldown');
const totalCritChance=()=>Math.min(.25,(LS?.critChance||0)+masteryRate('critical'));
// 정원 장면은 처음 볼 때 만든다. 만든 뒤에는 정원 화면과 첫 화면에서 이 장면을 그린다.
let gardenScene=null,gardenSelection=null;
function ensureGardenScene(){
 if(!gardenScene){gardenScene=createGardenScene({mobile:mobileDevice});gardenScene.resize(canvasRect.width||1,canvasRect.height||1);}
 gardenScene.setGarden(garden,{austinDefeated:austinKnown()});
 return gardenScene;
}
// 옛 이어하기 기록만 복구하기 위한 변이 상태. 새 정원에서는 열리지 않는다.
const mutations=new Map(),runes=[];
function austinKnown(){return Boolean(profile?.bosses?.includes('austin'));}
function refreshGardenEffects(){gardenFx=gardenEffects(garden,activeSlots(garden,{austinDefeated:austinKnown()}));}
// 생명의 나무 v2(tree-of-life.js): 보스·어려운 도전에서만 씨앗, 놀고 오면 물방울. 보상 줄을 돌려준다.
function treeRewardLine(notes){return notes.map(n=>n.type==='seed'?`${TREE_RARITY[n.rarity].name} 씨앗 '${TREE_SEEDS[n.seed].name}'`:n.type==='shard'?`씨앗 조각 +${n.count}`:'').filter(Boolean).join(' · ');}
function treeReward(event){if(developerRun)return '';const r=rollTreeReward(garden.tree,event,rng);garden={...garden,tree:r.tree};writeGarden(runStorage,garden);const line=treeRewardLine(r.notes);return line?`생명의 나무 · ${line}`:'';}
function treeWater(amount=1){if(developerRun)return;const r=waterTree(garden.tree,amount);garden={...garden,tree:r.tree};writeGarden(runStorage,garden);}
function grantFinalBossGardenMemory(boss=null){
 const result=grantBossMastery(garden,rng);garden=result.garden;writeGarden(runStorage,garden);refreshGardenEffects();
 const spec=MODE_BOSSES[boss],act=spec?.act||1,prof=readAccountProfile(runStorage),wins=prof[spec?.counter||'austinWins'];
 const tree=boss?treeReward({type:'boss',boss,act,final:true,noHit:runDamageTaken<=bossFightDamage0,wins,law:dominantLaw(Object.fromEntries(effectiveLevels(levels,heldForms)))}):'';
 return {line:[masteryLine(result),tree].filter(Boolean).join(' · '),milestone:result.milestone||null};
}
function grantGoldenFruitPotion(growth){
 if(growth?.milestone?.type!=='fruit')return '';
 const shop=readShop(runStorage),id=goldenFruitPotion(rng,shop.stash,STASH_ITEMS);
 if(!id){earnCoins(runStorage,200);return '황금 열매 보너스 · 창고가 가득 차 200원으로 교환';}
 stashItem(runStorage,id,1);return `황금 열매 보너스 · ${ITEMS[id].name} 1개 창고 보관`;
}
function gardenGuideLaw(){return gardenFx.formGuides.find(law=>!levels.has(law))||null;}
function requireName(){const input=$('#player-name'),name=cleanName(input?input.value:playerName);
 if(!input&&(!name||isBadName(name)||!rankingTermsAccepted(runStorage))){showIntro();if($('#player-name'))requireName();return false;}
 // 거른 별명(name-filter.js)은 쓸 수 없다. 휴대폰에서는 안내 줄이 숨겨지므로 칸을 비우고 칸 안에 이유를 적는다.
 if(name&&isBadName(name)){playerName='';nameRejected=true;if(input){input.value='';input.placeholder='그 별명은 쓸 수 없어요';input.classList.add('need');input.focus();setText($('#name-hint'),'그 별명은 쓸 수 없어요 · 친구가 봐도 괜찮은 별명으로 바꿔 주세요');}return false;}
 if(!name){if(input){input.classList.add('need');input.focus();setText($('#name-hint'),nameRejected?'그 별명은 쓸 수 없어요 · 친구가 봐도 괜찮은 별명으로 바꿔 주세요':'이름을 먼저 적어 주세요 · 이 이름으로 랭킹에 올라가요');}return false;}
 const consent=$('#ranking-terms');if(!rankingTermsAccepted(runStorage)&&!consent?.checked){if(consent)consent.focus();setText($('#name-hint'),'명예의 전당 이용규칙을 읽고 동의해 주세요');return false;}
 setRankingTermsAccepted(runStorage,true);playerName=saveName(runStorage,name);return true;}
const discoveredCount=p=>p.forms.filter(id=>DISCOVERY_FORMS[id]).length;
let saveOK=false,profile=readDiscoveries(runStorage);const titleAccount=readAccountProfile(runStorage);seedTitle=createSeedTitle(player,{austin:profile.bosses.includes('austin'),austinClear:profile.bosses.includes('austinclear'),austinVeteran:profile.bosses.includes('austinveteran')||titleAccount.austinWins>=10,alwaysClear:profile.bosses.includes('alwaysclear'),alwaysBeginner:profile.bosses.includes('alwaysbeginner'),alwaysVeteran:profile.bosses.includes('alwaysveteran')||titleAccount.alwaysWins>=10,johan:profile.bosses.includes('tempestcarrier'),johanClear:profile.bosses.includes('johanclear'),johanVeteran:profile.bosses.includes('johanveteran')||titleAccount.johanWins>=10,crosswind:profile.bosses.includes('crosswindKeeper'),crosswindClear:profile.bosses.includes('crosswindclear'),crosswindVeteran:profile.bosses.includes('crosswindveteran')||titleAccount.crosswindWins>=10,crystal:profile.bosses.includes('crystalGardener'),crystalClear:profile.bosses.includes('crystalclear'),crystalVeteran:profile.bosses.includes('crystalveteran')||titleAccount.crystalWins>=10,discovered:discoveredCount(profile),total:Object.keys(DISCOVERY_FORMS).length,badges:titleAccount.badges,equipped:titleAccount.equippedTitle});
const bossPet=createBossPet(scene,{profile,id:readBossPet(runStorage,profile).id,reducedTextures:mobileDevice||qualityLevel===0});
const sourceName=id=>id==='seed'?'기본 씨앗':FORMS[id]?.name||LAWS[id]?.name||'연계 효과';
function renderRoomAnalysis(report,{training=false}={}){
 const root=$('#room-analysis');if(!root||!report){if(root)root.hidden=true;return;}
 const top=report.sources.slice(0,3),utility=report.utility||{},extras=[utility.freeze?`빙결 ${Math.round(utility.freeze)}`:'',utility.pull?`끌어당김 ${Math.round(utility.pull)}`:'',utility.blocked?`탄환 방어 ${Math.round(utility.blocked)}`:'',utility.critical?`치명타 ${Math.round(utility.critical)}`:''].filter(Boolean);
 root.innerHTML=`<header><span>${training?'훈련 결과':'방 클리어 분석'}</span><strong>${combatGrade(report.dps)} · ${Math.round(report.dps)} DPS</strong></header><div class="analysis-bars">${top.map(row=>`<p><span>${escapeHtml(sourceName(row.id))}</span><i><b style="width:${Math.max(3,Math.round(row.share*100))}%"></b></i><em>${Math.round(row.dps)}</em></p>`).join('')}</div><footer><span>${report.kills}처치 · 최고 1초 ${Math.round(report.peak)}</span>${extras.length?`<small>${extras.join(' · ')}</small>`:''}<button type="button" aria-label="전투 분석 닫기">×</button></footer>`;
 root.querySelector('button').onclick=()=>{root.hidden=true;};root.hidden=false;
}
function combatAnalysisSummary(report){
 if(!report)return '';
 const top=report.sources.slice(0,3),utility=report.utility||{},extras=[utility.freeze?`\uBE59\uACB0 ${Math.round(utility.freeze)}`:'',utility.pull?`\uB04C\uC5B4\uB2F9\uAE40 ${Math.round(utility.pull)}`:'',utility.blocked?`\uD0C4\uD658 \uBC29\uC5B4 ${Math.round(utility.blocked)}`:'',utility.critical?`\uCE58\uBA85\uD0C0 ${Math.round(utility.critical)}`:''].filter(Boolean);
 return `<section class="death-combat-analysis"><header><span>\uB9C8\uC9C0\uB9C9 \uC804\uD22C \uBD84\uC11D</span><strong>${combatGrade(report.dps)} \u00b7 ${Math.round(report.dps)} DPS</strong></header><div class="analysis-bars">${top.map(row=>`<p><span>${escapeHtml(sourceName(row.id))}</span><i><b style="width:${Math.max(3,Math.round(row.share*100))}%"></b></i><em>${Math.round(row.dps)}</em></p>`).join('')}</div><footer><span>${report.kills}\uCC98\uCE58 \u00b7 \uCD5C\uACE0 1\uCD08 ${Math.round(report.peak)}</span>${extras.length?`<small>${extras.join(' \u00b7 ')}</small>`:''}</footer></section>`;
}
function finishRoomAnalysis(training=false,show=false){
 const report=combatAnalysis.finish(elapsed);if(!report)return null;lastRoomAnalysis=report;if(show)renderRoomAnalysis(report,{training});else $('#room-analysis').hidden=true;
 if(!expansionJourney&&!developerRun&&!training&&!survivalSession){profile=writeDiscoveries(runStorage,recordPersonalBests(profile,report));seedTitle.setDiscovered(discoveredCount(profile));}
 return report;
}
function buildRoomBoundary(){if(!shouldBuildArenaBoundary(region))return;const stadiumRoom=isAct2(region);buildArenaBoundary(arenaGroup,arena,stadiumRoom?stadium.boundaryMaterials:mats,stadiumRoom);}
function awardExpansionBossTree(mode,runId,boss,ordinal,event){
 let current;try{const bytes=runStorage.getItem(GARDEN_KEY),old=bytes===null?null:JSON.parse(bytes);if(bytes!==null&&(!old||typeof old!=='object'||Array.isArray(old)||old.version!==undefined&&(!Number.isInteger(old.version)||old.version<1||old.version>6)))return false;current=autoPlantSeeds(normalizeGarden(old));}catch{return false;}
 const reward=expansionBossTreeReward(current.tree,{mode,runId,boss,ordinal,event});if(!reward.ok)return false;
 if(!reward.applied)return true;
 const next={...current,tree:reward.tree};
 // Chance, water and the complete receipt share one verified local write.
 if(!writeGarden(runStorage,next)||JSON.stringify(readGarden(runStorage).tree)!==JSON.stringify(reward.tree)){$('#toast').textContent='나무 보상 저장을 다시 확인해야 해요. 격파 기록은 남아 있어요.';return false;}
 garden=next;return true;
}
function protectJourneyBossReceipts(){
 if(!pendingJourneyBossTitles.length)return true;
 if(currentJourneyOwner!==(account.user()?.uid||'guest'))return false;
 return pendingJourneyBossTitles.every(event=>journeyBossOutbox().enqueue({mode:'journey',runId:currentJourneyRunId,...event}));
}
function persistJourneyBossTitles(){
 if(currentJourneyOwner!==(account.user()?.uid||'guest'))return false;
 const entry=readCheckpoint(actStore());
 return Boolean(entry&&writeCheckpoint(actStore(),{...entry,runId:currentJourneyRunId,bossReceiptOwner:currentJourneyOwner,pendingBossTitles:pendingJourneyBossTitles.map(e=>({...e}))}));
}
function settleJourneyBossTitles(){
 if(developerRun||localInspection||survivalSession||expansionJourney)return false;
 if(currentJourneyOwner!==(account.user()?.uid||'guest'))return false;
 if(!pendingJourneyBossTitles.length)return true;
 for(const event of [...pendingJourneyBossTitles]){
  if(!awardModeBoss('journey',currentJourneyRunId,event.boss,event.ordinal))return false;
  if(!journeyBossOutbox().ack({mode:'journey',runId:currentJourneyRunId,...event}))return false;
  pendingJourneyBossTitles=pendingJourneyBossTitles.filter(e=>e.boss!==event.boss||e.ordinal!==event.ordinal);
 }
 return persistJourneyBossTitles();
}
function recordJourneyBossTitle(boss,ordinal){
 pendingJourneyBossTitles=addJourneyBossReceipt(pendingJourneyBossTitles,boss,ordinal);
 if(currentJourneyOwner!==(account.user()?.uid||'guest')){$('#toast').textContent='계정이 바뀌어 보스 기록을 보관 중이에요. 원래 계정으로 돌아와 주세요.';return false;}
 const retained=journeyBossOutbox().enqueue({mode:'journey',runId:currentJourneyRunId,boss,ordinal});
 // This independent copy survives an unavailable/full delivery queue. Keep
 // entrance combat/loot state unchanged; replay uses the same boss tuple.
 const checkpointed=persistJourneyBossTitles(),settled=settleJourneyBossTitles();
 if(!settled&&!retained){if(!paused)togglePause();$('#toast').textContent=checkpointed?'보스 기록이 입구 저장에 남아 있어요. 보관 공간을 확인한 뒤 다시 시도해 주세요.':'보스 기록을 저장하지 못했어요. 새 판으로 바꾸지 않고 재시도를 기다립니다.';}
 return settled;
}
function modeBossOutbox(){const owner=account.user()?.uid||'guest';return createModeBossOutbox(rawStorage,owner,{currentOwner:()=>account.user()?.uid||'guest',practice:()=>Boolean(localInspection||developerRun)});}
function journeyBossOutbox(){const owner=currentJourneyOwner||account.user()?.uid||'guest';return createModeBossOutbox(rawStorage,owner,{channel:'journey',currentOwner:()=>account.user()?.uid||'guest',practice:()=>Boolean(localInspection||developerRun)});}
function retryModeBossRewards(){
 const owner=account.user()?.uid||'guest';
 // Wait for the signed-in account snapshot before repairing local receipts.
 try{if(localInspection||developerRun||owner!=='guest'&&rawStorage?.getItem('seed-cloud-owner-v1')!==owner)return;}catch{return;}
 modeBossOutbox().retry(e=>awardModeBoss(e.mode,e.runId,e.boss,e.ordinal));
 createModeBossOutbox(rawStorage,owner,{channel:'journey',currentOwner:()=>account.user()?.uid||'guest',practice:()=>Boolean(localInspection||developerRun)}).retry(e=>awardModeBoss(e.mode,e.runId,e.boss,e.ordinal));
}
function awardModeBoss(mode,runId,boss,ordinal,practice=false){
 practice=Boolean(practice||localInspection||developerRun);
 if(practice)return true;
 const outbox=modeBossOutbox(),receipt={mode,runId,boss,ordinal};
 // Mark new grants before the counter write. Legacy already-counted receipts
 // have no tree marker, so old checkpoints cannot reroll historical rewards.
 const before=readAccountProfile(runStorage),previous=before.bossRuns?.[mode+':'+runId]?.[boss]||0,treeContext={wins:Math.min(100000,(before[MODE_BOSSES[boss]?.counter]||0)+1),law:mode==='survival'?dominantLaw(Object.fromEntries(effectiveLevels(levels,heldForms))):null};
 // Journey 1..3 retains its existing mastery/no-hit tree reward below the death hook.
 // The common delivery route owns its counter and discovery flags only.
 const legacyJourneyTree=mode==='journey'&&MODE_BOSSES[boss]?.act<4;
 if(!outbox.enqueue(receipt,{durableTree:!legacyJourneyTree&&ordinal>previous,treeContext})){$('#toast').textContent='보스 격파 기록을 보관하지 못했어요 · 지급을 다시 시도해요';return false;}
 const result=recordModeBossVictory(runStorage,{mode,runId,boss,ordinal,practice});
 if(!result.saved){$('#toast').textContent='보스 칭호 저장을 다시 시도하고 있어요';return false;}
 // Read current discoveries to preserve data merged from another device.
 profile=readDiscoveries(runStorage);let saved=true;
 for(const id of result.awards){const reward=remember('bosses',id,true);saved=reward.saved&&saved;}
 const persisted=readDiscoveries(runStorage);saved=result.awards.every(id=>persisted.bosses.includes(id))&&saved;
 if(saved){
  const act=MODE_BOSSES[boss].act,frozen=outbox.treeContext(receipt),event={type:'boss',boss,act,final:true,wins:frozen?.wins??result.wins,law:frozen?frozen.law:treeContext.law};
  if(!legacyJourneyTree&&(act>=4||outbox.requiresTree(receipt))){if(!awardExpansionBossTree(mode,runId,boss,ordinal,event))return false;}
  void cloud.flush().catch(()=>{});
 }
 return saved&&outbox.ack(receipt);
}
function remember(kind,id,sharedBoss=false){if(expansionJourney&&!canSaveExpansion()||developerRun||survivalSession&&!(sharedBoss&&kind==='bosses'))return {profile,saved:true};const before=discoveredCount(profile);const result=recordDiscovery(runStorage,profile,kind,id);profile=result.profile;if(kind==='bosses'&&id==='austin')seedTitle.setUnlocked(true);if(kind==='bosses'&&id==='austinclear')seedTitle.setAustinClearUnlocked(true);if(kind==='bosses'&&id==='austinveteran')seedTitle.setAustinVeteranUnlocked(true);if(kind==='bosses'&&id==='alwaysclear')seedTitle.setAlwaysClearUnlocked(true);if(kind==='bosses'&&id==='alwaysbeginner')seedTitle.setAlwaysBeginnerUnlocked(true);if(kind==='bosses'&&id==='alwaysveteran')seedTitle.setAlwaysVeteranUnlocked(true);if(kind==='bosses'&&id==='tempestcarrier')seedTitle.setJohanUnlocked(true);if(kind==='bosses'&&id==='johanclear')seedTitle.setJohanClearUnlocked(true);if(kind==='bosses'&&id==='johanveteran')seedTitle.setJohanVeteranUnlocked(true);if(kind==='bosses'&&id==='crosswindKeeper')seedTitle.setCrosswindUnlocked(true);if(kind==='bosses'&&id==='crosswindclear')seedTitle.setCrosswindClearUnlocked(true);if(kind==='bosses'&&id==='crosswindveteran')seedTitle.setCrosswindVeteranUnlocked(true);if(kind==='bosses'&&id==='crystalGardener')seedTitle.setCrystalUnlocked(true);if(kind==='bosses'&&id==='crystalclear')seedTitle.setCrystalClearUnlocked(true);if(kind==='bosses'&&id==='crystalveteran')seedTitle.setCrystalVeteranUnlocked(true);seedTitle.setDiscovered(discoveredCount(profile));const news=codexNews(before,discoveredCount(profile));if(news)setTimeout(()=>{$('#toast').textContent=news;},1800);if(!result.saved)$('#toast').textContent='발견은 이번 접속에만 남습니다 · 브라우저 저장 불가';return result;}
function syncLaws(){chosen.clear();mutated.clear();for(const [id,v] of levels){chosen.add(id);if(v>=2)mutated.add(id);}
 // 관통을 조합·진화에 넣어도 기본 탄의 관통 수·치명타는 남는다(9/22). 슬롯 법칙(chosen)에는 넣지 않는다 —
 // 넣었더니 슬롯 줄에 '관통 Lv.0'이 자리를 차지하고, 없는 관통으로 조합이 열리고, 저장에도 섞였다.
 const shotLevels=baseShotLevels(levels,heldForms);shotPierce=(shotLevels.get('pierce')||0)>0;LS=relicLawStats(lawStats(shotLevels),relics);document.querySelectorAll('#rules>div').forEach(n=>{const lv=levelOf(levels,n.dataset.rule),mark=mutationOf(mutations,n.dataset.rule);n.classList.toggle('active',lv>0);n.classList.toggle('mutated',Boolean(mark));n.querySelector('span:not(.law-art)').textContent=LAWS[n.dataset.rule].name+(lv?' Lv.'+lv:'')+(mark?' '+mark.badge:'');});}
function levelPressure(){return 1+.07*Math.max(0,buildLevel(levels,heldForms)-1);}
function effectiveLaws(){return [...effectiveLevels(levels,heldForms).keys()];}
// 조합·진화: 재료 법칙의 강화 수를 저금한 뒤 합친다(그 절반이 '모든 탄 피해'로 남는다, progression.FUSION_BONUS_KEEP).
function bankAndFuse(id){const gain=consumedUpgrades(levels,FORMS[id]?.requires);if(!fuse(levels,heldForms,id))return false;bankedUpgrades+=gain;return true;}
function bankAndEvolveSolo(id){const gain=consumedUpgrades(levels,SOLO_FORMS[id]?.requires);if(!evolveSolo(levels,heldForms,id))return false;bankedUpgrades+=gain;return true;}
function syncForms(reset=false){
 // One combat per attack: a twin awakening runs two (keys id#0, id#1); formAttacks maps each key to the attack it fires.
 const activeEntries=activeCombatEvolutions(heldForms,FORMS),wanted=new Map();
 for(const {id,level} of activeEntries)attackPartsOf(id).forEach((attack,i)=>wanted.set(combatKey(id,i),{id,attack,level,index:i}));
 for(const [key,combat] of formCombats)if(!wanted.has(key)){combat.dispose();formCombats.delete(key);formCooldowns.delete(key);formAttacks.delete(key);}
 for(const [key,{id,attack,level,index}] of wanted){let combat=formCombats.get(key);if(!combat){combat=createFormCombat(scene,formOptions());formCombats.set(key,combat);formCooldowns.set(key,0);}formAttacks.set(key,attack);if(reset)combat.clear();const twin=isTwinForm(id);combat.set(twin?attack:id,level,{twin,twinId:twin?id:null,openingDelay:2+index*AWAKEN_TWIN_STAGGER,...orbitShieldRole(heldForms,FORMS,id)});}
 player.userData.setEvolution?.(heldForms);
 updateFormLabel();
 syncLaws(); // 관통이 든 진화를 얻거나 잃으면 기본 탄 관통·치명타도 바로 따라간다
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
 $('#overlay').innerHTML=`<p>두 진화가 서로를 알아봅니다</p><h2>완성·쌍둥이 각성</h2><p>1차 융합 + 지정된 단독 진화는 완성 진화, 두 단독 진화는 쌍둥이 각성이 됩니다. 재료는 하나의 칸으로 합쳐집니다.</p><div class="form-cards">${options.map((o,i)=>awakenCard(o,heldForms,awakenLevel(heldForms,o),profile.forms.includes(o.id),i)).join('')}</div><p class="form-note">완성 진화는 융합 공격에 새 패턴을 더합니다. 쌍둥이는 두 단독 공격이 함께 나갑니다. 금테는 같은 각성 단계를 뜻하며 공격력 순위는 아니에요.<br>지금 합치지 않아도 이후 카드 화면에서 다시 고를 수 있어요.</p><button id="keep-awaken" class="primary">지금은 각성하지 않기</button>`;
 document.querySelectorAll('[data-awaken]').forEach(b=>b.onclick=()=>{if(mode!=='forms')return;const o=options[Number(b.dataset.awaken)];if(!o||!awaken(heldForms,o))return;remember('forms',o.id);syncLaws();syncForms();growth.select(effectiveLaws(),mutated);vfx.evolution(player.position,FORMS[o.id].requires[0]);audio.play('fusion');onDone();$('#toast').textContent=`${FORMS[o.id].name} Lv.${heldForms.get(o.id)} · 진화가 각성했습니다`;});
 $('#keep-awaken').onclick=onDone;return true;
}
function offerSolo(onDone=afterSolo,force=false){
 const candidates=soloReady(levels).filter(canTakeEvolution).filter(f=>force||!promptedSolo.has(f.id+':'+levels.get(f.requires[0])));
 if(!candidates.length)return false;
 mode='forms';touch.reset();keys.clear();keyboardDash=false;$('#overlay').hidden=false;$('#overlay').classList.remove('intro');
 candidates.forEach(f=>promptedSolo.add(f.id+':'+levels.get(f.requires[0])));
 $('#overlay').innerHTML=`<p>한 법칙이 혼자 자랐습니다</p><h2>단독 진화</h2><p>법칙이 칸에서 사라지고 그 자리에 단독 진화가 들어갑니다(칸 수는 그대로). 법칙 레벨 - 1이 진화 레벨이 됩니다.</p><div class="form-cards">${candidates.map(f=>soloCard(f,levels.get(f.requires[0]),heldForms.get(f.id)||0,profile.forms.includes(f.id))).join('')}</div><p class="form-note">단독 진화도 이후 선택지에서 강화할 수 있고, 궁극기(F)의 시그니처를 가집니다.<br>합치지 않고 법칙을 계속 키우면 다음 레벨에서 다시 물어봐요.</p><button id="keep-solo" class="primary">지금은 진화하지 않기</button>`;
 document.querySelectorAll('[data-solo]').forEach(b=>b.onclick=()=>{if(mode!=='forms')return;const id=b.dataset.solo,law=SOLO_FORMS[id].requires[0];if(!bankAndEvolveSolo(id))return;remember('forms',id);syncLaws();syncForms();growth.select(effectiveLaws(),mutated);vfx.evolution(player.position,law);audio.play('evolve');onDone();$('#toast').textContent=`${FORMS[id].name} Lv.${heldForms.get(id)} · ${LAWS[law].name} 법칙이 혼자 진화했습니다`;});
 $('#keep-solo').onclick=onDone;return true;
}
function finishChoice(){survivalPendingChoice=null;runBonusOffer=null;mode='playing';$('#overlay').hidden=true;invuln=Math.max(invuln,.7);shootCD=0;if(roomCleared){if(mirrorSession)advanceMirrorFloor();else openExit();}if(survivalSession)saveSurvival();}
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
 const promptKey=f=>`${f.id}:${fusionLevel(levels,f.id)}`;
 // If the player postpones a fusion, offer it again after either ingredient grows.
 // Previously only the form id was remembered, so Mirror Guard could look permanently locked
 // after orbit or reflect was upgraded later in the run.
 const candidates=eligibleForms(chosen).filter(canTakeEvolution).filter(f=>force||!promptedForms.has(promptKey(f)));
 if(!candidates.length)return false;
 mode='forms';touch.reset();keys.clear();keyboardDash=false;$('#overlay').hidden=false;$('#overlay').classList.remove('intro');
 candidates.forEach(f=>promptedForms.add(promptKey(f)));
 $('#overlay').innerHTML=`<p>두 법칙을 하나로 합치기</p><h2>1차 융합</h2><p>재료 두 법칙이 사라지고 진화가 한 칸을 차지합니다. 기본 탄환은 남은 법칙으로 계속 나갑니다.</p><div class="form-cards">${candidates.map(f=>formCard(f,[...chosen],profile.forms.includes(f.id),true,(heldForms.get(f.id)||0)+fusionLevel(levels,f.id),heldForms.get(f.id)||0)).join('')}</div><p class="form-note">재료 법칙이 쌓아 둔 ‘모든 탄 피해’ 강화는 합쳐도 절반이 남아요(예: +40% → +20%).<br>합칠 때 두 법칙의 레벨이 진화 레벨이 됩니다(레벨 합 - 1). 이미 가진 진화를 또 합치면 그 진화가 강해집니다.<br>진화는 이후 선택지에서 따로 강화할 수 있고, 빈 칸에는 새 법칙을 다시 받을 수 있어요.</p><button id="keep-form" class="primary">지금은 합치지 않기</button>`;
 document.querySelectorAll('[data-form]').forEach(b=>b.onclick=()=>{if(mode!=='forms')return;const id=b.dataset.form,kept=Math.round(consumedUpgrades(levels,FORMS[id]?.requires)*FUSION_BONUS_KEEP*10);if(!bankAndFuse(id))return;remember('forms',id);syncLaws();syncForms();growth.select(effectiveLaws(),mutated);vfx.evolution(player.position,FORMS[id].requires[0]);audio.play('fusion');if(!offerSecondFusion(onDone))onDone();$('#toast').textContent=`${FORMS[id].name} Lv.${heldForms.get(id)} · 두 법칙이 한 칸으로 합쳐졌습니다${kept?` · 모든 탄 피해 +${kept}% 유지`:''}`;});
 $('#keep-form').onclick=onDone;return true;
}
const twinMarks=new WeakMap(),twinInteractions=createTwinInteractionEngine();
function twinResonance(e,amount,meta,scale){
 const twin=TWIN_FORMS[meta.evolution];if(!twin)return;
 const last=twinMarks.get(e),now=elapsed;
 if(!last||last.id!==twin.id||last.kind===meta.kind||now-last.time>twin.synergy.window){twinMarks.set(e,{id:twin.id,kind:meta.kind,time:now});return;}
 twinMarks.delete(e);const bonus=amount*twin.synergy.bonus*scale;if(!(bonus>0))return;
 damageEnemy(e,bonus,false,false,meta);
 // The two solo attacks still earn one shared resonance hit, but the follow-up
 // is authored per pair instead of stacking both generic law effects.
 twinInteractions.apply({id:twin.id,target:e,enemies,player:player.position,now,bonus,
  damage:(other,extra)=>damageEnemy(other,extra,false,false,meta),fx:vfx,isBoss,collide});
}
function formHit(e,amount,meta){
 const consumed=FORMS[meta.kind].requires;
 if(expansionTerrain?.owns(e)){const family=[...consumed,...(meta.comboLaws||[]),meta.finalLaw];return damageExpansionCrystal(e,amount*damageScale(levels,bankedUpgrades)*relicFormScale(relics,consumed)*runPowerScale(runBonuses)*gardenPower(),family.includes('burst')?'burst':null);}
 // 관통이 들어간 공격은 방패병을 뚫고, 기본 탄과 똑같은 치명타 확률을 갖는다.
 const piercing=[...(meta.comboLaws||[]),...consumed].includes('pierce');
 if(!piercing&&(DIRECT_FORMS.has(meta.kind)||meta.generated)&&!meta.indirect&&blocksShield(e,meta.direction)){e.block=.18;vfx.pulse(e.g.position,'reflect',.65,.18);return false;}
 const supports=id=>chosen.has(id)&&!consumed.includes(id);
 const critChance=piercing?totalCritChance():0,critical=critChance>0&&rng()<critChance;
 const scale=damageScale(levels,bankedUpgrades)*relicFormScale(relics,consumed)*runPowerScale(runBonuses)*gardenPower()*(critical?LS.critDamage:1);damageEnemy(e,amount*scale,false,critical,meta);twinResonance(e,amount,meta,scale);
 const family=[...(meta.comboLaws||[]),...consumed];if(family.includes('frost'))combatAnalysis.utility('freeze');if(family.includes('gravity'))combatAnalysis.utility('pull');
 if(family.includes('gravity'))audio.play('gravityHit',{intensity:.7});else if(family.includes('burst'))audio.play('burstHit',{intensity:.7});else if(family.includes('pierce'))audio.play('pierceHit',{intensity:.65});else if(family.includes('frost'))audio.play('frostHit',{intensity:.65});else if(family.includes('chain'))audio.play('chain',{intensity:.55});else if(family.includes('reflect'))audio.play('reflect',{intensity:.5});
 const native=new Set(meta.comboLaws||[]),has=id=>native.has(id);
 if(has('frost'))e.slow=Math.max(e.slow||0,Math.max(1.4,LS.frostTime||0));
  if(has('chain'))for(const other of enemies.filter(o=>o!==e&&!o.dead&&o.g.position.distanceTo(e.g.position)<4).sort((a,b)=>a.g.position.distanceTo(e.g.position)-b.g.position.distanceTo(e.g.position)).slice(0,2)){line(e.g.position,other.g.position);damageEnemy(other,amount*.24*scale,false,false,meta);}
  if(has('burst')){vfx.explosion(e.g.position,'burst',1.15);for(const other of enemies)if(other!==e&&!other.dead&&other.g.position.distanceTo(e.g.position)<1.65)damageEnemy(other,amount*.22*scale,false,false,meta);}
 if(has('gravity')){if(wells.length>=6)wells.shift();wells.push({pos:e.g.position.clone(),life:.9,pulse:0});}
 if(has('orbit')&&!isBoss(e)&&e.type!=='turret'){e.g.position.addScaledVector(meta.direction,.3);collide(e.g.position,.4);}
 if(has('portal')){vfx.burst(e.g.position,'portal',7,.48);audio.play('portal');}
 if(supports('frost'))e.slow=Math.max(e.slow||0,LS.frostTime);
  if(supports('chain'))for(const other of enemies.filter(o=>o!==e&&!o.dead&&o.g.position.distanceTo(e.g.position)<4).sort((a,b)=>a.g.position.distanceTo(e.g.position)-b.g.position.distanceTo(e.g.position)).slice(0,LS.chainTargets)){line(e.g.position,other.g.position);damageEnemy(other,amount*.18,false,false,meta);}
  if(supports('burst')){vfx.explosion(e.g.position,'burst',Math.max(.8,LS.burstRadius*.45));for(const other of enemies)if(other!==e&&!other.dead&&other.g.position.distanceTo(e.g.position)<LS.burstRadius)damageEnemy(other,amount*.18,false,false,meta);}
 if(supports('gravity')){if(wells.length>=6)wells.shift();wells.push({pos:e.g.position.clone(),life:1.2,pulse:0});}
 return true;
}
function formOptions(){return {player,camera,comboTexture:projectileSprites.comboTexture,enemies:expansionCombatTargets,nearby:expansionNearby,hit:formHit,blocked:(a,b)=>segmentHitsCover(a,b,obstacles,.1),reflector:(a,b,d)=>reflectExpansionCrystals(a,b,d)||(mirrorPanelsActive&&reflectMirrorPanels(a,b,d)),boundary:(a,b,d)=>reflectArenaBoundary(a,b,d,arena),traceTerrain:expansionTerrain?traceExpansionFormShot:null,constrain:collide,vfx,sound:id=>audio.play(id),enemyShots:()=>enemyShots,theme:combatTheme};}
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
 if(survivalSession)return true;
 if(expansionJourney)return saveExpansionLeave();
 if(developerRun)return true;
 if(currentJourneyOwner!==(account.user()?.uid||'guest')){saveOK=false;return false;}
 saveOK=writeCheckpoint(actStore(),{version:1,runId:currentJourneyRunId,bossReceiptOwner:currentJourneyOwner,pendingBossTitles:pendingJourneyBossTitles.map(e=>({...e})),cycle,region,stage:nextStage,mode:saveMode,hp,rules:[...chosen],mutated:[...mutated],levels:levelsToSave(levels),banked:bankedUpgrades,choicesTaken,choiceKills,kills,elapsed,playDashes:runDashes,playDamage:Math.round(runDamageTaken),forms:Object.fromEntries(heldForms),guideTarget,rerollUsed,score,wardens:wardensDefeated,austins:austinsDefeated,inventory:{...inventory},runBonuses:{...runBonuses},turretPotionDry,relics:normalizeRelics(relics),dashEvolution:dashState.id,activeGauge:Math.floor(activeGauge.value),activeCooldown:Number((activeGauge.plan?ACTIVE.cooldownSeconds:activeGauge.cooldown).toFixed(2)),...over});
 return saveOK;
}
// After a warden the journey simply continues: a little health back, and every enemy a little faster.
function nextJourney(){austinRoom=false;cycle++;rerollUsed=false;stage=0;const before=hp;hp=Math.min(maxPlayerHp(),hp+JOURNEY_HEAL);wave();$('#toast').textContent=`여정 ${cycle+1} · 생명력 +${displayHp(hp-before)} · 적과 탄막이 조금 더 거세집니다`;}
function enterAustin(){austinRoom=true;bossFightDamage0=runDamageTaken;wave(isAct3(region));$('#toast').textContent=isAct3(region)?`${TEMPEST_CARRIER.name} 등장 · 발사구 섬광과 날개 움직임으로 탄막의 틈을 찾으세요`:isAct2(region)?`${ALWAYS_BEGINNER.name} 등장 · 투구선·베이스·부채꼴을 읽고 끝까지 버티세요`:`${AUSTIN.name} 등장 · 바닥 시계의 침이 다음 종소리의 빈틈을 가리킵니다`;}
function saveAfterBoss(){if(finalBossAhead())return saveBoundary(4,'austin');return saveBoundary(0,'entry',{cycle:cycle+1,hp:Math.min(maxPlayerHp(),hp+JOURNEY_HEAL),rerollUsed:false});}
document.body.insertAdjacentHTML('beforeend','<button id="save-exit" hidden>저장된 방 입구부터 나중에 이어하기</button>');
document.body.insertAdjacentHTML('beforeend','<button id="developer-lab-fab" hidden>실험실</button>');
$('#developer-lab-fab').onclick=showDeveloperLab;
// Relic numbers are measured against the build without the relic, so the screen shows before → after.
const relicFx=id=>relicEffect(id,lawStats(levels),heldForms);
const pauseBuild=createPauseBuild($('#save-exit'),()=>togglePause(),{get:()=>relics,effect:relicFx,canSwap:()=>roomCleared&&exitOpen,swap:id=>{if(!roomCleared||!exitOpen||!equipRelic(relics,id))return;dashRelicReady=false;syncLaws();if(stage===4)saveAfterBoss();else saveBoundary(stage+1);}},{get:()=>inventory},{get:()=>activeGauge},{state:()=>seedTitle.state()},{get:()=>dashState},{summary:()=>runBonusSummary(runBonuses),cadenceScale:()=>runCadenceScale(runBonuses)});
// The room itself always restarts from its entrance. Keep only attrition from
// the unfinished attempt; saving its rewards as well would respawn the same
// enemies while preserving their kills, score, choice gauge and drops.
function saveLeaveState(){
 if(expansionJourney)return saveExpansionLeave();
 if(mode==='defense'||mode==='adventure')return false;
 if(survivalSession)return saveSurvival();
 if(developerRun)return false;
 if(!['playing','evolving','cards','forms','relics','dash','solo','awaken'].includes(mode)||roomCleared)return false;
 if(currentJourneyOwner!==(account.user()?.uid||'guest'))return false;
 const entry=readCheckpoint(actStore()),safe=roomExitCheckpoint(entry,{hp,inventory});
 return safe?writeCheckpoint(actStore(),{...safe,runId:currentJourneyRunId,bossReceiptOwner:currentJourneyOwner,pendingBossTitles:pendingJourneyBossTitles.map(e=>({...e}))}):false;
}
// 일시정지 → 나가기. 2026-09-22 사용자: "저장이 안 되는데, 중간에 못 끄네" — 거울의 탑은 버튼이 숨겨져 있었고,
// 개발자 실험실·연습장은 저장 기록이 없어 눌러도 안내만 뜨고 나가지지 않았다. 이제 어떤 판이든 나갈 수 있다.
// 저장하는 판: 방 입구 저장으로 나간다. 저장하지 않는 판(거울의 탑·실험실·연습장): 저장 없이 바로 나간다.
// 저장하는 판인데 기록이 없으면(저장 공간 문제) 한 번 알려 주고, 한 번 더 누르면 저장하지 않고 나간다.
let exitWithoutSaveArmed=false,saveExitBusy=false,cloudSaveFailed=false;
function saveExitLabel(){if(expansionJourney?.inspectionPreview)return '보스 시연 끝내기 · 기록 제외';if(expansionPendingBossCheckpoint)return '보스 격파 저장 다시 확인';return expansionJourney?(expansionChannel==='public'?'저장하고 나가기 · 계정 동기화 확인':'로컬 저장하고 나가기 · 방 입구부터 이어하기'):survivalSession?(survivalSession.lab?'연습 끝내기 · 기록 제외':'생존전 저장하고 나가기'):mirrorSession?'거울의 탑에서 나가기 · 10층 돌파마다 이어할 수 있어요':developerRun?'실험 끝내고 나가기 · 저장되지 않아요':exitWithoutSaveArmed?'저장하지 않고 나가기':'저장된 방 입구부터 나중에 이어하기';}
function leavePausedRun(){exitWithoutSaveArmed=false;touch.reset();keys.clear();paused=false;$('#save-exit').hidden=true;pauseBuild.hide();showIntro();}
$('#save-exit').onclick=async()=>{
 if(saveExitBusy)return;
 if(expansionJourney?.inspectionPreview){leavePausedRun();return;}
 if(expansionJourney){if(!saveExpansionLeave()){pauseBuild.setSaveStatus('저장을 확인하지 못했어요. 계정이 바뀌었거나 다른 탭의 기록이 더 최신일 수 있어요.');return;}if(expansionChannel==='public'){saveExitBusy=true;$('#save-exit').disabled=true;try{const result=await syncPublicExpansion();if(result.kind!=='synced'){pauseBuild.setSaveStatus('기기에 저장했지만 계정 동기화가 완료되지 않았어요. 다시 확인하거나 이 기기에서 이어하세요.');return;}}finally{saveExitBusy=false;$('#save-exit').disabled=false;}}leavePausedRun();return;}
 if(survivalSession){
  if(survivalSession.lab){finishSurvival(false,true);return;}
  if(!saveSurvival()){pauseBuild.setSaveStatus(survivalSaveMessage);return;}
  saveExitBusy=true;$('#save-exit').disabled=true;pauseBuild.setSaveStatus('기기에 저장했어요. 계정 저장을 확인하는 중…');
  try{await survivalCloud.flush();}finally{saveExitBusy=false;$('#save-exit').disabled=false;}
  leavePausedRun();showSurvivalSetup();return;
 }
 if(developerRun||mirrorSession){leavePausedRun();return;}
 if(!readCheckpoint(actStore())&&!exitWithoutSaveArmed){exitWithoutSaveArmed=true;pauseBuild.setSaveStatus('저장 기록이 없어요. 다시 누르면 저장하지 않고 나갑니다.');$('#save-exit').textContent=saveExitLabel();return;}
 if(exitWithoutSaveArmed){leavePausedRun();return;}
 if(!saveLeaveState()&&!roomCleared){exitWithoutSaveArmed=true;pauseBuild.setSaveStatus('이 방의 기록을 저장하지 못했어요. 다시 누르면 이전 기록만 남기고 나갑니다.');$('#save-exit').textContent=saveExitLabel();return;}
 saveExitBusy=true;pauseBuild.setSaveStatus('기기에 저장했어요. 다른 기기에서도 이어할 수 있도록 계정 저장을 확인하는 중…');$('#save-exit').disabled=true;$('#save-exit').textContent='계정에 저장하는 중…';
 let timeout;try{const result=await Promise.race([cloud.flush(),new Promise(resolve=>{timeout=setTimeout(()=>resolve({ok:false,reason:'timeout'}),10_000);})]);cloudSaveFailed=Boolean(account.user()&&!account.user().isAnonymous&&(!result.ok||cloud.isDirty()));}
 catch{cloudSaveFailed=Boolean(account.user()&&!account.user().isAnonymous);}
 finally{clearTimeout(timeout);saveExitBusy=false;$('#save-exit').disabled=false;}
 leavePausedRun();
};
// Separate challenge: shares the real combat engine, never a journey checkpoint.
let survivalSaveToken=null,survivalSaveMessage='',survivalPendingChoice=null,survivalAutosaveAt=0,survivalTitleRetryAt=0,survivalPendingEnd=null;
const survivalOwner=()=>account.user()?.uid||'guest';
const survivalStore=()=>createSurvivalSaveStore(rawStorage,survivalOwner());
const survivalCloud=createSurvivalSync({storage:rawStorage,account,databaseURL:FIREBASE_APP.databaseURL,isActive:()=>Boolean(survivalSession&&!survivalSession.finished&&mode!=='ready'),onState:state=>{const el=$('#survival-cloud-status');if(el)el.textContent=survivalSyncLabel(state);}});
const survivalBestCloud=createSurvivalRecordSync({storage:rawStorage,account,databaseURL:FIREBASE_APP.databaseURL});
const survivalPersonalRecord=()=>readSurvivalAccountRecord(rawStorage,survivalOwner());
function survivalClearRecordLabel(record,five=false){
 const wins=five?record.fiveWins||0:record.wins,fastest=five?record.fastestFiveClear:record.fastestClear;
 return (five?'다섯':'세')+' 막 완주 '+wins+'회'+(fastest?' · 최단 '+(five?'다섯':'세')+' 막 완주 '+survivalClock(fastest):'');
}
function survivalLocalClearHistory(record){return '이 기기 '+survivalClearRecordLabel(record)+(Object.hasOwn(record,'fiveWins')?' · 이 기기 '+survivalClearRecordLabel(record,true):'');}

const packSurvivalActor=e=>({fields:captureCombatFields(e),position:e.g.position.toArray(),rotation:e.g.rotation.y});
function settleSurvivalTitle(){
 if(!survivalSession)return true;
 // A switched UID is not a practice run: retain the original owner's events.
 if(!survivalSaveToken||survivalSaveToken.owner!==survivalOwner())return false;
 const practice=Boolean(localInspection||survivalSession.lab||survivalSession.benchmark||developerRun);
 if(practice)return true;
 return settleSurvivalTitles(survivalSession,e=>awardModeBoss('survival',survivalSaveToken.id,e.boss,e.ordinal,practice));
}
function persistSurvivalEnd(){
 if(!survivalPendingEnd)return true;
 const end=survivalPendingEnd,store=createSurvivalSaveStore(rawStorage,end.owner),record=store.readRecord();
 if(record?.ended&&record.id===end.id){
  if(JSON.stringify(survivalTitleEvents(record))!==JSON.stringify(survivalTitleEvents(end.session))){survivalSaveMessage='다른 화면의 종료 기록이 있어요. 미지급 보상을 덮어쓰지 않았습니다.';return false;}
  survivalPendingEnd=null;return true;
 }
 if(!store.end(end.id,end.revision,end.writeId,end.session)){survivalSaveMessage='종료 기록과 보스 보상을 저장하지 못했어요. 원래 계정에서 저장 공간을 확인하고 다시 시도해 주세요.';return false;}
 survivalPendingEnd=null;if(end.owner===survivalOwner())survivalCloud.changed();return true;
}
function retryStoredSurvivalTitles(){
 // Inspection may have pulled an authentic account checkpoint. Do not
 // acknowledge its earned events as practice merely by opening this menu.
 if(localInspection)return true;
 if(!persistSurvivalEnd())return false;
 const owner=survivalOwner(),store=survivalStore(),resultRunId=store.readRecord()?.id,result=store.retryTitles(e=>{
  if(owner!==survivalOwner())return false;
  return awardModeBoss('survival',resultRunId,e.boss,e.ordinal,localInspection);
 });
 return result.ok;
}
function saveSurvival(){
 if(!survivalSession||survivalSession.lab||survivalSession.finished||hp<=0||!survivalSaveToken)return false;
 if(survivalSaveToken.owner!==survivalOwner()){survivalSaveMessage='로그인 계정이 바뀌었어요. 원래 계정으로 돌아온 뒤 저장해 주세요.';return false;}
 settleSurvivalTitle();
 const snapshot={...survivalSaveToken,session:captureSurvivalSession(survivalSession),analysis:combatAnalysis.snapshot(),...(survivalSession.actCount===5?{expansion:survivalExpansion?.checkpoint()||null}:{}),
  progress:{hp,kills,score,choicesTaken,choiceKills,bankedUpgrades,elapsed,runDashes,runDamageTaken,levels:Object.fromEntries(levels),forms:Object.fromEntries(heldForms),inventory:{...inventory},mutations:mutationsToSave(mutations),runBonuses:{...runBonuses},rerollUsed,hasteTime,shellTime,potionCD,selectedItem,dashState:{...dashState},dashLock,activeValue:activeGauge.value,activeCooldown:activeGauge.plan?ACTIVE.cooldownSeconds:activeGauge.cooldown,shootCD,playerSlow,invuln},
  player:{position:player.position.toArray(),baseSlideTime,baseSlideCooldown,baseSlideLock,baseSlideTarget:baseSlideTarget.toArray(),baseSlideDir:baseSlideDir.toArray(),lastMove:lastMove.toArray()},
  pending:survivalPendingChoice?{offered:[...survivalPendingChoice],bonus:runBonusOffer||[]}:null,evolution:!survivalPendingChoice&&['evolving','forms','awaken','solo'].includes(mode),
  enemies:enemies.filter(e=>!e.dead&&e.hp>0).map(packSurvivalActor),hostiles:enemyShots.filter(p=>p.life>0).map(p=>({fields:captureCombatFields(p),position:p.ob.position.toArray()}))};
 const result=survivalStore().write(snapshot,{fresh:survivalSaveToken.revision===0});
 if(result.ok){survivalSaveToken.revision=result.value.revision;survivalSaveToken.writeId=result.value.writeId;survivalAutosaveAt=survivalSession.time+15;survivalSaveMessage='이 기기에 저장했어요.';survivalCloud.changed();return true;}
 survivalSaveMessage=result.reason==='conflict'?'다른 탭에서 저장이 바뀌었어요. 이 화면은 덮어쓰지 않았습니다.':'저장하지 못했어요. 저장 공간을 확인하고 다시 눌러 주세요.';
 $('#toast').textContent=survivalSaveMessage;return false;
}
function resumeSurvival(){
 const saved=survivalStore().read();if(!saved){showSurvivalSetup();return;}
 // Validate IDs before touching the live run; unknown/future saves are retained.
 if([...Object.keys(saved.progress.levels)].some(id=>!LAWS[id])||Object.keys(saved.progress.forms).some(id=>!FORMS[id])||(saved.pending?.offered||[]).some(id=>!LAWS[id]&&!FORMS[offeredForm(id)]&&!FORMS[offeredFusion(id)]&&!parseMutationChoice(id))||(saved.pending?.bonus||[]).some(id=>!RUN_BONUSES[id])){survivalSaveMessage='이 저장은 다른 버전에서 만들어졌어요. 최신 버전으로 확인해 주세요.';showSurvivalSetup();return;}
 startSurvival(null,saved);
}
function restoreSurvivalWorld(saved){
 const p=saved.progress,vector=(x,y,z)=>new V(x,y,z);
 for(const e of enemies)releaseEnemy(e);enemies=[];
 survivalSession={...saved.session};survivalExpansion=survivalSession.actCount===5&&survivalSession.act>=3?createSurvivalExpansion(survivalSession,saved.expansion):null;if(survivalExpansion)survivalExpansion.lap=survivalSession.lap;survivalPendingChoice=saved.pending?.offered||null;
 hp=p.hp;kills=p.kills;score=p.score;choicesTaken=p.choicesTaken;choiceKills=p.choiceKills;bankedUpgrades=p.bankedUpgrades;elapsed=p.elapsed;runDashes=p.runDashes||0;runDamageTaken=p.runDamageTaken||0;
 levels.clear();for(const [id,lv] of Object.entries(p.levels))levels.set(id,lv);heldForms.clear();for(const [id,lv] of Object.entries(p.forms))heldForms.set(id,lv);
 inventory=normalizeInventory(p.inventory);runBonuses=normalizeRunBonuses(p.runBonuses);rerollUsed=p.rerollUsed===true;mutations.clear();for(const [law,kind] of mutationsFromSave(p.mutations))mutations.set(law,kind);
 syncLaws();syncForms(true);growth.select(effectiveLaws(),mutated);drawRoom();
 for(const entry of saved.enemies){const e=entry.fields.survivalBoss?spawnSurvivalBoss():spawnSurvivalEnemy({x:entry.position[0],z:entry.position[2],kind:entry.fields.survivalKind});if(!e)continue;restoreCombatFields(e,entry.fields,vector);e.g.position.fromArray(entry.position);e.g.rotation.y=entry.rotation||0;}
 // Construction must not consume the saved spawn RNG or change the boss flag.
 Object.assign(survivalSession,saved.session);
 for(const entry of saved.hostiles){const q=restoreCombatFields({ob:new THREE.Object3D()},entry.fields,vector);q.ob.position.fromArray(entry.position);enemyShots.push(q);}
 player.position.fromArray(saved.player.position);playerMotion.reset();baseSlideTime=saved.player.baseSlideTime||0;baseSlideCooldown=saved.player.baseSlideCooldown||0;baseSlideLock=saved.player.baseSlideLock??-1;baseSlideTarget.fromArray(saved.player.baseSlideTarget);baseSlideDir.fromArray(saved.player.baseSlideDir);lastMove.fromArray(saved.player.lastMove);
 hasteTime=p.hasteTime||0;shellTime=p.shellTime||0;potionCD=p.potionCD||0;selectedItem=p.selectedItem;dashState={...createDashState(p.dashState?.id),...p.dashState};dashLock=p.dashLock||0;activeGauge=createActiveGauge(p.activeValue||0,p.activeCooldown||0);shootCD=p.shootCD||0;playerSlow=p.playerSlow||0;invuln=p.invuln||0;itemBarKey='';
 combatAnalysis.restore(saved.analysis);survivalAutosaveAt=survivalSession.time+15;survivalSaveToken={id:saved.id,revision:saved.revision,writeId:saved.writeId,owner:survivalOwner()};
 mode='playing';paused=false;$('#overlay').hidden=true;audio.setScene(musicSceneFor(survivalAct(survivalSession).music,{boss:survivalSession.bossSpawned}));
 if(saved.pending){runBonusOffer=saved.pending.bonus;cardChoice(true,saved.pending.offered);}
 else if(saved.evolution)finishEvolutionChoices();
 if(mode==='playing')togglePause();
 $('#toast').textContent='저장한 생존전을 불러왔어요 · 준비되면 계속하기';
}
// Choice/evolution transactions complete synchronously, then commit as one save.
// A paid gauge must never be saved alongside the pre-choice build (or vice versa).
document.addEventListener('click',event=>{
 if(!survivalSession||survivalSession.lab)return;
 const button=event.target.closest?.('button');if(!button)return;
 if(button.matches('[data-choice],[data-run-bonus],[data-form],[data-solo],[data-awaken],[data-second],#keep-form,#keep-solo,#keep-awaken,#keep-second,#reroll-laws'))queueMicrotask(()=>saveSurvival());
});
function choiceGoal(){return survivalSession?survivalChoiceKills(choicesTaken):killsForChoice(choicesTaken);}
function survivalClock(seconds){const n=Math.max(0,Math.floor(seconds));return `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;}
function survivalRecordSummary(record){return !record?'저장 없음':record.ended?'이 도전은 종료됐어요':`${record.session.lap+1}순환 ${record.session.act+1}막 · ${survivalClock(record.session.time)} · ${record.progress.kills}처치`;}
async function refreshSurvivalAccount(choice=null,expected=null){
 const panel=$('#survival-cloud-status');if(!panel||mode!=='ready')return;
 for(const id of ['start-survival','resume-survival','survival-cloud-retry','survival-use-local','survival-use-cloud'])if($('#'+id))$('#'+id).disabled=true;
 const result=await survivalCloud.sync({allowPull:true,choice,expected});
 if(mode!=='ready'||$('#survival-cloud-status')!==panel)return;
 if(result.pulled){showSurvivalSetup(false);return;}
 panel.textContent=survivalSyncLabel(result);
 for(const id of ['start-survival','resume-survival','survival-cloud-retry'])if($('#'+id))$('#'+id).disabled=result.kind==='conflict'&&id!=='survival-cloud-retry';
 const conflict=$('#survival-cloud-conflict');conflict.replaceChildren();
 if(result.kind==='conflict'){
  const description=document.createElement('p');description.className='survival-note';description.textContent=`이 기기: ${survivalRecordSummary(result.local)} / 계정: ${survivalRecordSummary(result.remote)}. 한 기록만 이어집니다. 바뀌는 기록은 이 기기에 복사본을 남겨요.`;conflict.append(description);
  for(const [id,label,value] of [['survival-use-cloud','계정 기록 사용','remote'],['survival-use-local','이 기기 기록 사용','local']]){
   const button=document.createElement('button');button.id=id;button.textContent=label;button.onclick=()=>refreshSurvivalAccount(value,result.expected);conflict.append(button);
  }
 }
}
const modeRankingAuth=async()=>{
 if(localInspection||!account.user()||account.user().isAnonymous)throw new Error('registered-account-required');
 return account.tokenSession();
};
const survivalRanking=createSurvivalRanking({storage:rawStorage,authProvider:modeRankingAuth});
const defenseRanking=createDefenseRanking({storage:rawStorage,authProvider:modeRankingAuth});
const adventureRanking=createAdventureRanking({storage:rawStorage,authProvider:modeRankingAuth});
const duelRanking=createDuelRanking({storage:rawStorage,authProvider:modeRankingAuth});
const puzzleRanking=createPuzzleRanking({storage:rawStorage,authProvider:modeRankingAuth});
const retryModeRankings=createRankingRetry({services:[survivalRanking,defenseRanking,adventureRanking,duelRanking,puzzleRanking],context:()=>({uid:account.user()?.uid,linked:Boolean(account.user()&&!account.user().isAnonymous),testing:localInspection,hidden:document.hidden,offline:navigator.onLine===false})});
window.addEventListener('online',()=>void retryModeRankings({force:true}));
let survivalRankView=0;
function showSurvivalRanking(back=showSurvivalSetup){showModeRanking('survival',back);}
function showDefenseRanking(back=showDungeon){showModeRanking('defense',back);}
async function submitExtraModeRanking(kind,entry,testRun){
 if(testRun)return '연습 기록은 온라인 랭킹에 등록하지 않아요.';
 if(!entry)return '이번 기록은 랭킹 기준을 충족하지 않았어요.';
 const service={adventure:adventureRanking,duel:duelRanking,puzzle:puzzleRanking}[kind];
 const owner=account.user()?.uid;
 const decision=rankingDecision({isTestRun:false,localInspection,score:entry.score||0,name:playerName,native:account.native,admin:adminMode,tester:betaTesterMode,user:account.user()});
 if(!service||owner!==entry.uid||!decision.eligible)return '온라인 기록은 같은 계정으로 로그인한 정상 플레이만 등록해요.';
 try{await service.submit(entry);return '계정 최고기록 확인 완료 · 이 모드의 랭킹에 기록했어요.';}
 catch(error){console.warn(`${kind} ranking submit failed`,error);return '온라인 등록 대기 · 인터넷 연결이 복구되거나 메인·랭킹을 열면 다시 전송해요.';}
}
async function showModeRanking(kind,back){
 const view=++survivalRankView;
 mode='ranking';touch.reset();keys.clear();
 $('#overlay').classList.remove('ranking-overlay','garden-mode','developer-mode');$('#overlay').classList.add('intro','menu-screen','survival-overlay');$('#overlay').hidden=false;
 $('#overlay').innerHTML='<div class="menu-panel survival-panel"><h2>명예의 전당</h2><p role="status">기록 화면을 준비하는 중…</p><button id="mode-ranking-loading-back">돌아가기</button></div>';
 $('#mode-ranking-loading-back').onclick=()=>{survivalRankView++;back();};
 let labels;
 try{labels=await import('./mode-ranking-labels.js');}
 catch{if(view===survivalRankView)$('#overlay p[role="status"]').textContent='기록 화면을 불러오지 못했어요. 돌아간 뒤 다시 열어 주세요.';return;}
 if(view!==survivalRankView)return;
 const {duelCharacterName,adventureBuildLabels}=labels;
 const configs={
  survival:{service:survivalRanking,label:'물량생존전',heading:'밀려오는 숲',note:'계정별 최고 점수',sample:{uid:'preview',rank:1,name:'화면 시연 · 실제 기록 아님',score:15000,bosses:1,kills:600,time:330,laws:'chain:3,orbit:2',forms:'prism:2,frostnet:1'},row:e=>`<p>${e.bosses}보스 · ${e.kills.toLocaleString()}처치 · ${survivalClock(e.time)}</p>${rankBuild({build:{laws:e.laws,forms:e.forms,relic:'',wardens:0,austins:0}},0,false)}`},
  defense:{service:defenseRanking,label:'씨앗 수호전',heading:'씨앗 수호전',note:'막아낸 습격 → 남은 체력 → 처치 수',sample:{uid:'preview',rank:1,name:'화면 시연 · 실제 기록 아님',cleared:12,hp:18,kills:340,time:300,towers:'prism:5,frostnet:4,chain:3,seed:1'},row:e=>`<p>정원 체력 ${e.hp}/20 · ${e.kills.toLocaleString()}처치 · ${survivalClock(e.time)}</p>${defenseRankBuild(e)}`},
  adventure:{service:adventureRanking,label:'씨앗의 모험',heading:'씨앗의 모험',note:'도달 방 · 보스 · 처치 수',sample:{uid:'preview',rank:1,name:'화면 시연 · 실제 기록 아님',room:8,bosses:2,kills:420,level:14,time:520,weapon:'throw',laws:'recall,chain',form:'returnblade',score:8200000},row:e=>`<p>${e.room}번째 방 · 보스 ${e.bosses}회 · ${e.kills.toLocaleString()}처치 · Lv.${e.level} · ${survivalClock(e.time)}</p><small>공격 ${escapeHtml(adventureBuildLabels(e).weapon)} · ${escapeHtml(adventureBuildLabels(e).laws)} · ${escapeHtml(adventureBuildLabels(e).form)}</small>`},
  duel:{service:duelRanking,label:'씨앗 대전',heading:'씨앗 대전',note:'스토리 진행 · 승리 · 난이도',sample:{uid:'preview',rank:1,name:'화면 시연 · 실제 기록 아님',storyStage:6,wins:2,losses:0,difficulty:3,time:180,character:'thorn',opponent:'heart',score:620000},row:e=>`<p>스토리 ${e.storyStage}단계 · ${e.wins}승 ${e.losses}패 · ${['','쉬움','보통','어려움'][e.difficulty]||'보통'} · ${survivalClock(e.time)}</p><small>${escapeHtml(duelCharacterName(e.character))} vs ${escapeHtml(duelCharacterName(e.opponent))}</small>`},
  puzzle:{service:puzzleRanking,label:'씨앗 맞추기',heading:'씨앗 맞추기',note:'전체 별 · 최고 연승 · 최근 단계',sample:{uid:'preview',rank:1,name:'화면 시연 · 실제 기록 아님',totalStars:42,bestStreak:8,latestStage:18,latestStars:3,latestScore:32000,score:4292000},row:e=>`<p>별 ${e.totalStars}개 · 최고 ${e.bestStreak}연승 · 최근 ${e.latestStage}단계 ★${e.latestStars}</p><small>최근 점수 ${Number(e.latestScore||0).toLocaleString()}점</small>`}
 };
 const config=configs[kind]||configs.survival,service=config.service,label=config.label;
 mode='ranking';touch.reset();keys.clear();
 $('#overlay').classList.remove('ranking-overlay','garden-mode','developer-mode');$('#overlay').classList.add('intro','menu-screen','survival-overlay');$('#overlay').hidden=false;
 $('#overlay').innerHTML=`<div class="menu-panel survival-panel survival-ranking-panel"><header><p class="eyebrow">SEED · ${label}</p><h2>${config.heading} · 명예의 전당</h2><p class="survival-note">${config.note} · 동점은 공동 순위</p></header><div class="survival-rank-scroll"><p id="survival-ranking-status" role="status">기록을 확인하는 중…</p><div id="survival-ranking-list"></div></div><footer class="survival-actions"><button id="survival-ranking-login" hidden>Google 로그인</button><button id="survival-ranking-refresh">새로고침</button><button id="survival-ranking-back">돌아가기</button></footer></div>`;
 $('#survival-ranking-back').onclick=()=>{survivalRankView++;back();};$('#survival-ranking-refresh').onclick=()=>showModeRanking(kind,back);
 $('#survival-ranking-login').onclick=()=>{survivalRankView++;showAccount();};
 const row=e=>`<li><div class="survival-rank-heading"><b>${e.rank?e.rank+'위':'순위 집계 범위 밖'} · ${escapeHtml(e.name)}</b><strong>${kind==='defense'?e.cleared+'단계 방어':kind==='puzzle'?`${Number(e.totalStars||0).toLocaleString()}별`:formatScore(e.score)+'점'}</strong></div>${config.row(e)}${localInspection||e.uid===account.user()?.uid?'':rankSafety(e)}</li>`;
 if(localInspection){const sample=config.sample;$('#survival-ranking-status').textContent='로컬 배치 시연 · 실제 온라인 기록은 조회하거나 등록하지 않아요.';$('#survival-ranking-list').innerHTML='<h3>기록 시연</h3><ol>'+row(sample)+'</ol><h3>내 최고기록</h3><p class="survival-note">공개 버전에서는 TOP 10과 내 기록을 따로 표시해요.</p>';return;}

 if(!localInspection&&(!account.user()||account.user().isAnonymous)){
  $('#survival-ranking-status').textContent='Google 계정으로 로그인하면 온라인 랭킹과 내 최고기록을 볼 수 있어요.';
  $('#survival-ranking-login').hidden=false;$('#survival-ranking-refresh').hidden=true;return;
 }

 service.flush().catch(()=>{}).then(()=>service.board()).then(({top,mine})=>{
  if(view!==survivalRankView||!$('#survival-ranking-list'))return;
  $('#survival-ranking-status').textContent='상위 10명 · 내 최고기록은 아래에서 따로 확인하세요.';
  $('#survival-ranking-list').innerHTML=`<h3>TOP 10</h3><ol>${visibleRanking(top,runStorage).map(row).join('')||'<li>아직 등록된 기록이 없어요. 첫 기록에 도전해 보세요!</li>'}</ol><h3>내 최고기록</h3><ol>${mine?row(mine):'<li>이 계정으로 등록된 기록이 아직 없어요.</li>'}</ol>`;bindRankSafety();
 }).catch(()=>{if(view===survivalRankView&&$('#survival-ranking-status'))$('#survival-ranking-status').textContent=account.user()&&!account.user().isAnonymous?'랭킹을 불러오지 못했어요. 잠시 후 새로고침해 주세요.':'Google 계정으로 로그인하면 온라인 기록을 볼 수 있어요.';});
}
function showSurvivalSetup(refresh=true){
 $('#overlay').classList.add('survival-overlay');
 mode='ready';paused=false;touch.reset();keys.clear();retryStoredSurvivalTitles();const record=survivalPersonalRecord(),saved=survivalStore().read();
 $('#overlay').classList.remove('ranking-overlay','garden-mode','developer-mode');$('#overlay').classList.add('intro','menu-screen');$('#overlay').hidden=false;
 $('#overlay').innerHTML=`<div class="menu-panel survival-panel"><p class="eyebrow">SEED · 별도 도전</p><h2>밀려오는 숲</h2><p class="survival-lead">작은 씨앗 하나로, 끝없는 무리를 뚫으세요.</p><div class="survival-facts"><span><b>3분</b>각 막 생존 후 보스</span><span><b>자동 공격</b>이동과 회피에 집중</span><span><b>조합 성장</b>처치하면 법칙 선택</span></div><p>1막 오스틴 → 2막 항상초심 → 3막 요한. 조합을 유지하고 이어 싸워요. 2막은 베이스를 밟으면 다음 베이스까지 미끄러져요(무적 없음). 3막을 깨면 더 강한 다음 순환으로 넘어갑니다. 일반 몹은 몸으로 밀려오고 보스만 고유 공격을 사용해요. 한쪽 접근 → 양쪽 압박 → 사방 포위 뒤, 매분 마지막 6초는 작은 무리만 접근해요. 빠른 적이 몸을 낮추면 옆으로 피하세요.</p><p class="survival-note">회복 물약 2개로 출발 · 각 막 60·120초에 1개 보급(최대 5개) · 막 이동 시 체력 25 회복 + 물약 1개<br>별도 시험 모드예요. 여정 저장·조합 도감·창고는 별도예요. 보스 첫 격파·누적 10회·한 판 같은 보스 3회 완주 칭호는 여정과 함께 집계해요.<br>일시정지에서 저장하고 나가기 · 이 기기·브라우저에서 이어하기 가능<br>Google 계정 저장 완료 후 같은 계정으로 다른 기기에서 이어할 수 있어요.<br>기록을 합치지는 않아요 · 날아가던 내 탄과 순간 효과는 재개 시 정리됩니다.</p><p class="survival-record">최고 ${record.bestKills.toLocaleString()} 처치 · 최장 ${survivalClock(record.bestTime)} · ${survivalLocalClearHistory(record)} · 최고 ${record.bestBosses}보스</p><p class="survival-note" role="status">${saved?`저장된 도전 · ${saved.session.lap+1}순환 ${saved.session.act+1}막 · ${survivalClock(saved.session.time)} · ${saved.progress.kills}처치`:survivalSaveMessage}</p><p id="survival-cloud-status" class="survival-note" role="status"></p><button id="survival-cloud-retry" class="survival-sync-button">계정 저장 다시 확인</button><div id="survival-cloud-conflict"></div><div class="survival-actions">${saved?'<button id="resume-survival" class="primary">이어하기</button>':''}<button id="start-survival" class="primary">${saved?'새로 시작':'생존전 시작'}</button><button id="survival-back">돌아가기</button></div>${localInspection?'<details class="survival-lab"><summary>로컬 검증 · 기록 제외</summary><button id="survival-pierce">관통·연쇄 무리 시연</button><button id="survival-frost">빙결·연쇄 무리 시연</button><button id="survival-stress">후반 300마리 · 조합 부하</button><button id="survival-boss">최종 보스 전환</button><button id="survival-duel">1막 보스전 연습 · 피해 적용</button><button id="survival-stress2">2막 300마리 부하</button><button id="survival-stress3">3막 300마리 부하</button><button id="survival-base">2막 베이스 이동 검증 · 피해 적용</button><button id="survival-route">세 막 연결 검증 · 보스 체력 1</button><button id="survival-act2">2막 물량·항상초심 연습</button><button id="survival-act3">3막 물량·요한 연습</button><button id="survival-loop">3막 격파 → 다음 순환 검증</button><p>가속 자동 비교 · 처음부터 성장 · 실제 피해 · 지정 선택 · 기록 제외</p><button id="compare-still">정지 생존 비교 · 이동·회피 없음</button><button id="compare-area">광역형 3분 비교</button><button id="compare-frost">빙결형 3분 비교</button><button id="compare-orbit">공전형 3분 비교</button></details>':''}</div>`;
 $('#start-survival').onclick=()=>{if(!saved){startSurvival();return;}$('#overlay').innerHTML='<div class="menu-panel survival-panel"><h2>새로 시작할까요?</h2><p>기존 생존전 이어하기가 새 도전으로 바뀝니다.</p><div class="survival-actions"><button id="survival-new-confirm">새 도전 시작</button><button id="survival-new-cancel">취소</button></div></div>';$('#survival-new-confirm').onclick=()=>startSurvival();$('#survival-new-cancel').onclick=showSurvivalSetup;};if($('#resume-survival'))$('#resume-survival').onclick=resumeSurvival;$('#survival-back').onclick=()=>{$('#overlay').classList.remove('survival-overlay');showDungeon();};
 $('#survival-cloud-status').textContent=survivalSyncLabel(survivalCloud.state());$('#survival-cloud-retry').onclick=()=>refreshSurvivalAccount();if(refresh!==false)void refreshSurvivalAccount();
 $('.survival-record').insertAdjacentHTML('afterend','<button id="survival-open-ranking" class="survival-sync-button">물량생존전 랭킹 보기</button>');$('#survival-open-ranking').onclick=()=>showSurvivalRanking();
 const recordLabel=$('.survival-record');recordLabel.textContent=`${account.user()&&!account.user().isAnonymous?'계정':'이 기기'} 최고 ${record.bestKills.toLocaleString()}처치 · 최장 ${survivalClock(record.bestTime)} · 최고 ${record.bestBosses}보스 · ${survivalLocalClearHistory(record)}`;
 if(!localInspection)void survivalBestCloud.sync().then(result=>{if(!recordLabel.isConnected)return;const best=survivalPersonalRecord();recordLabel.textContent=`${result.kind==='synced'?'계정 최고기록':'이 기기에 보관된 최고기록'} · ${best.bestKills.toLocaleString()}처치 · ${survivalClock(best.bestTime)} · ${best.bestBosses}보스 · ${survivalLocalClearHistory(best)}${result.kind==='offline'?' · 계정 연결 재확인 필요':''}`;});
 if(localInspection){$('#survival-pierce').onclick=()=>startSurvival('pierce');$('#survival-frost').onclick=()=>startSurvival('frost');$('#survival-stress').onclick=()=>startSurvival('stress');$('#survival-boss').onclick=()=>startSurvival('boss');$('#survival-duel').onclick=()=>startSurvival('duel');for(const id of ['act2','act3','loop','base','route','stress2','stress3'])$('#survival-'+id).onclick=()=>startSurvival(id);for(const id of Object.keys(SURVIVAL_BENCHES))$('#'+id).onclick=()=>startSurvival(id);}
}
function startSurvival(lab=null,saved=null){
 ++expansionLaunch;void releaseExpansionSaveLease();
 const publicFive=publicCircuitActCount()===5,fiveActs=publicFive||localInspection&&(['act4','act5','five'].includes(lab)||saved?.session?.actCount===5);
 if(!localInspection&&!publicFive&&saved?.session?.actCount===5){$('#toast').textContent='이 기록의 추가 막이 아직 공개되지 않았어요. 저장은 그대로 남겨 두었습니다.';return;}
 if(fiveActs&&!expansionJourneyView){const owner=survivalOwner();return prepareExpansionAssets(lab==='act5'||saved?.session?.act===4?'crystalGorge':null).then(()=>{if(owner!==survivalOwner()){$('#toast').textContent='준비 중 계정이 바뀌었어요. 원래 계정의 저장은 그대로 남아 있습니다.';return;}return startSurvival(lab,saved);});}
 if(publicFive&&saved&&saved.session?.actCount!==5){saved=migrateSurvivalToFiveActs(saved);if(!saved){$('#toast').textContent='저장된 진행을 확인하지 못했어요. 이전 기록을 보존했습니다.';return;}}
 if(!localInspection&&!requireName())return;
 if(!saved&&!retryStoredSurvivalTitles()){survivalSaveMessage=survivalSaveMessage||'미지급 보스 보상을 보관하고 있어요. 계정과 저장 공간을 확인한 뒤 다시 시작해 주세요.';$('#toast').textContent=survivalSaveMessage;return;}
 document.body.classList.remove('survival-result');
 $('#overlay').classList.remove('survival-overlay');
 if(gameplayPaused()||maintenanceOn){showIntro();return;}
 expansionJourney=null;expansionEntry=null;survivalExpansion=null;mirrorSession=null;trainingSession=null;developerRun=false;labSafe=false;baseSlideTime=baseSlideCooldown=0;baseSlideLock=-1;startRegion='garden';
 survivalSaveMessage='';survivalPendingChoice=null;survivalSaveToken=saved?{id:saved.id,revision:saved.revision,writeId:saved.writeId,owner:survivalOwner()}:{id:globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random()}`,revision:0,owner:survivalOwner()};survivalAutosaveAt=15;survivalTitleRetryAt=0;
 survivalSession=createSurvivalSession(localInspection&&SURVIVAL_BENCHES[lab]?413:Date.now(),{actCount:fiveActs?5:3});survivalSession.nextSupply=SURVIVAL.supplyInterval;survivalSession.lab=localInspection&&lab||null;survivalSession.benchmark=localInspection?createSurvivalBenchmark(lab):null;
 document.body.classList.add('survival-mode');restart();
 if(mode!=='playing'){survivalSession=null;return;}
 if(saved){restoreSurvivalWorld(saved);return;}
 if(survivalSession.benchmark){choicesTaken=1;takeSurvivalBenchmarkPick();$('#toast').textContent='가속 자동 비교 · '+survivalSession.benchmark.label+' · 기록 제외';return;}
 if(survivalSession.lab){
  labSafe=!['duel','base','act4','act5','five'].includes(lab);survivalSession.act=(lab==='act2'||lab==='base'||lab==='stress2')?1:lab==='act3'||lab==='loop'||lab==='stress3'?2:lab==='act4'?3:lab==='act5'?4:0;drawRoom();survivalSession.time=(['boss','duel','act2','act3','act4','act5','loop','route'].includes(lab))?SURVIVAL.duration-.1:lab?.startsWith('stress')?SURVIVAL.duration-30:lab==='five'?0:SURVIVAL.duration*.5;survivalSession.nextSupply=SURVIVAL.duration+60;
  for(const e of enemies)releaseEnemy(e);enemies=[];
  for(const id of (lab==='pierce'||lab==='frost'?[]:['split','chain','burst'])){if(LAWS[id]){levels.set(id,3);chosen.add(id);}}
  bankedUpgrades=12;for(const id of (lab==='pierce'?['thunderlance']:lab==='frost'?['frostnet']:['prism','thunderlance','gravitymirror']))heldForms.set(id,lab==='pierce'||lab==='frost'?2:4);syncLaws();syncForms(true);growth.select(effectiveLaws(),mutated);activeGauge.value=100;
  for(let i=0;i<(['boss','duel','act2','act3','act4','act5','loop','route'].includes(lab)?16:lab==='five'?0:lab?.startsWith('stress')?SURVIVAL.maxEnemies:72);i++){const a=i*2.399963,r=(['stress','stress2','stress3','boss','duel','act2','act3','act4','act5','loop','route'].includes(lab)?3:5)+(i%17)*.5;spawnSurvivalEnemy({x:Math.cos(a)*r,z:Math.sin(a)*r,kind:i%7===0?'brute':i%3===0?'runner':'swarm'});}
  if(lab==='base'){player.position.set(SURVIVAL_BASES[0].x,0,SURVIVAL_BASES[0].z);survivalSession.time=45;}
  $('#toast').textContent=(lab==='pierce'?'관통·연쇄 시연':lab==='frost'?'빙결·연쇄 시연':lab==='duel'?'보스전 연습':'로컬 부하 검증')+(labSafe?' · 피해 면역':' · 실제 피해 적용')+' · 기록 제외';return;
 }
 choicesTaken=1;cardChoice(true);$('#toast').textContent='';
}
function takeSurvivalBenchmarkPick(){
 const bench=survivalSession?.benchmark;if(!bench)return;
 const pick=survivalBenchmarkPick(bench,levels,heldForms,FORMS);
 const accepted=pick.fusion?bankAndFuse(pick.fusion):chooseLaw(levels,pick.law,heldForms);
 if(!accepted){bench.error='선택 적용 실패';finishSurvival(false,true);return;}
 bench.picks++;syncLaws();syncForms();growth.select(effectiveLaws(),mutated);
}
function stepSurvivalBenchmark(dt){
 const bench=survivalSession?.benchmark;if(!bench||mode!=='playing'||paused)return;
 elapsed+=dt;update(dt,elapsed);
 if(!survivalSession||survivalSession.finished)return;
 if(!survivalSession.won&&choiceKills>=choiceGoal()){choiceKills-=choiceGoal();choicesTaken++;takeSurvivalBenchmarkPick();}
 sampleSurvivalBenchmark(bench,{time:survivalSession.time,hp,kills,choices:choicesTaken,enemies:enemies.filter(e=>!e.dead).length,shots:shots.length+enemyShots.length,bossHp:enemies.find(e=>e.survivalBoss)?.hp});
 if(survivalSession.time>=SURVIVAL.duration+180&&!survivalSession.won){bench.timedOut=true;finishSurvival(false,true);}
}
function spawnSurvivalEnemy(spot=null){
 if(!survivalSession||enemies.reduce((n,e)=>n+(!e.dead&&Boolean(e.survivalKind)),0)>=SURVIVAL.maxEnemies)return;
 const next=spot||survivalSpawn(survivalSession,player.position,arena);if(!next)return;
 const spec=survivalEnemySpec(next.kind,survivalSession),g=new THREE.Object3D();g.position.set(next.x,0,next.z);
 if(expansionTerrain)expansionTerrain.constrain(g.position,spec.radius);
 const health=spec.hp*(survivalSession.lab?.startsWith('stress')?200:1);
 const e={g,type:'swarm',survivalKind:next.kind,hp:health,maxHp:health,speed:spec.speed,damage:spec.damage,radius:spec.radius,survivalScore:spec.score,timer:.6,hit:0,slow:0,frostLock:0,dead:false,phase:next.x*.71+next.z*.29};
 enemies.push(e);return e;
}
function spawnSurvivalBoss(){
 const act=survivalAct(survivalSession),scale=survivalScaling(survivalSession);
 const e=act.expansion?{g:new THREE.Group(),type:act.type,hp:act.expansion==='crosswind'?3200:4200,maxHp:0,hit:0,slow:0,state:'recover',phase:0,immovable:true,radius:.8,expansionBoss:true,config:{name:act.boss}}:act.type==='alwaysbeginner'?createAlwaysBeginner(scene):act.type==='tempestcarrier'?createTempestCarrier(scene):createAustin(scene);
 if(act.expansion)scene.add(e.g);
 const spot=survivalSpawn(survivalSession,player.position,arena)||{x:0,z:-12};
 e.g.position.set(spot.x,0,spot.z);e.survivalBoss=true;e.survivalScale=scale;
 e.hp*=scale.bossHp;e.maxHp=e.hp;if(Number.isFinite(e.damageAllowance))e.damageAllowance*=scale.bossHp;
 if(act.expansion){e.expansionMotion=survivalExpansion?.boss;attachActorArt(e,camera,release,expansionActorArt(act.type));}
 else if(act.type==='alwaysbeginner')attachActorArt(e,camera,release,{...ALWAYS_BEGINNER_ART,directional:true,occlusion:qualityLevel>0});
 else if(act.type==='tempestcarrier'){const art=ACT3_ART.tempestcarrier;attachActorArt(e,camera,release,{file:art.file,size:art.size,atlasFrame:actor=>art.frames[actor.phaseIndex||0],topDownFacing:true,baseline:art.baseline,occlusion:false,lighting:false});}
 else if(AUSTIN_ART)attachActorArt(e,camera,release,{file:AUSTIN_ART,size:4.3,directional:true,baseline:.02,occlusion:qualityLevel>0});
 if(survivalSession.lab==='loop'||survivalSession.lab==='route')e.hp=1;attachBossActionRig(e);enemies.push(e);$('#boss-hud').classList.toggle('austin-hud',act.type==='austin');$('#boss-hud').hidden=false;
 $('#boss-hud strong').textContent=act.boss;
 audio.setScene(musicSceneFor(act.music,{boss:true}));$('#toast').textContent=`${act.boss} 등장 · 격파하면 다음 전장으로!`;invuln=Math.max(invuln,1);return e;
}
// All three bosses keep their authored patterns. Their escorts use the same
// instanced contact-only population; no act-specific ranged minion army leaks in.
function tickSurvivalBoss(e,dt,time){
 const scale=e.survivalScale||survivalScaling(survivalSession),tempo=dt*scale.tempo*(e.slow>0?Math.max(.8,LS.frostFactor):1);
 if(e.expansionBoss&&survivalExpansion){
  const before=(e.expansionPrevious??=new V()).copy(e.g.position),out=survivalExpansion.stepBoss(tempo,{position:e.g.position,player:player.position,activeProjectiles:enemyShots.length,hpRatio:e.hp/e.maxHp,enemies});
  e.g.position.x+=out.move.x;e.g.position.z+=out.move.z;collide(e.g.position,.8,before);e.state=out.state;
  const act=survivalSession.act===3?'crosswind':'crystalGorge';e.takenScale=expansionApi.expansionBossDamageMultiplier(act,e.state,out.coreOpen);
  for(const t of out.telegraphs)expansionJourneyView?.tell(t);
  for(const contact of out.contacts){contact.to.x=e.g.position.x;contact.to.z=e.g.position.z;if(e.lastExpansionContact!==contact.hitId&&expansionApi.expansionContactHits(contact,player.position)){e.lastExpansionContact=contact.hitId;hitPlayer(contact.damage*scale.damage);}}
  for(const q of out.bolts){if(enemyShots.length>=48)break;skywayBolt(new V(q.position.x,0,q.position.z),new V(q.dir.x,0,q.dir.z),{...q.spec,speed:q.spec.speed*scale.projectile,damage:q.spec.damage*scale.damage});}
  if(out.terrain.length)syncExpansionCrystals();e.hit=Math.max(0,e.hit-dt);return;
 }
 const hooks={player:player.position,arenaMode:true,arena,collide,clearBolts:()=>{for(const p of enemyShots)release(p.ob);enemyShots=[];},
  bolt:(pos,dir,spec)=>{if(enemyShots.length>=192)return;const fire=e.type==='austin'?austinBolt:e.type==='alwaysbeginner'?stadiumBolt:skywayBolt;fire(pos,dir,{...spec,speed:spec.speed*scale.projectile,damage:spec.damage*scale.damage});},
  hit:a=>{if(invuln>0||shellTime>0)return false;hitPlayer(a*scale.damage);return true;},burst,pulse:(p,c,r,l)=>vfx.pulse(p,c,r,l),
  bossPitch:vfx.bossPitch,bossRush:vfx.bossRush,bossSwing:vfx.bossSwing,bossWave:vfx.bossWave,bossPhase:vfx.bossPhase,sound:id=>audio.play(id),
  summon:types=>{for(let i=0;i<types.length&&enemies.filter(o=>!o.dead&&o.survivalKind).length<SURVIVAL.maxBossAdds;i++)spawnSurvivalEnemy();}};
 if(e.type==='austin')tickAustin(e,tempo,hooks);
 else if(e.type==='alwaysbeginner')tickAlwaysBeginner(e,tempo,hooks);
 else tickTempestCarrier(e,tempo,time,hooks);
 e.updateActionArt?.(time);
}
function continueSurvival(){
 const pending=survivalTitleEvents(survivalSession);
 if(!pending||pending.length>=SURVIVAL_TITLE_LIMIT){
  if(Date.now()>=survivalTitleRetryAt){survivalTitleRetryAt=Date.now()+2000;settleSurvivalTitle();saveSurvival();$('#toast').textContent='미지급 보스 보상을 보관 중이에요 · 계정과 저장 공간을 확인하면 다음 막으로 이어집니다';}
  if((survivalTitleEvents(survivalSession)?.length??SURVIVAL_TITLE_LIMIT)>=SURVIVAL_TITLE_LIMIT)return;
 }
 if(!advanceSurvivalAct(survivalSession))return;
 queueMicrotask(()=>saveSurvival());
 for(const e of enemies)releaseEnemy(e);for(const f of fallen)releaseEnemy(f.e);fallen.length=0;enemies=[];
 for(const q of [...shots,...enemyShots,...effects])release(q.ob);shots=[];enemyShots=[];effects=[];
 clearForms();cancelActive(activeGauge);activeVfx.clear();finaleEchoes.length=0;wells.length=0;pulls.length=0;orbitHits.clear();vfx.clear();clearEscorts();
 cachedTarget=null;targetTimer=0;player.position.set(0,0,0);playerMotion.reset();player.userData.dashTime=0;shootCD=0;playerSlow=0;baseSlideTime=baseSlideCooldown=0;baseSlideLock=-1;
 touch.reset();keys.clear();keyboardDash=false;invuln=2;hp=Math.min(maxPlayerHp(),hp+25);addItem(inventory,'tonic',1);itemBarKey='';
 drawRoom();syncForms(true);$('#boss-hud').hidden=true;$('#active-cinematic').hidden=true;$('#pause').textContent='Ⅱ';
 if(survivalSession.lab==='route'){if(survivalSession.lap>=2){finishSurvival(true);return;}survivalSession.time=survivalSession.legStartedAt+SURVIVAL.duration-.1;}
 const act=survivalAct(survivalSession);audio.setScene(musicSceneFor(act.music));
 $('#toast').textContent=`${survivalSession.lap+1}순환 · ${survivalSession.act+1}막 ${act.name} · 체력 +25 · 물약 +1(상한 5)${survivalSession.act===1?' · 베이스를 밟아 돌파하세요':''}`;
}
function updateSurvival(dt){
 const session=survivalSession;if(!session||session.finished)return;
 session.buildLevel=buildLevel(levels,heldForms);
 if(session.lab?.startsWith('stress')&&session.time>SURVIVAL.duration-10)session.time=SURVIVAL.duration-30;
 let alive=0;survivalRushes=0;for(const e of enemies)if(!e.dead&&e.survivalKind){alive++;if(e.rushState==='brace'||e.rushState==='rush')survivalRushes++;}
 const event=tickSurvival(session,dt,alive);if(event.boss)spawnSurvivalBoss();for(let i=0;i<event.spawn;i++)spawnSurvivalEnemy();
 if(takeSurvivalSupply(session)){const added=addItem(inventory,'tonic',1);itemBarKey='';if(added){audio.play('pickup');$('#toast').textContent='생존 보급 · 회복 물약 +1';}else $('#toast').textContent='생존 보급 · 회복 물약은 최대 5개예요';}
}
let survivalRushes=0;
const survivalCue=new THREE.Vector3();
function moveSurvivalEnemy(e,edt,dt,time){
 e.hit=Math.max(0,e.hit-dt);e.timer-=dt;
 const pos=e.g.position,dx=player.position.x-pos.x,dz=player.position.z-pos.z,distance=Math.hypot(dx,dz);
 const previous=expansionTerrain?(e.survivalPrevious??=new THREE.Vector3()).copy(pos):null;
 // Bodies stop at touching distance, rather than all targeting the seed centre.
 if(tickSurvivalRush(e,edt,player.position,survivalRushes)){
  survivalRushes++;
  // A short, fixed direction cue plus the bracing body; pooled existing VFX.
  for(let i=1;i<=3;i++){survivalCue.set(pos.x+e.rushX*i*1.3,.03,pos.z+e.rushZ*i*1.3);vfx.pulse(survivalCue,'burst',.22,.65);}
 }
 const reach=e.radius+.30,step=Math.min(Math.max(0,distance-reach),edt*e.speed*(e.rushState==='brace'?.08:e.rushState==='recover'?.25:1));
 if(e.rushState==='rush'){pos.x+=e.rushX*edt*9;pos.z+=e.rushZ*edt*9;e.g.rotation.y=Math.atan2(e.rushX,e.rushZ);}
 else if(distance>.001){e.g.rotation.y=e.rushState==='brace'?Math.atan2(e.rushX,e.rushZ):Math.atan2(dx,dz);pos.x+=dx/distance*step;pos.z+=dz/distance*step;}
 let neighbours=0,px=0,pz=0;
 for(const other of enemyIndex.queryInto(pos,1.25,separationEnemies,17,false)){
  if(other===e||other.dead)continue;if(++neighbours>16)break;
  let ax=pos.x-other.g.position.x,az=pos.z-other.g.position.z,d=Math.hypot(ax,az);
  const spacing=e.radius+(other.radius||.35)+.12;
  // Seeded per-actor phase also resolves exact overlaps without random jitter.
  if(d<.001){const angle=e.phase*2.399+neighbours;ax=Math.cos(angle);az=Math.sin(angle);d=.001;}
  if(d<spacing){const push=Math.min(.18,edt*(spacing-d)*24),norm=Math.hypot(ax,az)||1;px+=ax/norm*push;pz+=az/norm*push;}
 }
 const displacement=Math.hypot(px,pz),cap=edt*e.speed*2.8;
 if(displacement>cap&&displacement>0){px*=cap/displacement;pz*=cap/displacement;}
 pos.x+=px;pos.z+=pz;constrainToArena(pos,e.radius,arena);if(expansionTerrain)expansionTerrain.constrain(pos,e.radius,previous);
 // Check the resolved position: crowd pressure must not grant remote hits.
 if(Math.hypot(player.position.x-pos.x,player.position.z-pos.z)<e.radius+.42&&e.timer<=0){hitPlayer(e.damage);e.timer=.9;}
}
function finishSurvival(won=false,left=false){
 const session=survivalSession;if(!session||session.finished)return;settleSurvivalTitle();session.finished=true;
 if(!session.lab&&survivalSaveToken){survivalPendingEnd={...survivalSaveToken,session:captureSurvivalSession(session)};if(persistSurvivalEnd())void survivalCloud.flush();}
 document.body.classList.add('survival-result');$('#overlay').classList.add('survival-overlay');
 if(session.benchmark){session.benchmark.damageTaken=runDamageTaken;session.benchmark.dashes=runDashes;}
 if(session.benchmark)sampleSurvivalBenchmark(session.benchmark,{time:session.time,hp,kills,choices:choicesTaken,enemies:enemies.filter(e=>!e.dead).length,shots:shots.length+enemyShots.length,bossHp:enemies.find(e=>e.survivalBoss)?.hp,force:true});
 const outcome=survivalOutcome(session,{left,boss:enemies.find(e=>e.survivalBoss)});won=outcome.won;
 const report=finishRoomAnalysis(false,false),record=session.lab?survivalPersonalRecord():recordSurvivalResult(survivalRecordStorage(rawStorage,survivalSaveToken?.owner||survivalOwner()),session);
 if(!session.lab&&!localInspection&&survivalSaveToken?.owner&&survivalSaveToken.owner===account.user()?.uid)void survivalBestCloud.sync();
 perfFinish(won?'cleared':left?'left':'ended');mode='dead';paused=false;labSafe=false;touch.reset();keys.clear();pauseBuild.hide();$('#save-exit').hidden=true;
 cancelActive(activeGauge);activeVfx.clear();$('#active-cinematic').hidden=true;$('#evolution').hidden=true;$('#toast').textContent='';audio.setPaused(false);audio.setScene('garden');
 $('#overlay').classList.remove('garden-mode','ranking-overlay','developer-mode');$('#overlay').classList.add('intro','menu-screen');$('#overlay').hidden=false;
 $('#overlay').innerHTML=`<div class="menu-panel survival-panel"><p class="eyebrow">물량생존전 · ${session.lab?'로컬 검증 · 기록 제외':'밀려오는 숲'}</p><h2>${outcome.title}</h2>${session.benchmark?`<p class="survival-result-note">${session.benchmark.label} · 가속 자동 비교 · 지정 선택 · 사람의 완주 기록이 아닙니다</p>`:session.lab?'<p class="survival-result-note">연습 결과 · 실제 3분 생존 기록이 아닙니다</p>':''}<div class="survival-facts"><span><b>${survivalClock(session.lab?elapsed:session.time)}</b>${session.lab?'연습 전투 시간':'버틴 시간'}</span><span><b>${session.kills.toLocaleString()}</b>처치</span><span><b>${outcome.value}</b>${outcome.label}</span></div>${session.bossSpawned?`<p class="survival-note">${session.lab&&!session.benchmark?'3분 지점부터 연습':'3분 생존 돌파'} · 보스전 ${survivalClock(outcome.bossSeconds)}${session.won?' · 격파 성공':' · 도전 종료'}</p>`:''}<p class="survival-note">${session.lap+1}순환 · ${session.act+1}막 ${survivalAct(session).name} · 누적 보스 ${session.bossesDefeated}회 격파</p>${combatAnalysisSummary(report)}<p class="survival-record">${session.lab?'연습 결과는 최고기록에 포함되지 않아요.<br>':''}이 기기 최고 ${record.bestKills.toLocaleString()} 처치 · 이 기기 ${survivalClearRecordLabel(record,session.actCount===5)} · 최고 ${record.bestBosses}보스</p><div class="survival-actions"><button id="survival-retry" class="primary">${session.lab?'같은 연습 다시':'다시 도전'}</button><button id="survival-setup">도전 준비</button><button id="survival-home">메인으로</button></div></div>`;
 $('#survival-retry').onclick=()=>startSurvival(session.lab);$('#survival-setup').onclick=()=>{showIntro();showSurvivalSetup();};$('#survival-home').onclick=showIntro;
 $('.survival-record').insertAdjacentHTML('afterend','<p id="survival-submit-status" class="survival-note" role="status"></p><button id="survival-result-ranking" class="survival-sync-button">물량생존전 랭킹 보기</button>');$('#survival-result-ranking').onclick=()=>showSurvivalRanking(()=>{showIntro();showSurvivalSetup();});
 const decision=rankingDecision({isTestRun:Boolean(session.lab||session.benchmark||developerRun),localInspection,score,name:playerName,native:account.native,admin:adminMode,tester:betaTesterMode,user:account.user(),paceTrusted:paceTrusted(paceGame,paceReal)});
 const status=$('#survival-submit-status');
 if(survivalPendingEnd?.owner===survivalOwner()){status.textContent=survivalSaveMessage;return;}
 if(!decision.eligible||survivalSaveToken?.owner!==account.user()?.uid){status.textContent=localInspection||session.lab?'연습 기록은 온라인 랭킹에 등록하지 않아요.':'이 기기 기록에 남았어요 · 온라인 랭킹은 로그인한 테스트 계정의 정상 플레이만 등록해요.';return;}
 const build=buildRecord({levels,forms:heldForms}),entry={uid:account.user().uid,name:playerName,score:Math.floor(score),kills:session.kills,bosses:session.bossesDefeated,time:Math.max(1,Math.ceil(session.time)),laws:build.laws,forms:build.forms};
 status.textContent='생존전 최고기록을 등록하는 중…';
 survivalRanking.submit(entry).then(()=>{if(status.isConnected)status.textContent='온라인 최고기록 확인 완료 · 랭킹에서 내 순위와 조합을 확인하세요.';}).catch(error=>{if(status.isConnected)status.textContent=error.message==='invalid-run'?'기록 검증을 통과하지 못해 이 기기에만 남겼어요.':'온라인 등록 대기 · 이 계정의 기록을 기기에 보관했어요. 랭킹을 열면 다시 전송합니다.';});
}

function wave(continueSkyway=false){
 audio.setScene(musicSceneFor(region,{boss:inAustinRoom(),mirror:Boolean(mirrorSession)}));
 for(const f of fallen)releaseEnemy(f.e);fallen.length=0;potionCD=0;skywaySupplyClaimed=false;relicRewardPending=false;
 clearForms();cancelActive(activeGauge);activeVfx.clear();finaleEchoes.length=0;cachedTarget=null;targetTimer=0;clearEscorts();escortWaves=0;bossDefeated=false;act2Support=null;bossRewardLine='';vfx.clear();wells.length=0;roomStartKills=kills;midReward=false;skywayAdvance=0;trapClock=0;pulls.length=0;orbitHits.clear();dashLock=0;dashRelicReady=false;baseSlideTime=baseSlideCooldown=0;baseSlideLock=-1;crowdLeft=mirrorSession||inAustinRoom()?0:crowdTotal(stage,cycle)+(isAct3(region)?act3RoomPressure(stage).crowdExtra:isAct2(region)?ACT2_PRESSURE.crowdExtra[stage]||0:0);crowdTimer=0;crowdIndex=0;orbitHitCD=0;
 roomCleared=false;exitOpen=false;gate.visible=false;$('#exit-room').hidden=true;$('#toast').textContent='';$('#room-analysis').hidden=true;combatAnalysis.cancel();
 for(const p of [...shots,...enemyShots,...effects])release(p.ob);shots=[];enemyShots=[];effects=[];
 drawRoom();{const start=arena.start||{x:0,z:5};if(!continueSkyway||!isAct3(region))player.position.set(start.x,0,start.z);else constrainToArena(player.position,.4,arena);}playerMotion.reset();invuln=Math.max(invuln,mirrorSession?1.15:.8);$('#boss-hud').classList.toggle('austin-hud',!mirrorSession&&inAustinRoom()&&!isAct2(region)&&!isAct3(region));
 if(expansionJourney){waveExpansionJourney();return;}
 if(survivalSession){crowdLeft=0;for(let i=0;i<8;i++)spawnSurvivalEnemy({x:Math.sin(i*Math.PI/4)*11,z:Math.cos(i*Math.PI/4)*11,kind:'swarm'});combatAnalysis.begin(elapsed,{region:'survival',stage:1,cycle:1});$('#boss-hud').hidden=true;return;}
 if(mirrorSession){
  const e=createMirrorFighter(scene,{floor:mirrorSession.floor,quality:qualityLevel===0?'low':'normal',levels,forms:heldForms,dashEvolution:dashState.id});e.g.position.set(0,0,-6.8);enemies.push(e);mirrorSession.enemy=e;mirrorSession.cracks=0;$('#boss-hud strong').textContent=`거울의 탑 ${mirrorSession.floor}층 · 비친 씨앗`;
 }
 else if(inAustinRoom()){
   if(isAct3(region)){const e=createTempestCarrier(scene),art=ACT3_ART.tempestcarrier;e.g.position.set(0,0,-1.8);attachActorArt(e,camera,release,{file:art.file,size:art.size,atlasFrame:actor=>art.frames[actor.phaseIndex||0],topDownFacing:true,baseline:art.baseline,occlusion:false,lighting:false});attachBossActionRig(e);enemies.push(e);$('#boss-hud strong').textContent=TEMPEST_CARRIER.name;}
  else if(isAct2(region)){const e=createAlwaysBeginner(scene);e.g.position.set(0,0,-3);attachActorArt(e,camera,release,{file:ALWAYS_BEGINNER_ART.file,size:ALWAYS_BEGINNER_ART.size,directional:true,baseline:ALWAYS_BEGINNER_ART.baseline,occlusion:qualityLevel>0});attachBossActionRig(e);enemies.push(e);$('#boss-hud strong').textContent=ALWAYS_BEGINNER.name;}
  else{const e=createAustin(scene);e.g.position.set(0,0,-3);if(AUSTIN_ART)attachActorArt(e,camera,release,{file:AUSTIN_ART,size:4.3,directional:true,baseline:.02,occlusion:qualityLevel>0});attachBossActionRig(e);enemies.push(e);$('#boss-hud strong').textContent=AUSTIN.name;}
 }
 else for(const [type,x,z] of roomFor(stage,cycle,region).enemies){if(type==='warden'){const duo=stage===4&&!isAct2(region)&&!isAct3(region)?wardenEncounter(cycle,austinsDefeated):{count:1};const e=spawnWardenAt(x+(duo.count===2?-2.35:0),z,wardenVariantFor(cycle));if(duo.count===2)spawnWardenAt(x+2.35,z,wardenVariantFor(cycle+1),{support:true,delay:.85});$('#boss-hud strong').textContent=duo.count===2?'쌍문지기':e.config.name;}else if(type==='act2warden'){const encounter=act2WardenEncounter(cycle,austinsDefeated),e=spawnAct2WardenAt(x,z,encounter.primary);if(encounter.support)act2Support={variant:encounter.support,trigger:encounter.trigger};$('#boss-hud strong').textContent=encounter.support?`${e.config.name} · 연계전`:e.config.name;}else if(type==='act3warden'){const e=spawnAct3WardenAt(x,z);$('#boss-hud strong').textContent=e.config.name;}else if(isAct3Minion(type))spawnAct3(type,x,z);else if(isAct2Minion(type))spawnAct2(type,x,z);else enemy(type,x,z);}
 if(stage===3&&!isAct2(region)&&!isAct3(region)){const e=createWarden(scene,mats,wardenVariantFor(cycle+1));e.elite=true;e.tint=0xffffff;e.hp=e.maxHp=1150*.36;{const spot=roomFor(stage,cycle,region).elite||{x:0,z:-5};e.g.position.set(spot.x,0,spot.z);}attachActorArt(e,camera,release,{file:`warden-${e.variant}-v4.png`,order:e.variant==='memory'?[0,3,2,1]:[0,1,2,3],size:3.1,directional:true,baseline:.02,occlusion:qualityLevel>0});enemies.push(e);}
 // 2막의 캐치볼 한 벌은 1막 포탑과 같은 자리를 차지한다: 가만히 있지만 부술 수 있고, 부수면 캐치볼이 멈춘다.
 if(!mirrorSession&&isAct2(region)&&relayRoom(stage,inAustinRoom())){const rig=createRelayRig(scene);for(const e of [rig.machine,rig.mitt])attachActorArt(e,camera,release,{file:'enemy-relay-atlas-v1.webp',size:e.lead?2.65:2.55,atlasFrame:actor=>actor.lead?(actor.rig.clock%RELAY.period<RELAY.charge?0:1):(actor.rig.caught>0?3:2),preserveBody:true,baseline:.03,occlusion:qualityLevel>0,lighting:false});enemies.push(rig.machine,rig.mitt);}
 if(!mirrorSession)for(const spot of inAustinRoom()?[]:turretSpots(stage,cycle,region)){const t=createTurret(scene,mats,copiedLaws(effectiveLevels(levels,heldForms)));t.g.position.set(spot.x,0,spot.z);attachActorArt(t,camera,release,{file:'enemy-turret-v4.png',size:3.0,preserveBody:true,occlusion:qualityLevel>0});enemies.push(t);}
 if(!mirrorSession&&!isAct2(region)&&!isAct3(region)&&stage<4&&(stage===1||stage===3||cycle>0)){const e=createShield(scene);{const spot=roomFor(stage,cycle,region).shield||{x:stage===3?0:1.6,z:stage===3?2:-4};e.g.position.set(spot.x,0,spot.z);}attachActorArt(e,camera,release,{file:'enemy-shield-v4.png',size:2.05,directional:true,baseline:.06,occlusion:qualityLevel>0});enemies.push(e);}
 if(!mirrorSession){for(const e of enemies){e.hp*=(isBoss(e)?difficulty(cycle,region).bossHp:difficulty(cycle,region).hp*(isAct3(region)?ACT3_PRESSURE.hp:isAct2(region)?ACT2_PRESSURE.hp:1))*levelPressure();if(e.maxHp)e.maxHp=e.hp;}saveBoundary(stage,inAustinRoom()?'austin':'entry');settleJourneyBossTitles();spawnCrowd(isAct3(region)?act3RoomPressure(stage).crowdInitial:isAct2(region)?ACT2_PRESSURE.crowdInitial:8);}
 combatAnalysis.begin(elapsed,{stage:mirrorSession?mirrorSession.floor:stage+1,cycle:cycle+1,region:mirrorSession?'mirror':region});$('#encounter').textContent=mirrorSession?`거울의 탑 ${mirrorSession.floor}층 · 넓은 원형 전장 · 균열 0/${MIRROR_BREAK.crackGoal}`:`여정 ${cycle+1} · ${inAustinRoom()?(isAct3(region)?'폭풍 중심부 · '+TEMPEST_CARRIER.name:isAct2(region)?'야간 결승전 · '+ALWAYS_BEGINNER.name:'정시의 시계탑 · '+AUSTIN.name):REGION_NAMES[region]+' · '+roomFor(stage,cycle,region).name}`;
 [...document.querySelectorAll('#stages span')].forEach((n,i)=>n.classList.toggle('active',mirrorSession?i<Math.min(5,Math.ceil(mirrorSession.floor/2)):i<=stage));$('#boss-hud').hidden=!mirrorSession&&stage!==4;
}
function openExit(){if(expansionJourney){if(expansionChannel==='public'&&expansionJourney.phase==='boss'&&!expansionPublicEntry?.campaign?.bossCleared){$('#toast').textContent='보스 격파 저장에 실패했어요. 일시정지에서 저장을 다시 확인하세요.';return;}exitOpen=true;arena.exit={x:player.position.x+1.3,z:player.position.z,radius:2};gate.position.set(arena.exit.x,0,arena.exit.z);gate.visible=true;$('#exit-room').hidden=false;$('#toast').textContent=expansionJourney.phase==='boss'?expansionApi.EXPANSION_ACTS[expansionJourney.act].bossName+(expansionChannel==='public'?' 격파 · 출구로 다음 순환 또는 완주':' 격파 · 출구를 눌러 시제품 종료'):'전장 돌파 · 출구를 눌러 다음 방으로 이동';return;}if(dashRewardPending&&offerDashEvolution(openExit))return;if(relicRewardPending){relicRewardPending=false;const offers=relicOffers(relics,rng,gardenFx.relicLaws);if(offers.length){mode='relics';touch.reset();keys.clear();keyboardDash=false;showRelicChoice($('#overlay'),relics,offers,()=>{syncLaws();mode='playing';$('#overlay').hidden=true;openExit();},relicFx);return;}}if(stage===4)saveAfterBoss();else saveBoundary(stage+1);exitOpen=true;gate.visible=!isAct3(region);if(isAct3(region)){skywayAdvance=.95;$('#toast').textContent='항로가 이어집니다 · 다음 편대 접근';return;}$('#toast').textContent=stage!==4?'방을 정리했다 · 빛나는 출구로 이동하세요':austinRoom?`${finalBossName()}을 이겼다${bossRewardLine?' · '+bossRewardLine:''} · 빛나는 출구로 다음 여정을 떠나세요`:finalBossAhead()?'다섯 번째 관문 돌파 · 출구 너머에서 최종 보스가 기다립니다':'문지기가 쓰러졌다 · 빛나는 출구로 다음 여정을 떠나세요';}
function useExit(forceSkyway=false){if(expansionJourney){exitExpansionJourney();return;}if(!(forceSkyway===true&&isAct3(region)&&exitOpen)&&!canUseExit({open:exitOpen,mode,paused,x:player.position.x,z:player.position.z,exit:arena.exit||EXIT}))return;touch.reset();keys.clear();keyboardDash=false;exitOpen=false;gate.visible=false;$('#exit-room').hidden=true;$('#toast').textContent='';if(stage===4){if(finalBossAhead())enterAustin();else nextJourney();}else{stage++;wave(isAct3(region));}}
function enemyBolt(pos,kind,frost=false){
 const ob=new THREE.Object3D();ob.position.set(pos.x,.65,pos.z);return ob;
}
// 3막은 하늘길이 넓어 화면 밖에서 적과 탄이 날아온다. 그 막에서만 카메라를 뒤로 빼 한눈에 보이게 한다.
const ACT3_VIEW_ZOOM=.88;
// 3막의 빠른 편대에 맞춰 일반 이동만 소폭 보정한다. 회피 거리는 유지한다.
const ACT3_PLAYER_SPEED=1.16;
// 3막은 적이 늘 위쪽에서만 내려온다. 시선을 그 방향으로 당겨야 작은 화면에서도 편대가 HUD 뒤에 숨지 않는다.
const ACT3_VIEW_BIAS=-2;
// 적 탄이 벽마다 계속 튕겨 다니면 피할 틈이 없다. 한 번만 튕기게 한다.
// 2026-09-21: 어렵다는 말이 많아 기본 탄 피해를 18에서 20으로 올렸다.
const BASE_SHOT_DAMAGE=20;
const ENEMY_BOUNCE_MAX=1,enemyBounces=n=>Math.max(0,Math.min(ENEMY_BOUNCE_MAX,Math.floor(Number(n)||0)));
function turretBolt(pos,dir,spec){const start=pos.clone().addScaledVector(dir,1.1);const ob=enemyBolt(start,'turret',spec.frost);enemyShots.push({ob,dir:dir.clone(),life:4.5,bounces:enemyBounces(spec.bounces),speed:TURRET.boltSpeed*difficulty(cycle,region).projectileSpeed,damage:TURRET.boltDamage,age:0,origin:pos.clone(),pierce:spec.pierce,recall:spec.recall,frost:spec.frost,burst:spec.burst,gravity:spec.gravity});}
function endEnemyShot(p){
 if(p.burst){vfx.explosion(p.ob.position,'burst',1.6,true);if(!p.struck&&Math.hypot(p.ob.position.x-player.position.x,p.ob.position.z-player.position.z)<1.6)hitPlayer(12);}
 if(p.gravity){if(pulls.length>=4)pulls.shift();pulls.push({pos:p.ob.position.clone().setY(0),life:1.4,pulse:0});}
}
function bossBolt(pos,dir,bounces,laws=[],damageScale=1){const start=pos.clone().addScaledVector(dir,1.25);const ob=enemyBolt(start,'boss',laws.includes('frost'));enemyShots.push({boss:true,ob,dir,life:5,bounces:enemyBounces(bounces),speed:6.8*difficulty(cycle,region).projectileSpeed,damage:18*damageScale,age:0,origin:pos.clone(),pierce:true,recall:laws.includes('recall'),frost:laws.includes('frost')});}
function mirrorBolt(pos,dir,spec={}){
 if(!mirrorSession||enemyShots.length>=mirrorFloorRules(mirrorSession.floor,{quality:qualityLevel===0?'low':'normal'}).budget.hostileProjectiles)return;
 // Reflected volleys should clear before the next copied attack family fills
 // the arena. Count only this family so other copied laws retain their budget.
 const reflecting=(spec.bounces||0)>0||spec.law==='reflect';
 if(reflecting&&enemyShots.filter(shot=>shot.mirror&&(shot.mirrorReflecting||shot.law==='reflect')&&shot.life>0).length>=24)return;
 const law=Object.hasOwn(LAWS,spec.law)?spec.law:'seed',start=pos.clone().addScaledVector(dir,1.05),ob=new THREE.Object3D(),damage=Math.max(5,Math.round(maxPlayerHp()*(spec.damageScale||.075)));
 ob.position.set(start.x,.67,start.z);ob.rotation.y=Math.atan2(dir.x,dir.z);applyProjectileTheme(ob,law,combatTheme,0,1.08);
 enemyShots.push({mirror:true,mirrorReflecting:reflecting,boss:true,ob,dir:dir.clone(),life:reflecting?3.2:5,bounces:enemyBounces(spec.bounces),speed:mirrorProjectileSpeed(mirrorSession.floor,spec.speedScale),damage,age:0,origin:pos.clone(),pierce:true,recall:Boolean(spec.recall),frost:Boolean(spec.frost),burst:Boolean(spec.burst),gravity:Boolean(spec.gravity),curve:spec.curve||0,law,trailTime:0,trailPos:ob.position.clone()});
}
function mirrorCue(message,duration=1100){const toast=$('#toast');toast.textContent=message;setTimeout(()=>{if(toast.textContent===message)toast.textContent='';},duration);}
function mirrorPerfectDodge(projectile){
 if(!mirrorSession||projectile.mirrorDodged)return;projectile.mirrorDodged=true;projectile.life=0;mirrorSession.perfectDodges++;mirrorSession.cracks++;shootCD=refundMirrorAttackCooldown(shootCD);vfx.pulse(player.position,'reflect',.92,.22);vfx.burst(player.position,'reflect',10,1);audio.play('reflect');
 const enemy=mirrorSession.enemy;if(mirrorSession.cracks>=MIRROR_BREAK.crackGoal&&enemy&&!enemy.dead){mirrorSession.cracks=0;enemy.broken=MIRROR_BREAK.breakDuration;enemy.damageAllowance=Math.max(enemy.damageAllowance||0,enemy.maxHp*MIRROR_GUARD.breakBurst);enemy.cracks=0;shootCD=MIRROR_ATTACK_CADENCE.breakInstantReady?0:shootCD;chargeActive(activeGauge,ACTIVE.max*MIRROR_BREAK.ultimateCharge);vfx.pulse(enemy.g.position,'amber',2.4,.5);vfx.burst(enemy.g.position,'amber',28,1.6);cameraShake=Math.max(cameraShake,.3);mirrorCue(`거울 깨짐 · ${MIRROR_BREAK.breakDuration.toFixed(1)}초 피해 ${Math.round((MIRROR_BREAK.damageMultiplier-1)*100)}% 증가`);}
 else mirrorCue(`완벽 회피 · 균열 ${mirrorSession.cracks}/${MIRROR_BREAK.crackGoal}`,800);
 $('#encounter').textContent=`거울의 탑 ${mirrorSession.floor}층 · 넓은 원형 전장 · 균열 ${mirrorSession.cracks}/${MIRROR_BREAK.crackGoal}`;
}

function burst(pos,color,n=12){vfx.burst(pos,color,n);}
function line(a,b){vfx.arc(a,b);audio.play('chain');}
// 룬: 변이가 남기는 바닥 표식. 숫자를 묶어 두어 화면이 무거워지지 않게 한다.
function dropRune(pos,tint='rune'){
 if(runes.length>=RUNE.max){const old=runes.shift();release(old.ob);}
 const ob=ring(scene,RUNE.radius,tint==='burst'?0xffb066:0xb98cff);ob.material.opacity=.5;
 ob.position.set(pos.x,.13,pos.z);
 perf.event(PE.loot);runes.push({ob,pos:new V(pos.x,0,pos.z),life:RUNE.life,tick:0,tint});
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
    damageEnemy(e,RUNE.damage*damageScale(levels,bankedUpgrades)*runPowerScale(runBonuses)*gardenPower(),false);
  }
 }
}
// 변이 폭발: 이미 있는 피해 처리와 효과를 그대로 쓴다.
function mutationBurst(pos,radius,damage){
 vfx.pulse(pos,'burst',radius,.3);vfx.burst(pos,'burst',14);
 if(expansionTerrain){expansionTerrain.area(pos,radius,damage*damageScale(levels,bankedUpgrades)*runPowerScale(runBonuses)*gardenPower(),'burst');expansionTerrainDirty=true;}
 for(const e of enemies)if(!e.dead&&Math.hypot(e.g.position.x-pos.x,e.g.position.z-pos.z)<radius)
  damageEnemy(e,damage*damageScale(levels,bankedUpgrades)*runPowerScale(runBonuses)*gardenPower(),false);
}
function damageEnemy(e,amount,chaining=true,critical=false,meta=null){
 if(expansionTerrain?.owns(e))return damageExpansionCrystal(e,amount,meta?.finalLaw||null);
 if(e.dead||survivalSession?.won||survivalSession?.finished)return;
 const before=Math.max(0,Number(e.hp)||0);
 if(e.type==='mirrorseed'&&e.broken>0)amount*=MIRROR_BREAK.damageMultiplier;
 if(e.state==='recover'&&!e.expansionBoss)amount*=1.35;amount*=e.takenScale||1;
 if(e.type==='mirrorseed'){amount=mirrorDamageAllowed(e,amount);if(amount<=0)return;}
 if(isBoss(e)&&!e.elite&&!e.dead)chargeActive(activeGauge,bossCharge(amount,e.maxHp));
 if(e.type==='austin'){if(damageAustin(e,amount)<=0)return;}else if(e.type==='alwaysbeginner'){if(damageAlwaysBeginner(e,amount)<=0)return;}else if(e.type==='tempestcarrier'){if(damageTempestCarrier(e,amount)<=0)return;}else e.hp-=amount;
 const applied=Math.max(0,Math.min(before,before-Math.max(0,e.hp)));combatAnalysis.damage(meta?.evolution||meta?.kind||'seed',applied,elapsed);if(critical)combatAnalysis.utility('critical');
 e.hit=.14;
 if(meta?.direction){const side=meta.direction.x+meta.direction.z*.34;e.impactSide=Math.abs(side)>.04?Math.sign(side):1;}
 vfx.impact(e.g.position,critical?'amber':chaining?([...chosen][0]||'seed'):'chain',critical);audio.play('hit',{intensity:critical?1.3:isBoss(e)?1.15:.75});
 if(chaining&&chosen.has('chain')){
  const reach=chainRange(mutations),falloff=chainFalloff(mutations);let nearby=enemies.filter(o=>o!==e&&o.hp>0&&o.g.position.distanceTo(e.g.position)<reach).sort((a,b)=>a.g.position.distanceTo(e.g.position)-b.g.position.distanceTo(e.g.position)).slice(0,LS.chainTargets);
  for(const [index,o] of nearby.entries()){line(e.g.position,o.g.position);const spot=o.g.position.clone();damageEnemy(o,amount*(isBoss(o)?.325:falloff),false);if(hasMutation(mutations,'chain','rune'))dropRune(spot);if(hasMutation(mutations,'chain','burst')&&index===nearby.length-1)mutationBurst(spot,TUNE.chainBurst.radius,TUNE.chainBurst.damage);}
  if(nearby.length&&relics.equipped==='coil'&&e.hp>0)damageEnemy(e,amount*.18,false);
 }
 if(e.hp<=0&&!e.dead){e.dead=true;kills++;choiceKills++;combatAnalysis.kill();chargeActive(activeGauge,killCharge(e)*(survivalSession?SURVIVAL.killChargeScale:1));if(!e.survivalKind)vfx.impact(e.g.position,'amber',true);enemyDown(e);}
}
function enemyDown(e){perf.event(PE.enemyDeath);
 if(e.expansionActor){if(e.expansionSettled||!e.dead||e.hp>0)return;e.expansionSettled=true;score+=e.expansionBoss&&expansionChannel==='public'?6000:20;if(e.expansionBoss&&expansionChannel==='public'&&!saveExpansionBossVictory()){paused=true;touch.reset();keys.clear();pauseBuild.show(levels,heldForms);pauseBuild.setSaveStatus('보스 격파를 저장하지 못했어요. 저장을 다시 확인할 때까지 다음 전장을 열지 않습니다.');}releaseEnemy(e);return;}
 if(survivalSession){
  score+=e.survivalScore||500;settleSurvivalKill(survivalSession,{boss:Boolean(e.survivalBoss)});
  if(e.survivalBoss){if(!localInspection&&!survivalSession.lab&&!survivalSession.benchmark&&!developerRun&&!queueSurvivalTitle(survivalSession,e.type,survivalBossOrdinal(survivalSession,e.type)))throw Error('survival-title-queue-full');settleSurvivalTitle();fallen.push({e,t:0,hold:true});invuln=3;$('#toast').textContent=`${survivalAct(survivalSession).boss} 격파 · 조합을 가지고 다음 전장으로 이동합니다`;audio.play('bossDefeat');for(const q of enemyShots)release(q.ob);enemyShots=[];}
  else{survivalArt?.defeat(e,player.position);releaseEnemy(e);}
  return;
 }
 if(e.type==='mirrorseed'){
  fallen.push({e,t:0,hold:true});cameraShake=Math.max(cameraShake,.38);vfx.pulse(e.g.position,'reflect',3,.6);vfx.burst(e.g.position,'reflect',36,1.8);audio.play('bossDefeat');invuln=Math.max(invuln,1.2);for(const p of enemyShots)release(p.ob);enemyShots=[];return;
 }
 score+=killPoints(e,cycle);
 if(isRelayPart(e.type)){
  const stopped=stopRelay(e);vfx.pulse(e.g.position,'amber',1.6,.4);vfx.burst(e.g.position,'amber',22,1.3);
  const potion=relayPotionDrop(rng)&&addItem(inventory,'tonic',1)>0;if(potion)itemBarKey='';
  if(potion)audio.play('pickup');
  $('#toast').textContent=`${relayName(e.type)}를 부쉈다${potion?` · ${ITEMS.tonic.name} 획득 · 생명력 +${ITEMS.tonic.heal}`:''}${stopped?' · 캐치볼이 멈췄다':''}`;
  releaseEnemy(e);return;
 }
 if(!isBoss(e)){
  const supply=act3SupplyDrop(e.type,stage,skywaySupplyClaimed,inventory);
  if(supply&&addItem(inventory,supply,1)){skywaySupplyClaimed=true;itemBarKey='';vfx.pulse(e.g.position,'seed',1.45,.38);audio.play('pickup');$('#toast').textContent=`보급 모함 격파 · ${ITEMS[supply].name} 획득 (이 방 1회)`;}
  if(e.type==='turret'&&(inventory.tonic||0)<ITEMS.tonic.max){
   const result=turretPotionDrop(turretPotionDry,rng);turretPotionDry=result.dryKills;
   if(result.drop&&addItem(inventory,'tonic',1)){itemBarKey='';vfx.pulse(e.g.position,'seed',1.25,.35);vfx.burst(e.g.position,'seed',18,1.15);audio.play('pickup');$('#toast').textContent=`포탑의 핵에서 ${ITEMS.tonic.name}을 찾았습니다 · 생명력 +${ITEMS.tonic.heal}`;}
  }
  releaseEnemy(e);return;
 }
 // A duo is one encounter: only the last standing warden grants the room reward.
 const wardenType=e.type==='warden'||e.type==='act2warden'||e.type==='act3warden',stageWarden=wardenType&&stage===4&&!inAustinRoom(),lastWarden=stageWarden&&!enemies.some(o=>o!==e&&(o.type==='warden'||o.type==='act2warden'||o.type==='act3warden')&&!o.dead&&!o.escort);
 // A boss falls over a short beat instead of vanishing, and the reward waits for it, so a choice screen never seems to erase the boss.
 const main=e.type==='austin'||e.type==='alwaysbeginner'||e.type==='tempestcarrier'||(stageWarden?lastWarden:!e.elite);fallen.push({e,t:0,hold:main});
 cameraShake=Math.max(cameraShake,main?.4:.22);vfx.pulse(e.g.position,'amber',main?3.2:2,.6);vfx.burst(e.g.position,'amber',main?40:24,2);audio.play('bossDefeat');
 // Austin carries the main item reward. Turrets can only yield the smaller healing potion.
 if(main){if(e.type==='austin'||e.type==='alwaysbeginner'||e.type==='tempestcarrier')relicRewardPending=true;invuln=Math.max(invuln,1.6);for(const p of enemyShots)release(p.ob);enemyShots=[];}
 if(e.type==='austin'){austinsDefeated++;if(developerRun){bossRewardLine='개발자 실험 · 보상 저장 안 됨';$('#toast').textContent=`${AUSTIN.name} 격파 · 개발자 실험 기록은 저장되지 않습니다`;}else{const firstTitle=!seedTitle.isUnlocked(),wallet=earnCoins(runStorage,200);recordJourneyBossTitle(e.type,austinsDefeated);const austinWins=readAccountProfile(runStorage).austinWins;const gardenGrowth=grantFinalBossGardenMemory(e.type);const got=austinDrops(rng,inventory).filter(id=>addItem(inventory,id,1)).map(id=>ITEMS[id].name),fruitReward=grantGoldenFruitPotion(gardenGrowth);itemBarKey='';bossRewardLine=`+200 JP · ${got.length?got.join(' · ')+' 가방 저장':'물약 가방이 가득 참'}${fruitReward?` · ${fruitReward}`:''}`;$('#toast').textContent=`${AUSTIN.name} 격파! · +200 JP (보유 ${wallet.coins} JP) · ${got.length?got.join(' · ')+' 획득':'물약 가방이 가득 찼습니다'} · ${gardenGrowth.line}${fruitReward?` · ${fruitReward}`:''}${firstTitle?` · 칭호 '${AUSTIN_TITLE}' (${AUSTIN_TITLE_PERK.text})`:''}${austinWins===10?` · 칭호 '${AUSTIN_VETERAN_TITLE}' (이동 속도 +5%)`:''}`;}}
 else if(e.type==='alwaysbeginner'){austinsDefeated++;if(developerRun){bossRewardLine='개발자 실험 · 보상 저장 안 됨';$('#toast').textContent=`${ALWAYS_BEGINNER.name} 격파 · 개발자 실험 기록은 저장되지 않습니다`;}else{const firstTitle=!seedTitle.isAlwaysBeginnerUnlocked(),wallet=earnCoins(runStorage,300);recordJourneyBossTitle(e.type,austinsDefeated);const alwaysWins=readAccountProfile(runStorage).alwaysWins;const gardenGrowth=grantFinalBossGardenMemory(e.type);const got=austinDrops(rng,inventory).filter(id=>addItem(inventory,id,1)).map(id=>ITEMS[id].name),fruitReward=grantGoldenFruitPotion(gardenGrowth);itemBarKey='';bossRewardLine=`+300 JP · ${got.length?got.join(' · ')+' 가방 저장':'물약 가방이 가득 참'}${fruitReward?` · ${fruitReward}`:''}`;$('#toast').textContent=`${ALWAYS_BEGINNER.name} 격파! · +300 JP (보유 ${wallet.coins} JP) · ${got.length?got.join(' · ')+' 획득':'물약 가방이 가득 찼습니다'} · ${gardenGrowth.line}${fruitReward?` · ${fruitReward}`:''} · 2막 기록${firstTitle?` · 칭호 '${ALWAYS_BEGINNER_TITLE}' (${ALWAYS_BEGINNER_TITLE_PERK.text})`:''}${alwaysWins===10?` · 칭호 '${ALWAYS_VETERAN_TITLE}' (최대 생명력 +10)`:''}`;}}
 else if(e.type==='tempestcarrier'){austinsDefeated++;if(developerRun){bossRewardLine='3막 시제품 · 보상 저장 안 됨';$('#toast').textContent=`${TEMPEST_CARRIER.name} 격파 · 3막 시제품 기록은 저장되지 않습니다`;}else{const firstTitle=!seedTitle.isJohanUnlocked(),wallet=earnCoins(runStorage,400);recordJourneyBossTitle(e.type,austinsDefeated);const johanWins=readAccountProfile(runStorage).johanWins;const gardenGrowth=grantFinalBossGardenMemory(e.type);const got=austinDrops(rng,inventory).filter(id=>addItem(inventory,id,1)).map(id=>ITEMS[id].name),fruitReward=grantGoldenFruitPotion(gardenGrowth);itemBarKey='';bossRewardLine=`+400 JP · ${got.length?got.join(' · ')+' 가방 저장':'물약 가방이 가득 참'}${fruitReward?` · ${fruitReward}`:''}`;$('#toast').textContent=`${TEMPEST_CARRIER.name} 격파! · +400 JP (보유 ${wallet.coins} JP) · ${got.length?got.join(' · ')+' 획득':'물약 가방이 가득 찼습니다'} · ${gardenGrowth.line}${fruitReward?` · ${fruitReward}`:''}${firstTitle?` · 칭호 '${JOHAN_TITLE}' (순환 +2%)`:''}${johanWins===10?` · 칭호 '${JOHAN_VETERAN_TITLE}' (순환 +3%)`:''}`;}}
 else if(main){wardensDefeated++;if(developerRun){$('#toast').textContent=`${e.config?.name||'문지기'} 격파 · 개발자 실험 기록은 저장되지 않습니다`;}else{remember('bosses','warden');const wallet=earnCoins(runStorage,50);if(!dashState.id)dashRewardPending=true;const relicFound=wardenRelicDrop(rng);if(relicFound)relicRewardPending=true;const bossSignal=act3BossAhead()?' · 폭풍 중심에서 거대한 기체음이 들립니다':act2BossAhead()?' · 관중석의 함성이 결승전을 부릅니다':austinAhead()?' · 무언가 째깍거리는 소리가 들립니다':'';$('#toast').textContent=`${e.config?.name||'문지기'} 격파! · +50 JP (보유 ${wallet.coins} JP)${wardensDefeated===1?' · 뿌리에 새로운 움직임이 깨어납니다':bossSignal}${relicFound?' · 희귀 유물 발견!':''}`;}}
 else $('#toast').textContent=stageWarden?'쌍문지기 한 명 격파 · 남은 문지기를 쓰러뜨리세요':'정예 문지기 격파!';
}
function updateFallen(dt,time){for(let i=fallen.length-1;i>=0;i--){const f=fallen[i],e=f.e;f.t+=dt;const k=Math.min(1,f.t/1.3);e.hit=Math.floor(f.t*14)%2?.14:0;e.updateArt?.(time);e.g.position.y=-k*k*1.1;e.g.scale.setScalar(1-k*.3);if(Math.floor(f.t/.18)!==Math.floor((f.t-dt)/.18))vfx.burst(e.g.position,'amber',10,1.2);if(f.t>=1.3){releaseEnemy(e);fallen.splice(i,1);}}}
function austinBolt(pos,dir,spec){const ob=new THREE.Object3D();ob.position.set(pos.x+dir.x*1.3,.65,pos.z+dir.z*1.3);enemyShots.push({boss:true,spriteKey:'austin',ob,dir:dir.clone(),life:4,bounces:0,speed:spec.speed,damage:spec.damage,age:0,origin:pos.clone(),pierce:true});}
function stadiumBolt(pos,dir,spec){const ob=new THREE.Object3D();ob.position.set(pos.x+dir.x*1.05,.65,pos.z+dir.z*1.05);enemyShots.push({boss:Boolean(spec.boss),spriteKey:'baseball',ob,dir:dir.clone(),life:spec.life||4.8,bounces:enemyBounces(spec.bounces),speed:spec.speed,damage:spec.damage,curve:spec.curve||0,age:0,origin:pos.clone(),pierce:Boolean(spec.pierce)});}
function skywayBolt(pos,dir,spec){const cap=qualityLevel===0?act3RoomPressure(stage).projectileCapLow:act3RoomPressure(stage).projectileCapNormal;if(enemyShots.length>=cap)return;const boss=Boolean(spec.boss),ob=new THREE.Object3D();ob.position.set(pos.x+dir.x*1.05,.72,pos.z+dir.z*1.05);enemyShots.push({skyway:true,boss,spriteKey:'storm',visualScale:spec.scale||1,ob,dir:dir.clone(),life:spec.life||4.8,bounces:0,speed:spec.speed,damage:spec.damage,curve:spec.curve||0,age:0,origin:pos.clone(),pierce:Boolean(spec.pierce)});}
// ---------------- active (F) ----------------
function useActive(){
 if(mode!=='playing'||paused)return;
 const plan=startActive(activeGauge,heldForms);
 if(!plan){const s=activeState(heldForms);$('#toast').textContent=s.state==='LOCKED'?'궁극기는 1차 융합이나 단독 진화를 얻으면 열립니다':activeGauge.plan?'궁극기가 이미 발동 중입니다':activeGauge.cooldown>0?`궁극기 안정화 중 · ${Math.ceil(activeGauge.cooldown)}초`:`궁극기 게이지 ${Math.floor(activeGauge.value)}/${ACTIVE.max} · 적을 처치해 채우세요`;return;}
 const aim=cachedTarget&&!cachedTarget.dead?cachedTarget.g.position.clone().sub(player.position).setY(0).normalize():lastMove.clone();
 for(const id of plan.forms)for(const combat of combatsOf(id))combat.surge(plan.seconds,{aim});
 activeVfx.start(plan,player.position);announceActive($('#active-cinematic'),plan);perf.event(PE.activeSkill);if(plan.state==='OVERDRIVE')perf.event(PE.ultimate);
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
 if(done){for(const id of done.forms)for(const combat of combatsOf(id))combat.calm();activeVfx.finish(done,player.position);announceFinale($('#active-cinematic'),done);if(done.finale){audio.play('finale');if(!roomCleared){const echoRelic=relics.equipped==='echo'&&done.state==='OVERDRIVE';overdriveBlast(done.finale,done.finale.radius,done.finale.damage*(echoRelic?.8:1),true);if(echoRelic)finaleEchoes.push({t:.45,finale:done.finale,radius:done.finale.radius*.85,damage:done.finale.damage*.35});}}}
 for(let i=finaleEchoes.length-1;i>=0;i--){const echo=finaleEchoes[i];echo.t-=dt;if(echo.t>0)continue;finaleEchoes.splice(i,1);if(!roomCleared)overdriveBlast(echo.finale,echo.radius,echo.damage,false);}
}
// The overdrive's closing blast: the union of both evolutions' law tags decides what it does (see actives.js overdriveFinale).
function overdriveBlast(f,radius,damage,first){
 const center=player.position.clone().setY(0),scale=damageScale(levels,bankedUpgrades)*runPowerScale(runBonuses)*gardenPower(),flatDistance=e=>Math.hypot(e.g.position.x-center.x,e.g.position.z-center.z);
 if(expansionTerrain){for(let h=0;h<f.hits;h++)expansionTerrain.area(center,radius,damage*scale*(h?.5:1),f.tags?.includes('EXPLOSION')?'burst':null);expansionTerrainDirty=true;}
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
const CHOICE_GROUPS=['[data-choice]','[data-form]','[data-second]','[data-solo]','[data-awaken]','[data-dash-evolution]','[data-relic]','[data-keep],[data-replace]'];
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
 if(exitOpen){if(stage===4)saveAfterBoss();else saveBoundary(stage+1);}if(survivalSession)saveSurvival();
}
function projectile(pos,dir,fragment=false,ignoreEnemy=null){if(survivalSession&&shots.length>=MAX_SHOTS)return null;const tint=fragment?'split':([...chosen][0]||'seed'),critChance=totalCritChance(),critical=critChance>0&&rng()<critChance,k=projectileVisualScale(fragment,critical),ob=new THREE.Object3D();ob.position.set(pos.x,.67,pos.z);ob.rotation.y=Math.atan2(dir.x,dir.z);applyProjectileTheme(ob,tint,combatTheme,0,k);const dashStrike=!fragment&&relics.equipped==='stride'&&dashRelicReady;if(dashStrike)dashRelicReady=false;const shot={ob,dir:dir.clone(),life:2.3,bounces:0,fragment,ignoreEnemy,tint,critical,visualScale:k,age:0,returning:false,hitSet:new Set(),hits:0,trailTime:0,trailPos:ob.position.clone(),dashStrike,relicBounce:false};shots.push(shot);perf.event(PE.shot);return shot;}
function hitPlayer(amount){if(labSafe||invuln>0||shellTime>0||mode!=='playing')return;amount*=difficulty(cycle,region).damage;const before=hp;hp=Math.max(0,hp-amount);runDamageTaken+=before-hp;invuln=.65;burst(player.position,'amber',16);cameraShake=.18;audio.play('hurt');
 if(hp<=0){
  if(survivalSession){finishSurvival(false);return;}
  if(mirrorSession){const report=finishRoomAnalysis(false,false);showMirrorTrialResult(false,report);return;}
  // A sprout stands the seed back up once, with a moment to breathe and no shots already in the air.
  const revive=tryRevive(inventory);
  if(revive){hp=revive.hp;invuln=Math.max(invuln,revive.guard);for(const p of enemyShots)release(p.ob);enemyShots=[];itemBarKey='';cameraShake=.32;vfx.pulse(player.position,'seed',2.8,.8);vfx.burst(player.position,'seed',44,2.2);$('#toast').textContent=`${ITEMS.sprout.name}이 돋았다 · 생명력 ${revive.hp}으로 다시 일어났습니다`;return;}
  const deathReport=finishRoomAnalysis(false,false);
  if(expansionJourney){const ended=finishExpansionEntry();showExpansionResult(false,ended);return;}
  if(!developerRun&&protectJourneyBossReceipts())clearCheckpoint(actStore());mode='dead';showEnd(deathReport);
 }
}
let cameraShake=0;const aimRing=ring(scene,.22,0xa4f8db);aimRing.material.opacity=.5;aimRing.visible=false;
function collide(pos,r=.4,previous=pos){if(expansionJourney?.act==='crosswind'&&(expansionJourney.phase==='boss'||pos===player.position)){pos.x=Math.max(expansionJourney.phase==='boss'?expansionJourney.course.distance-13:0,Math.min(arena.halfWidth-r,pos.x));}constrainToArena(pos,r,arena);if(expansionTerrain)expansionTerrain.constrain(pos,r,previous);for(let o of obstacles){let dx=pos.x-o.x,dz=pos.z-o.z,wx=o.w/2+r,wz=o.d/2+r;if(Math.abs(dx)<wx&&Math.abs(dz)<wz){if(wx-Math.abs(dx)<wz-Math.abs(dz))pos.x=o.x+Math.sign(dx||1)*wx;else pos.z=o.z+Math.sign(dz||1)*wz;}}constrainToArena(pos,r,arena);}
function runBonusCard(id){const bonus=RUN_BONUSES[id],level=id==='heal'?0:runBonuses[id]||0,step=id==='shot'?4:3,next=id==='heal'?`현재 생명력 ${Math.ceil(hp)} / ${Math.ceil(maxPlayerHp())}`:`누적 ${level*step}% → ${(level+1)*step}% · 최대 5단계`;return `<button class="run-bonus-card" data-run-bonus="${id}" style="--bonus-color:${bonus.color}"><span aria-hidden="true">${bonus.icon}</span><div><small>★ 희귀 보너스</small><strong>${bonus.name}</strong><p>${bonus.desc} · ${next}</p></div></button>`;}
function cardChoice(mid=false,fixedOffer=null){
 touch.reset();keys.clear();keyboardDash=false;mode='cards';
 $('#overlay').classList.remove('intro','menu-screen','developer-mode','garden-mode','ranking-overlay');
 const guide=guideTarget&&profile.forms.includes(guideTarget)?FORMS[guideTarget].requires.find(id=>!levels.has(id)):null;
 const readyFusions=eligibleForms(chosen).filter(canTakeEvolution).map(f=>f.id);
 let offered=fixedOffer||offerChoices(levels,mirrorSession?{forms:heldForms,fusions:readyFusions}:{guide:guide||gardenGuideLaw(),forms:heldForms,weights:gardenFx.lawWeights,freshBonus:gardenFx.freshBonus,fusions:readyFusions});
 if(!fixedOffer)offered=withMutationOffer(offered,{levels,mutations,gardenLaws:gardenFx.mutationLaws,random:rng});
 // 단추로 먼저 합치고 돌아온 경우, 이미 합친 조합 카드는 뺀다(눌러도 아무 일 없는 카드가 남지 않게).
 if(fixedOffer)offered=offered.filter(id=>{const uid=offeredFusion(id);return !uid||canFuse(levels,uid);});
 if(!offered.length){mode='playing';if(survivalSession){survivalPendingChoice=null;saveSurvival();}if(roomCleared){if(mirrorSession)advanceMirrorFloor();else openExit();}return;}
 if(runBonusOffer===null)runBonusOffer=mirrorSession?[]:rareRunBonusOffers(runBonuses,{hp,maxHp:maxPlayerHp(),choicesTaken,random:rng,chance:rareRunBonusChance(Boolean(bossPet.id))});
 const smallGrowth=runBonusOffer;if(survivalSession)survivalPendingChoice=[...offered];
 $('#overlay').hidden=false;$('#overlay').innerHTML=`<p>${mirrorSession?`거울의 탑 ${mirrorSession.floor}층 돌파 · 분신도 같은 선택을 얻습니다`:mid?(survivalSession&&!kills?'생존전 출발':'처치 게이지 가득'):inAustinRoom()?'오스틴 격파 보상':'문지기 격파 보상'} · 슬롯 ${slotsUsed(levels,heldForms)}/${SLOT_CAP}</p><h2>${offered.some(id=>offeredFusion(id))?'합칠까, 더 깊게 갈까'
   :slotsUsed(levels,heldForms)>=SLOT_CAP?'법칙을 더 깊게':(chosen.size||heldForms.size)?'어떤 씨앗으로 자랄까요':'첫 법칙이 깨어납니다'}</h2><p>${slotsUsed(levels,heldForms)>=SLOT_CAP?'슬롯이 가득 찼습니다 · 합치면 칸이 비고, 합치지 않으면 끝없이 강화합니다':'슬롯 '+SLOT_CAP+'개를 채운 뒤에는 강화만 합니다'} · 다음 선택까지 ${choiceGoal()} 처치</p><div class="build-preview">${[...chosen].map(id=>`<span class="build-law">${lawArt(id)}${LAWS[id].name} Lv.${levelOf(levels,id)}</span>`).concat([...heldForms].map(([f,l])=>`<span class="build-law build-form">${formArt(f)}${FORMS[f].name} Lv.${l}</span>`)).join('<span class="build-link">◇</span>')||'아직 이름 없는 시드'}</div><div class="cards">${offered.map(id=>{const mut=parseMutationChoice(id);if(mut)return `<button class="card mutation-card" data-choice="${id}" style="--law-color:#${LAWS[mut.law].color.toString(16).padStart(6,'0')}">${lawArt(mut.law,'card-art')}<em class="mut-badge">${mut.badge}</em><strong>${mut.name}</strong><p>${mut.lawName} 변이 · ${mut.kindName}</p><small>${mut.desc}</small><span class="synergy">법칙은 그대로, 성격만 바뀝니다</span></button>`;const uid=offeredFusion(id);if(uid){const f=FORMS[uid],lv=fusionLevel(levels,uid),parts=f.requires.map(law=>LAWS[law].name+' Lv.'+levelOf(levels,law)).join(' + ');return `<button class="card fusion-card" data-choice="${id}" style="--law-color:#9ce8b0">${formArt(uid,'card-art')}<strong>${f.name} Lv.${lv}</strong><p>조합</p><small>${parts} → 한 칸</small><span class="synergy">${f.strength} · 칸이 하나 비어 새 법칙이 다시 나옵니다</span></button>`;}const fid=offeredForm(id);if(fid){const f=FORMS[fid],lv=heldForms.get(fid);return `<button class="card form-upgrade" data-choice="${id}" style="--law-color:#e8c26a">${formArt(fid,'card-art')}<strong>${f.name} Lv.${lv+1}</strong><p>진화 강화</p><small>${formUpgradeLine(fid,lv)}</small><span class="synergy">${f.strength}</span></button>`;}const held=chosen.has(id),v=LAWS[id];return `<button class="card" data-choice="${id}" style="--law-color:#${v.color.toString(16).padStart(6,'0')}">${lawArt(id,'card-art')}<strong>${v.name} Lv.${held?levelOf(levels,id)+1:1}</strong><p>${held?'강화 Lv.'+levelOf(levels,id)+' → '+(levelOf(levels,id)+1):'새로운 법칙'}</p><small>${held?upgradeLine(levels,id)+' · 모든 탄 피해 +10%':v.desc}</small><span class="synergy">${formLawHint(id,chosen)||synergyHint(id,[...chosen])}</span></button>`;}).join('')}</div>${smallGrowth.length?`<div class="run-bonus-choice"><small>★ 희귀 보너스 등장! 하나를 받고, 법칙도 이어서 고릅니다</small><div>${smallGrowth.map(runBonusCard).join('')}</div></div>`:''}`;
 // 칸이 차면 새 법칙이 나오지 않으니, 못 얻을 법칙을 가리키는 대신 지금 합칠 수 있는 것을 알려 준다.
 const goals=slotsUsed(levels,heldForms)>=SLOT_CAP&&readyFusions.length
  ?'지금 합칠 수 있어요: '+readyFusions.slice(0,3).map(id=>FORMS[id].name).join(' · ')
   :Object.values(FIRST_FORMS).filter(f=>f.requires.filter(id=>levels.has(id)).length===1).slice(0,4).map(f=>`${f.name}까지 ${LAWS[f.requires.find(id=>!levels.has(id))].name}`).join(' · ');
 $('#overlay').insertAdjacentHTML('beforeend',`<div class="form-progress">${heldForms.size?'보유 진화: '+[...heldForms].map(([f,l])=>FORMS[f].name+' Lv.'+l).join(', ')+' · ':''}${goals||'법칙 두 개를 맞추면 1차 융합 · 발견 '+profile.forms.filter(id=>DISCOVERY_FORMS[id]).length+'/'+Object.keys(DISCOVERY_FORMS).length}${orbitCore(heldForms,FORMS)?' · 공전 진화는 한 종류만 보유 가능':''}</div><div class="form-actions">${rerollUnlocked(profile)&&!rerollUsed?'<button class="primary" id="reroll-laws">선택지 새로고침 · 이번 여정 1회</button>':''}${eligibleForms(chosen).filter(canTakeEvolution).length?'<button class="primary" id="change-form">합칠 수 있는 진화 보기</button>':''}${secondFusionOptions(heldForms).length?'<button class="primary" id="change-second">재융합 보기</button>':''}${soloReady(levels).filter(canTakeEvolution).length?'<button class="primary" id="change-solo">단독 진화 보기</button>':''}${awakenOptions(heldForms).filter(awakenable).length?'<button class="primary" id="change-awaken">각성 진화 보기</button>':''}</div>`);
 if($('#reroll-laws'))$('#reroll-laws').onclick=()=>{if(mode!=='cards'||rerollUsed)return;rerollUsed=true;const checkpoint=survivalSession||developerRun||expansionJourney?null:readCheckpoint(actStore());if(checkpoint)writeCheckpoint(actStore(),{...checkpoint,rerollUsed:true});cardChoice(mid);};
 if($('#change-form'))$('#change-form').onclick=()=>offerForm(true,()=>cardChoice(mid,offered));
 if($('#change-second'))$('#change-second').onclick=()=>offerSecondFusion(()=>cardChoice(mid,offered),true);
 if($('#change-solo'))$('#change-solo').onclick=()=>offerSolo(()=>cardChoice(mid,offered),true);
 if($('#change-awaken'))$('#change-awaken').onclick=()=>offerAwaken(()=>cardChoice(mid,offered),true);
  document.querySelectorAll('[data-run-bonus]').forEach(button=>button.onclick=()=>{if(mode!=='cards')return;const id=button.dataset.runBonus,result=applyRunBonus(runBonuses,id,{hp,maxHp:maxPlayerHp()});if(!result.ok)return;runBonuses=result.state;hp=result.hp;runBonusOffer=[];const bonus=RUN_BONUSES[id];vfx.pulse(player.position,id==='heal'?'seed':id==='move'?'orbit':id==='shot'?'split':'burst',1.7,.45);vfx.burst(player.position,id==='heal'?'seed':id==='move'?'orbit':id==='shot'?'split':'burst',20,1.35);audio.play('pickup');const bonusChoice=button.closest('.run-bonus-choice');bonusChoice.classList.add('received');bonusChoice.innerHTML='<small>✓ 희귀 보너스를 받았어요 · 이제 법칙을 하나 더 고르세요</small>';$('#toast').textContent=id==='heal'?`${bonus.name} · 생명력 +${displayHp(result.healed)} · 법칙도 고르세요`:`${bonus.name} · ${result.level}/5단계 · 법칙도 고르세요`;});
 document.querySelectorAll('[data-choice]').forEach(button=>button.onclick=()=>{if(mode!=='cards')return;const id=button.dataset.choice;if(survivalSession)survivalPendingChoice=null;
  const mut=parseMutationChoice(id);
  if(mut){if(!applyMutation(mutations,mut.id))return;syncLaws();updateFormLabel();vfx.evolution(player.position,mut.law);finishChoice();$('#toast').textContent=`${mut.badge} ${mut.name} · ${mut.desc}`;return;}
  const fuseId=offeredFusion(id);
   if(fuseId){if(!bankAndFuse(fuseId))return;remember('forms',fuseId);syncLaws();syncForms();growth.select(effectiveLaws(),mutated);vfx.evolution(player.position,FORMS[fuseId].requires[0]);audio.play('fusion');if(!offerSecondFusion())finishChoice();$('#toast').textContent=`${FORMS[fuseId].name} Lv.${heldForms.get(fuseId)} · 두 법칙이 한 칸으로 합쳐졌습니다`;return;}
  if(!chooseLaw(levels,id,heldForms))return;syncLaws();const fid=offeredForm(id);if(fid){syncForms();vfx.evolution(player.position,FORMS[fid].requires[0]);finishChoice();$('#toast').textContent=`${FORMS[fid].name} Lv.${heldForms.get(fid)}`;return;}beginEvolution(id);});
 if(survivalSession)saveSurvival();
}

function updateFormLabel(){const core=orbitCore(heldForms,FORMS);$('#form-label').textContent=[...[...heldForms].map(([f,l])=>FORMS[f].name+' Lv.'+l+(isOrbitEvolution(f)&&f!==core?' (바깥 고리)':'')),...[...chosen].map(id=>LAW_PRESENTATION[id].name+' Lv.'+levelOf(levels,id)+(mutationLabel(mutations,id)?' '+mutationLabel(mutations,id):''))].join(' · ')||'아직 이름 없는 씨드';}
function beginEvolution(id){
  syncForms(true);
  touch.reset();mode='evolving';evolutionTime=0;keyboardDash=false;keys.clear();player.userData.dashTime=0;player.visible=true;playerMotion.reset();
  for(const p of [...shots,...enemyShots,...effects])release(p.ob);shots=[];enemyShots=[];effects=[];
  $('#overlay').hidden=true;$('#evolution').hidden=false;
  $('#evolution-title').textContent=LAW_PRESENTATION[id].name+' Lv.'+levelOf(levels,id);
  $('#evolution-hint').textContent=LAW_PRESENTATION[id].hint;
  growth.select(effectiveLaws(),mutated);updateFormLabel();vfx.clear();vfx.evolution(player.position,id);audio.play('evolve');
}
function showMirrorTrialResult(won,report=null){
 const floor=mirrorSession?.floor||1,perfect=mirrorSession?.perfectDodges||0,publicRun=Boolean(mirrorSession?.publicRun),record=publicRun?recordMirrorResult(runStorage,{floor,won,perfectDodges:perfect}):readMirrorRecord(runStorage),shownFloor=publicRun?(record.bestFloor||floor):floor;if(won&&publicRun)clearMirrorCheckpoint(runStorage);const checkpoint=publicRun&&!won?readMirrorCheckpoint(runStorage):null;mode='mirror-result';paused=false;touch.reset();keys.clear();mirrorReadyRing.visible=false;for(const p of enemyShots)release(p.ob);enemyShots=[];$('#boss-hud').hidden=true;$('#overlay').hidden=false;$('#overlay').classList.add('intro','menu-screen');$('#overlay').classList.toggle('developer-mode',!publicRun);
 $('#overlay').innerHTML=`<div class="menu-panel developer-panel"><p class="eyebrow">SEED · MIRROR TOWER</p><h2>${won?'거울의 탑 100층 돌파':'거울에 잠든 씨앗'}</h2><p>${won?'같은 선택을 나눈 마지막 분신을 이겼습니다.':`${floor}층에서 시련이 끝났습니다.`}</p><div class="final-score"><small>${publicRun?'나의 최고 기록':'개발자 검사 기록'}</small><strong>${shownFloor}층</strong><span>이번 도전 완벽 회피 ${perfect}회${publicRun&&record.clears?` · 완주 ${record.clears}회`:''}</span></div>${report?combatAnalysisSummary(report):''}<div class="developer-footer">${checkpoint?`<button id="mirror-resume">${checkpoint.floor}층부터 다시</button>`:''}<button class="primary" id="mirror-retry">1층부터 다시</button><button id="mirror-end">던전으로</button></div></div>`;
 if(checkpoint)$('#mirror-resume').onclick=()=>startMirrorTower({publicRun,checkpoint});$('#mirror-retry').onclick=()=>startMirrorTower({publicRun});$('#mirror-end').onclick=showDungeon;
}
function advanceMirrorFloor(){
 if(!mirrorSession)return;if(mirrorSession.floor>=MIRROR_TRIAL_PROTOTYPE.localSliceFloors){showMirrorTrialResult(true,lastRoomAnalysis);return;}
 const rules=mirrorFloorRules(mirrorSession.floor),heal=Math.round(maxPlayerHp()*rules.healAfter);mirrorSession.floor++;mirrorSession.cracks=0;hp=Math.min(maxPlayerHp(),hp+heal);roomCleared=false;invuln=1;shootCD=0;if(mirrorSession.publicRun&&mirrorSession.floor%10===1)writeMirrorCheckpoint(runStorage,{floor:mirrorSession.floor,hp,levels:levelsToSave(levels),forms:Object.fromEntries(heldForms),rules:[...chosen],mutated:[...mutated],dashEvolution:dashState.id,banked:bankedUpgrades,choicesTaken,choiceKills,kills,elapsed,perfectDodges:mirrorSession.perfectDodges});wave();$('#toast').textContent=`${mirrorSession.floor}층 · 생명력 +${heal} · 분신도 방금 선택을 얻었습니다${mirrorSession.publicRun&&mirrorSession.floor%10===1?' · 기록 저장':''}`;
}
function startMirrorTower({publicRun=true,floor=1,checkpoint=null}={}){
 // Mirror challenges must not consume shop carry items or overwrite an active
 // journey checkpoint, so they use the isolated-run path even when public.
 developerRun=true;labSafe=false;startRegion='garden';const resume=publicRun?checkpoint:null;mirrorSession={floor:resume?.floor||(publicRun?1:Math.max(1,Math.min(100,Math.floor(Number(floor)||1)))),cracks:0,perfectDodges:resume?.perfectDodges||0,enemy:null,publicRun};restart(resume?{version:1,region:'garden',stage:0,mode:'entry',hp:resume.hp,rules:resume.rules,mutated:resume.mutated,levels:resume.levels,forms:resume.forms,dashEvolution:resume.dashEvolution,banked:resume.banked,choicesTaken:resume.choicesTaken,choiceKills:resume.choiceKills,kills:resume.kills,elapsed:resume.elapsed}:null);
}
function startGame(){if(gameplayPaused()){showSeasonPause();return;}if(mode==='ready'&&!maintenanceOn){mirrorSession=null;restart();}}
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
function showBetaLock(){
 revealApp();
 mode='beta-lock';touch.reset();keys.clear();$('#overlay').classList.remove('ranking-overlay','garden-mode');$('#overlay').classList.add('intro','menu-screen');$('#overlay').hidden=false;
 const user=account.user(),linked=user&&!user.isAnonymous&&user.email;
 const accountHint=linked
  ?`<div class="account-status beta-account"><strong>${escapeHtml(user.email)}</strong><span>${adminMode?'관리자 계정 확인 완료':betaTesterMode?'베타테스터 계정 확인 완료':'등록된 베타테스터 계정이 아니에요. 다른 계정으로 바꿔 주세요.'}</span></div>`
  :'';
 $('#overlay').innerHTML=`<div class="menu-panel beta-lock-panel"><p class="eyebrow">SEED · CLOSED BETA</p><div class="account-mark">♧</div><h2>${BETA_NOTICE.title}</h2><p class="account-copy">${BETA_NOTICE.body}</p>
  ${accountHint}<button id="beta-admin" class="account-button beta-admin-entry"><b>✦</b><span><strong>${linked?'다른 Google 계정으로 바꾸기':'베타테스터·개발자 로그인'}</strong><small>${linked?'현재 계정에서 로그아웃한 뒤 계정을 다시 선택합니다':'등록된 Google 계정으로 PC 웹 플레이'}</small></span></button>
  <div class="beta-test-path"><strong>이미 등록된 테스터인가요?</strong><span>테스트에 등록된 Google 계정으로 열어야 설치할 수 있어요.</span><a class="account-button beta-install" href="${BETA_TEST_URL}" target="_blank" rel="noopener"><span><b>Google Play 테스트 참여·설치</b><small>공식 비공개 테스트 링크</small></span></a></div>
  <p class="account-note">${BETA_NOTICE.detail} <a href="${import.meta.env.BASE_URL}privacy.html" target="_blank" rel="noopener">개인정보 처리방침</a></p>
  <a class="menu-item small-item" href="https://kukuma1004.github.io/jpmath-lab/games/"><strong>게임 소식으로 돌아가기</strong></a></div>`;
 $('#beta-admin').onclick=async()=>{if(linked){const saved=await cloud.syncNow();if(!saved.ok){showAccount('이 기기의 기록을 아직 저장하지 못했어요. 인터넷 연결을 확인한 뒤 계정을 바꿔 주세요.');return;}await account.signOut();cloud.signOutCleanup();}showAccount();};
}
// A tab can stay open for hours without reloading. Recheck the live gate while it
// is running so an already-open game cannot keep playing after the web closes.
// Native closed-beta builds and the administrator account remain available.
async function enforceCurrentWebAccess(){
 if(account.native||import.meta.env.DEV)return false;
 if(webAccessCheck)return webAccessCheck;
 webAccessCheck=(async()=>{
  seasonStatus=await loadSeasonStatus({enabled:true,fallback:seasonStatus});
  await refreshAccessMode();
  if(adminMode||betaTesterMode){
   // A tester can be added while this installed/web tab is already showing the
   // closed-beta gate. Permission was refreshed correctly, but the old gate
   // stayed on screen until another manual navigation. Leave it immediately.
   if(mode==='beta-lock'||mode==='season-pause')showEntry();
   return false;
  }
  const betaLocked=publicWebBetaLocked(),seasonPaused=gameplayPaused();
  if(!betaLocked&&!seasonPaused){
   if(mode==='season-pause'||mode==='beta-lock')showEntry();
   return false;
  }
  if(mode==='defense')defenseScreen?.close();
  if(mode==='adventure')adventureScreen?.close();
  saveLeaveState();cloud.syncNow().catch(()=>null);touch.reset();keys.clear();audio.setPaused(true);
  if(betaLocked){if(mode!=='beta-lock')showBetaLock();}
  else if(mode!=='season-pause')showSeasonPause();
  return true;
 })().finally(()=>{webAccessCheck=null;});
 return webAccessCheck;
}
function showEntry(){
 revealApp();
 void nativeUpdate.check();
 if(publicWebBetaLocked()&&!adminMode&&!betaTesterMode){showBetaLock();return;}
 if(gameplayPaused()){showSeasonPause();return;}
 if(localAdminLab||account.user())showIntro();else showAccount();
}
function showSeasonPause(){
 revealApp();mode='season-pause';touch.reset();keys.clear();$('#overlay').classList.remove('ranking-overlay','garden-mode');$('#overlay').classList.add('intro','menu-screen');$('#overlay').hidden=false;
 const user=account.user(),accountLine=user&&!user.isAnonymous?`현재 계정 · ${escapeHtml(account.label())}`:'관리자만 계정 로그인 후 플레이할 수 있어요';
 $('#overlay').innerHTML=`<div class="menu-panel season-pause-panel"><p class="eyebrow">SEED · ${escapeHtml(SEASON.name)}</p><div class="season-seal" aria-hidden="true">♧</div><h2>${escapeHtml(seasonStatus.title)}</h2><p class="season-pause-copy">${escapeHtml(seasonStatus.body)}</p><div class="season-pause-status"><strong>플레이 일시 중지</strong><span>${escapeHtml(seasonStatus.detail)}</span></div><div class="menu-list"><button id="season-ranking" class="primary menu-item"><strong>${SEASON.name} 명예의 전당</strong><small>오스틴 · 항상초심 · 요한 기록</small></button><button id="season-account" class="menu-item"><strong>관리자 로그인</strong><small>${accountLine}</small></button><a class="menu-item small-item" href="https://kukuma1004.github.io/jpmath-lab/games/"><strong>게임 소식으로 돌아가기</strong></a></div><p class="account-note">각자의 저장 데이터는 그대로 남아 있습니다.</p></div>`;
 $('#season-ranking').onclick=()=>showRanking('online');$('#season-account').onclick=()=>showAccount();
}
// 프로필 '내 능력치'(2026-09-22 사용자: 도감을 채우면 모든 능력이 오른다는데 뭐가 오르는지 모르겠다).
// 정원 숙련·도감 칭호(10개마다 0.5%, 30개마다 추가 0.5%)·칭호 보너스를 다섯 줄로 보여 준다.
function permanentStatsProfile(titleInfo){
 const pts=gardenStats()?.points||{},codex=titleInfo.codexBonus||0,clear=titleInfo.clearStatBonus||0,pct=v=>`${Math.round(v*1000)/10}%`;
 const row=(id,extra=[])=>{const garden=(pts[id]||0)*MASTERY_STEP,title=id==='move'?titleInfo.moveSpeedBonus||0:id==='cooldown'?titleInfo.cooldownBonus||0:id==='power'?titleInfo.powerBonus||0:id==='critical'?titleInfo.criticalBonus||0:0,total=garden+codex+clear+title,parts=[garden?`정원 ${pct(garden)}`:'',codex?`도감 ${pct(codex)}`:'',clear?`완주 ${pct(clear)}`:'',...extra].filter(Boolean);
  return `<li><b>${escapeHtml(MASTERY[id].name)}</b><em>${total?'+'+pct(total):'0%'}</em><small>${escapeHtml(MASTERY[id].desc)}${parts.length?' · '+parts.join(' · '):''}</small></li>`;};
 const moveTitle=titleInfo.moveSpeedBonus?[`칭호 이속 ${pct(titleInfo.moveSpeedBonus)}`]:[];
 const hpNow=Math.round(100*(1+(pts.maxHp||0)*MASTERY_STEP+codex+clear)+(titleInfo.maxHpBonus||0));
 const wins=readAccountProfile(runStorage);
 const expansionWins=[wins.crosswindWins?`횡풍의 수호자 ${wins.crosswindWins}/10`:'',wins.crystalWins?`수정의 정원사 ${wins.crystalWins}/10`:''].filter(Boolean).map(line=>' · '+line).join('');
 return `<section class="stat-profile"><div class="title-profile-head"><strong>내 능력치</strong><span>최대 생명력 ${hpNow}</span></div><ul>${row('power',titleInfo.powerBonus?[`칭호 공격력 ${pct(titleInfo.powerBonus)}`]:[])}${row('move',moveTitle)}${row('critical',titleInfo.criticalBonus?[`칭호 치명타 ${pct(titleInfo.criticalBonus)}p`]:[])}${row('cooldown',titleInfo.cooldownBonus?[`칭호 순환 ${pct(titleInfo.cooldownBonus)}`]:[])}${row('maxHp',titleInfo.maxHpBonus?[`칭호 +${titleInfo.maxHpBonus}`]:[])}</ul><small>누적 격파: 오스틴 ${wins.austinWins}/10 · 항상초심 ${wins.alwaysWins}/10 · 요한 ${wins.johanWins}/10${expansionWins}. 막별 완주는 모든 능력 +1%. 정원 숙련은 보스를 이길 때마다 0.1~0.3%씩, 도감은 10종마다 다섯 능력 +0.5%, 30종마다 추가 +0.5%(150종에서 최대 +10%). 거울의 탑에서는 적용되지 않아요.</small></section>`;
}
// The local top-20 board can contain other players. Recover only entries with
// this account's current nickname from a device already bound to the same UID.
function backfillPersonalBests(){
 const uid=account.user()?.uid,name=lastName(runStorage);
 if(!uid||!name||rawStorage.getItem(CLOUD_OWNER_KEY)!==uid)return false;
 const before=readAccountProfile(runStorage);let after=before;
 for(const [act,storage] of [['act1',runStorage],['act2',actStorage(runStorage,2)],['act3',act3Storage(runStorage)]]){
  const best=readRanking(storage).filter(entry=>entry.name===name).reduce((score,entry)=>Math.max(score,entry.score),0);
  after=recordBestScore(after,act,best);
 }
 if(['act1','act2','act3'].every(act=>after.bestScores[act]===before.bestScores[act]))return false;
 return writeAccountProfile(runStorage,after);
}
async function backfillBossVeterans(){
 if(localInspection||!account.user()?.uid||account.user().isAnonymous||!online.historicalBossWins)return;
 let changed=false;
 for(const [act,key,id,unlocked] of [[ACT.AUSTIN,'austinWins','austinveteran',()=>seedTitle.isAustinVeteranUnlocked()],[ACT.ALWAYS_BEGINNER,'alwaysWins','alwaysveteran',()=>seedTitle.isAlwaysVeteranUnlocked()],[ACT.JOHAN,'johanWins','johanveteran',()=>seedTitle.isJohanVeteranUnlocked()]]){
  if(unlocked())continue;
  try{
   const historic=await online.historicalBossWins(act,10),before=readAccountProfile(runStorage),total=Math.max(before[key],historic);
   if(total>before[key]){writeAccountProfile(runStorage,{...before,[key]:total});changed=true;}
   if(total>=10){remember('bosses',id);changed=true;}
  }catch{}
 }
 if(changed)void cloud.syncNow();
}
function showAccount(error=''){
 mode='ready';touch.reset();keys.clear();$('#overlay').classList.remove('ranking-overlay','garden-mode');$('#overlay').classList.add('intro','menu-screen');$('#overlay').hidden=false;
 const user=account.user(),linked=user&&!user.isAnonymous,appleOff=!account.appleConfigured,accountProfile=readAccountProfile(runStorage),badgeLine=accountBadgeLine(accountProfile),titleInfo=seedTitle.state();
 const knownForms=adminMode?Object.keys(DISCOVERY_FORMS).length:profile.forms.filter(id=>DISCOVERY_FORMS[id]).length;
 const permanentStats=[titleInfo.clearStatBonus?`완주: 모든 능력 +${Math.round(titleInfo.clearStatBonus*1000)/10}%`:'',titleInfo.moveSpeedBonus?`이속 +${Math.round(titleInfo.moveSpeedBonus*1000)/10}%`:'',titleInfo.maxHpBonus?`최대 HP +${titleInfo.maxHpBonus}`:'',titleInfo.cooldownBonus?`순환 +${Math.round(titleInfo.cooldownBonus*1000)/10}%`:'',titleInfo.powerBonus?`공격력 +${Math.round(titleInfo.powerBonus*1000)/10}%`:'',titleInfo.criticalBonus?`치명타 확률 +${Math.round(titleInfo.criticalBonus*1000)/10}%p`:''].filter(Boolean).join(' · ')||'보유 효과 없음';
 const personalBests=user?accountProfile.bestScores:{act1:readRanking(runStorage)[0]?.score||0,act2:readRanking(actStorage(runStorage,2))[0]?.score||0,act3:readRanking(act3Storage(runStorage))[0]?.score||0};
 const recordProfile=`<section class="account-records"><header><strong>막별 최고 기록</strong><button type="button" id="account-ranking">전체 보기</button></header><div><span><b>오스틴</b><em>${personalBests.act1?formatScore(personalBests.act1)+'점':'도전 전'}</em></span><span><b>항상초심</b><em>${personalBests.act2?formatScore(personalBests.act2)+'점':'도전 전'}</em></span><span><b>요한</b><em>${personalBests.act3?formatScore(personalBests.act3)+'점':'도전 전'}</em></span></div></section>`;
 const titleProfile=titleInfo.titles.length?`<section class="title-profile"><div class="title-profile-head"><strong>칭호</strong><span>영구 ${permanentStats}</span></div><div class="title-options">${titleInfo.titles.map(title=>`<button type="button" class="title-option ${title.id===titleInfo.equipped?'equipped':''}" data-equip-title="${escapeHtml(title.id)}" aria-pressed="${title.id===titleInfo.equipped}"><span><strong>${escapeHtml(title.name)}</strong><small>${escapeHtml(title.perk)}</small></span><em>${title.id===titleInfo.equipped?'장착 중':'장착'}</em></button>`).join('')}</div><small>장착은 씨앗 위 표시만 바꾸며, 획득한 업적 효과는 항상 유지됩니다.</small></section>`:`<section class="title-profile empty"><strong>칭호</strong><small>도감 ${CODEX.titleAt}개 발견이나 특별한 기록으로 칭호를 얻을 수 있어요.</small></section>`;
 const unlockedPets=new Set(unlockedBossPets(profile).map(pet=>pet.id)),equippedPet=readBossPet(runStorage,profile).id;
 const petOptions=Object.values(BOSS_PETS).map(pet=>{const unlocked=unlockedPets.has(pet.id);return `<button type="button" class="title-option ${equippedPet===pet.id?'equipped':''}" data-equip-pet="${pet.id}" aria-pressed="${equippedPet===pet.id}" ${unlocked?'':'disabled'}>${unlocked?`<img class="boss-pet-thumb" src="${import.meta.env.BASE_URL}assets/${pet.file}" alt="" loading="lazy">`:'<span class="boss-pet-thumb locked" aria-hidden="true">?</span>'}<span><strong>${unlocked?escapeHtml(pet.name):'???'}</strong><small>${escapeHtml(pet.boss)} ${unlocked?'격파 기념':'격파 후 해금'}</small></span><em>${equippedPet===pet.id?'동행 중':unlocked?'동행':'잠김'}</em></button>`;}).join('');
 const petProfile=`<section class="title-profile boss-pet-profile"><div class="title-profile-head"><strong>보스 동행</strong><span>${unlockedPets.size}/${Object.keys(BOSS_PETS).length} 발견</span></div><div class="title-options">${petOptions}</div>${equippedPet?'<button type="button" class="pet-unequip">동행 쉬기</button>':''}<small>함께 걷는 작은 기념 펫이에요.</small></section>`;
 $('#overlay').innerHTML=`<div class="menu-panel account-panel">${user||localInspection?'<button type="button" id="account-back" class="account-back" aria-label="프로필에서 돌아가기">‹ 돌아가기</button>':''}<p class="eyebrow">SEED · PROFILE & ACCOUNT</p><div class="account-mark">♧</div><h2>${linked?'나의 프로필':'어떻게 시작할까요'}</h2>
  <p class="account-copy">${linked?'이 계정으로 SEED의 기록을 이어갑니다.':'Google 또는 Apple 계정으로 시작할 수 있어요. 먼저 둘러보고 싶으면 게스트로 시작하세요.'}</p>
  ${user?`<div class="account-status"><strong>${escapeHtml(account.label())}</strong><span>${user.isAnonymous?'나중에 Google 또는 Apple 계정에 연결하면 현재 기록을 그대로 지킬 수 있어요.':'이 UID로 여러 기기의 기록을 이어갑니다.'}</span>${badgeLine?`<em class="account-badge">✦ ${escapeHtml(badgeLine)}</em>`:''}<small>UID ${escapeHtml(user.uid)}</small></div>`:''}
  <section class="profile-collection"><button type="button" id="profile-discoveries"><span class="profile-collection-icon" aria-hidden="true">✦</span><span><strong>진화 도감</strong><small>${adminMode?'관리자 공개 도감 · ':''}${knownForms}/${Object.keys(DISCOVERY_FORMS).length} 발견</small></span><em>›</em></button></section>
  ${recordProfile}
  ${permanentStatsProfile(titleInfo)}
  ${titleProfile}
  ${petProfile}
  <div class="account-buttons">
   ${!linked?`<button id="account-google" class="account-button google"><b>G</b><span><b>Google로 계속하기</b></span></button>
   <button id="account-apple" class="account-button apple" ${appleOff?'disabled':''}><b>●</b><span><b>Apple로 계속하기</b>${appleOff?'<small>iPhone 출시 준비 중</small>':''}</span></button>`:''}
   ${!user&&!gameplayPaused()?'<button id="account-guest" class="account-button"><span><b>게스트로 시작</b><small>익명 UID에 진행을 저장합니다</small></span></button>':''}
   ${user?`<button id="account-continue" class="account-button"><span><b>${gameplayPaused()?'접속 권한 확인':'게임으로 돌아가기'}</b></span></button>`:''}
  </div>
  <p id="account-error" class="account-error" role="alert">${escapeHtml(error)}</p>
  <p class="account-note">계정 로그인은 랭킹의 플레이어를 구분하고 앞으로 여러 기기에서 이어하기 위한 기반으로 사용합니다. 실명은 랭킹에 표시하지 않아요.</p>
  ${linked?'<button id="account-signout" class="menu-item small-item">로그아웃</button>':''}</div>`;
 const busy=async(action,provider)=>{document.querySelectorAll('.account-button').forEach(button=>button.disabled=true);try{await action();}catch(err){void webTelemetry.loginFailure(provider,err);showAccount(authMessage(err));return;}try{backfillPersonalBests();const result=await cloud.retry();await refreshAccessMode();if(result?.changed){location.reload();return;}showEntry();void backfillBossVeterans();}catch(err){showAccount(authMessage(err));}};
 if($('#account-google'))$('#account-google').onclick=()=>busy(account.signInWithGoogle,'google');
 if($('#account-apple'))$('#account-apple').onclick=()=>busy(account.signInWithApple,'apple');
 if($('#account-guest'))$('#account-guest').onclick=()=>busy(account.guest,'guest');
 if($('#account-back'))$('#account-back').onclick=()=>{if(publicWebBetaLocked()&&!adminMode&&!betaTesterMode)showBetaLock();else showIntro();};
 if($('#account-continue'))$('#account-continue').onclick=async()=>{await refreshAccessMode();showEntry();};
 $('#profile-discoveries').onclick=()=>showDiscoveries(showAccount);
 if($('#account-ranking'))$('#account-ranking').onclick=()=>showRanking('online');
 document.querySelectorAll('[data-equip-title]').forEach(button=>button.onclick=()=>{const id=button.dataset.equipTitle;if(!seedTitle.state().titles.some(title=>title.id===id))return;writeAccountProfile(runStorage,{...readAccountProfile(runStorage),equippedTitle:id});seedTitle.setEquipped(id);showAccount();});
 document.querySelectorAll('[data-equip-pet]').forEach(button=>button.onclick=()=>{const id=button.dataset.equipPet,save=writeBossPet(runStorage,profile,id);if(!save.saved)return;bossPet.equip(id,profile);showAccount();});
 if($('.pet-unequip'))$('.pet-unequip').onclick=()=>{writeBossPet(runStorage,profile,null);bossPet.equip(null,profile);showAccount();};
 if($('#account-signout'))$('#account-signout').onclick=async()=>{try{const saved=await cloud.syncNow();if(!saved.ok){showAccount('이 기기의 기록을 아직 저장하지 못했어요. 인터넷 연결을 확인한 뒤 다시 시도해 주세요.');return;}await account.signOut();cloud.signOutCleanup();location.reload();}catch(err){showAccount(authMessage(err));}};
}
let pendingCloudReload=false,foregroundCloudSync=null,lastForegroundCloudSync=0,startupCloudReady=false;
function showIntro(){++expansionLaunch;void releaseExpansionSaveLease();expansionChannel='inspection';expansionPublicEntry=null;expansionPublicSync=null;expansionFreshExpected=null;expansionPendingBossCheckpoint=null;expansionTerrain=null;if(expansionJourney){for(const e of enemies)releaseEnemy(e);enemies=[];for(const q of [...shots,...enemyShots])release(q.ob);shots=[];enemyShots=[];}expansionJourney=null;expansionJourneyView?.setActive(false);document.body.classList.remove('survival-result');$('#overlay').classList.remove('survival-overlay');perfFinish('left');if(survivalSession){for(const e of enemies)releaseEnemy(e);for(const f of fallen)releaseEnemy(f.e);fallen.length=0;enemies=[];for(const q of [...shots,...enemyShots,...effects])release(q.ob);shots=[];enemyShots=[];effects=[];clearForms();}trainingSession=null;mirrorSession=null;survivalSession=null;survivalArt?.setActive(false);document.body.classList.remove('survival-mode');mirrorReadyRing.visible=false;combatAnalysis.cancel();$('#room-analysis').hidden=true;developerRun=false;labSafe=false;const labButton=$('#developer-lab-fab');if(labButton)labButton.hidden=true;if(gameplayPaused()){showSeasonPause();return;}audio.setScene('garden');audio.setPaused(false);region='garden';startRegion='garden';pauseBuild.hide();activeVfx.clear();cancelActive(activeGauge);activeReadyAnnounced=false;$('#active-cinematic').hidden=true;$('#active-cinematic').innerHTML='';austinRoom=false;drawRoom();$('#evolution').hidden=true;player.visible=true;paused=false;keys.clear();touch.reset();$('#pause').textContent='Ⅱ';$('#toast').textContent='';$('#boss-hud').hidden=true;$('#exit-room').hidden=true;gate.visible=false;
 void nativeUpdate.check();
 if(pendingCloudReload){location.reload();return;}
 mode='ready';refreshGardenEffects();ensureGardenScene();gardenSelection=null;if(gardenScene)gardenScene.select(-1);
 if(maintenanceOn){showMaintenance();return;}
 // 점검으로 잠시 닫았던 미안함: 다시 싹 1개와 작은 물약 3개를 보관함에 한 번만 넣는다.
 const cloudRewards=cloud.consumeRewardNotice();
 const betaBoosterGift=betaTesterMode?grantGift(runStorage,BETA_BOOSTER_GIFT,'sprout',1):{granted:false};
 const sproutGift=grantGift(runStorage,SORRY_GIFT,'sprout',1);
 const tonicGift=grantGift(runStorage,SORRY_TONIC_GIFT,'tonic',3);
 recoverSupport();
 const patchGift=grantGiftSet(runStorage,PATCH_GIFT,PATCH_GIFT_ITEMS);
 const adminRegift=adminMode&&!localAdminLab?grantGiftSet(runStorage,ADMIN_REGIFT,PATCH_GIFT_ITEMS):{granted:false};
 const chuseokGift=grantGiftSet(runStorage,CHUSEOK_GIFT,CHUSEOK_GIFT_ITEMS);
 if(chuseokGift.granted){chuseokGiftPending=true;cloud.syncNow().catch(()=>null);}
 if(cloudRewards.length){showCloudGift(cloudRewards);return;}
 if(chuseokGiftPending&&firstGiftPopup('chuseok')){chuseokGiftPending=false;showChuseokGift();return;}
 if(betaBoosterGift.granted&&firstGiftPopup('beta')){showBetaBoosterGift();return;}
 if((sproutGift.granted||tonicGift.granted)&&firstGiftPopup('sorry')){showGift();return;}
 if((patchGift.granted||adminRegift.granted)&&firstGiftPopup('patch')){showPatchGift();return;}
 $('#overlay').classList.remove('ranking-overlay','garden-mode','developer-mode');$('#overlay').classList.add('intro','menu-screen');$('#overlay').hidden=false;
 // 하던 사람에게만 새 소식 점을 띄운다(처음 온 사람에게는 붙이지 않는다).
 const newsDot=hasUnseenNotes(runStorage,{firstVisit:!profile.forms.length&&!garden.harvests});
 $('#overlay').innerHTML=`<button id="patch-notes" class="menu-news-button" aria-label="새 소식 열기"><span>새 소식${newsDot?'<i class="news-dot" aria-label="읽지 않은 새 소식"></i>':''}</span><small>${PATCH_NOTES[0].date}</small></button><div class="menu-panel home-panel">
  <header class="home-heading"><p class="eyebrow">S E E D</p><h2>잠든 정원</h2><span class="menu-ornament" aria-hidden="true">✦</span></header>
  ${nameFieldHtml()}
  <div class="menu-list">
   <button id="go-dungeon" class="primary menu-item"><strong>던전으로</strong><small>문지기 너머로 가는 길</small></button>
   <button id="go-garden" class="menu-item" style="--garden-art:url(${import.meta.env.BASE_URL}assets/garden/hub-v1.webp)"><strong>정원</strong><small>${escapeHtml(gardenHomeLine())}</small></button>
   ${adminMode?'<div class="home-admin-actions"><button id="developer-usage" class="menu-item developer-entry"><strong>이용 현황</strong><small>접속 기기 · 플레이 시간</small></button><button id="developer-lab" class="menu-item developer-entry"><strong>개발자 실험실</strong><small>조합 · 보스 확인</small></button></div>':''}
   <button id="ranking-link" class="menu-item"><strong>명예의 전당</strong><small>모두의 기록</small></button>
   <button id="account-link" class="menu-item"><strong>프로필·계정</strong><small>${escapeHtml(account.label())} · 도감 · 칭호</small></button>
  </div>
  ${cloudSaveFailed?'<p class="cloud-save-warning" role="alert">이 기기에는 저장됐지만 계정 저장은 아직 확인되지 않았어요. 다른 기기로 옮기기 전에 연결 상태를 확인해 주세요. <button id="retry-cloud-save" type="button">계정 저장 다시 시도</button></p>':''}
  <p class="legal-note"><a href="https://kukuma1004.github.io/seed-web/privacy.html" target="_blank" rel="noopener">개인정보 처리방침</a> · <a href="https://kukuma1004.github.io/seed-web/terms.html" target="_blank" rel="noopener">랭킹 이용규칙</a> · 광고와 결제가 없는 게임입니다</p>
 </div>`;
 bindNameField();
 online.flush().catch(()=>0);void retryModeRankings();
 $('#go-dungeon').onclick=showDungeon;
 $('#go-garden').onclick=()=>showGardenHub();
 if($('#retry-cloud-save'))$('#retry-cloud-save').onclick=async()=>{const button=$('#retry-cloud-save');button.disabled=true;button.textContent='확인 중…';try{const result=await cloud.flush();if(result.ok&&!cloud.isDirty()){cloudSaveFailed=false;showIntro();return;}}catch{}button.disabled=false;button.textContent='계정 저장 다시 시도';};
 if($('#developer-lab'))$('#developer-lab').onclick=showDeveloperLab;
 if($('#developer-usage'))$('#developer-usage').onclick=showDeveloperUsage;
 $('#patch-notes').onclick=showNotes;
 $('#ranking-link').onclick=()=>showRanking('online');
 $('#account-link').onclick=()=>showAccount();
 updateFormLabel();
}
function startDeveloperEncounter(target){
 if(!adminMode)return showIntro();
 const encounters={
  room:{region:'garden',stage:0,cycle:0,mode:'entry',wardens:0,austins:0},
  warden:{region:'garden',stage:4,cycle:0,mode:'entry',wardens:0,austins:0},
  duo:{region:'garden',stage:4,cycle:5,mode:'entry',wardens:5,austins:1},
  austin:{region:'garden',stage:4,cycle:4,mode:'austin',wardens:5,austins:0},
  act2field:{region:ACT2_REGION,stage:1,cycle:0,mode:'entry',wardens:0,austins:0},
  act2warden:{region:ACT2_REGION,stage:4,cycle:3,mode:'entry',wardens:3,austins:0},
  act2boss:{region:ACT2_REGION,stage:4,cycle:4,mode:'austin',wardens:5,austins:0},
  act3field:{region:ACT3_REGION,stage:1,cycle:0,mode:'entry',wardens:0,austins:0},
  act3warden:{region:ACT3_REGION,stage:4,cycle:2,mode:'entry',wardens:4,austins:0},
  act3boss:{region:ACT3_REGION,stage:4,cycle:3,mode:'austin',wardens:5,austins:0}
 },encounter=encounters[target]||encounters.room;
 developerRun=true;startRegion=encounter.region;restart({version:1,...encounter,hp:100,kills:0,elapsed:0,rules:[],mutated:[],forms:{}});
 if(developerForm&&Object.hasOwn(FORMS,developerForm)){heldForms.set(developerForm,5);syncForms(true);growth.select(effectiveLaws(),mutated);}
 if($('#developer-active')?.checked){activeGauge.value=ACTIVE.max;activeGauge.cooldown=0;}
 labSafe=Boolean($('#developer-safe')?.checked);const labButton=$('#developer-lab-fab');if(labButton)labButton.hidden=false;
 $('#toast').textContent=`개발자 실험 · ${developerForm?FORMS[developerForm].name:'기본 씨앗'} · 기록과 보상은 저장되지 않습니다`;
}
function showDeveloperLab(){
 if(!adminMode)return showIntro();
 mode='developer-lab';touch.reset();keys.clear();keyboardDash=false;paused=false;
 $('#overlay').classList.remove('ranking-overlay','garden-mode');$('#overlay').classList.add('intro','menu-screen','developer-mode');$('#overlay').hidden=false;
 const groups=[
  ['기본 · 1차 융합', [['','기본 씨앗'],...Object.entries(FORMS).filter(([,form])=>!form.solo&&!form.awakened&&!form.second).map(([id,form])=>[id,form.name])]],
  ['단독 진화',Object.entries(FORMS).filter(([,form])=>form.solo).map(([id,form])=>[id,form.name])],
  ['완성 진화',Object.entries(FORMS).filter(([,form])=>form.awakened&&!form.twin).map(([id,form])=>[id,form.name])],
  ['쌍둥이 각성',Object.entries(FORMS).filter(([,form])=>form.twin).map(([id,form])=>[id,form.name])],
  ['옛 재융합 · 기록 보존',Object.entries(FORMS).filter(([,form])=>form.second).map(([id,form])=>[id,form.name])]
 ];
 mountDeveloperLab($('#overlay'),{groups,selected:developerForm,onSelect:id=>{developerForm=id;},onTarget:startDeveloperEncounter,onCards:()=>{developerForm='';startDeveloperEncounter('room');cardChoice(false,['reflect','split','chain']);},onBack:showIntro});
 if(localInspection){
  const section=document.createElement('section');section.className='developer-expansion';
  section.innerHTML='<h3>새 여정 · 로컬 검증</h3><p>4·5막 · 계정 보상과 랭킹 제외</p><button type="button" data-expansion="crosswind">4막 · 횡풍의 항로</button><button type="button" data-expansion="crystalGorge">5막 · 수정 협곡</button><p role="status" class="expansion-launch-status"></p>';
  $('#overlay').querySelector('.lab-target-scroll').append(section);
  for(const button of section.querySelectorAll('[data-expansion]'))button.onclick=async()=>{
   const status=section.querySelector('[role="status"]');status.textContent='전장과 저장 보호를 준비하는 중…';
   const form=developerForm,safe=Boolean($('#developer-safe')?.checked),charged=Boolean($('#developer-active')?.checked);
   for(const control of section.querySelectorAll('button'))control.disabled=true;
   try{
    const started=await startExpansionJourney(0,button.dataset.expansion);
    if(!started)status.textContent=$('#toast').textContent||'전장 진입이 취소됐어요. 메인으로 나갔다 다시 시도해 주세요.';
    else{
     if(form&&Object.hasOwn(FORMS,form)){heldForms.set(form,5);syncForms(true);growth.select(effectiveLaws(),mutated);}
     if(charged){activeGauge.value=ACTIVE.max;activeGauge.cooldown=0;}labSafe=safe;
     if(!captureExpansionEntry())$('#toast').textContent='전투는 열렸지만 실험 조합의 방 입구 저장을 확인하지 못했어요.';
    }
   }
   catch(error){console.error('Expansion inspection launch failed',error);status.textContent='전장을 불러오지 못했어요. 기존 저장은 그대로 남아 있어요.';}
   finally{for(const control of section.querySelectorAll('button'))control.disabled=false;}
  };
 }
}
function showDeveloperUsage(){
 if(!adminMode)return showIntro();
 mode='developer-usage';touch.reset();keys.clear();
 $('#overlay').classList.remove('ranking-overlay','garden-mode');$('#overlay').classList.add('intro','menu-screen','developer-mode');$('#overlay').hidden=false;
 $('#overlay').innerHTML='<div class="menu-panel developer-panel usage-panel"><p class="eyebrow">SEED · ADMIN ONLY</p><h2>이용 현황</h2><div id="usage-content" role="status">최근 7일 수치를 불러오는 중…</div><div class="developer-footer"><button id="usage-refresh" type="button">새로고침</button><button id="usage-back" type="button">메인으로</button></div></div>';
 const minutes=seconds=>`${Math.round(seconds/60).toLocaleString('ko-KR')}분`;
 let loading=false;
 const refresh=async()=>{
  const target=$('#usage-content'),button=$('#usage-refresh');if(!target||loading)return;
  if(localInspection){target.textContent='로컬 시연 화면이에요. 실제 이용 현황은 배포된 게임에서 관리자 계정으로 확인할 수 있어요.';return;}
  loading=true;button.disabled=true;target.textContent='최근 7일 수치를 불러오는 중…';
  try{
   const rows=await readUsageDays({tokenSession:()=>account.tokenSession(),databaseURL:FIREBASE.databaseURL});
   if(mode!=='developer-usage'||!target.isConnected)return;
   const today=rows[0],week=usageTotals(rows),starts=week.webStarts+week.appStarts;
   target.innerHTML=`<div class="usage-cards"><div><small>오늘 방문 기기</small><strong>${today.webDevices+today.appDevices}</strong><span>웹 ${today.webDevices} · Android ${today.appDevices}</span></div><div><small>오늘 판 시작</small><strong>${today.webStarts+today.appStarts}</strong><span>웹 ${today.webStarts} · Android ${today.appStarts}</span></div><div><small>오늘 실제 전투</small><strong>${minutes(today.activeSeconds)}</strong><span>일시정지·백그라운드 제외</span></div></div><p class="usage-summary">최근 7일 판 시작 ${starts.toLocaleString('ko-KR')}회 · 실제 전투 ${minutes(week.activeSeconds)} · 한 판 평균 ${starts?minutes(week.activeSeconds/starts):'기록 없음'} · 완주 ${week.cleared}회 · 사망 ${week.deaths}회</p><div class="usage-table-wrap"><table class="usage-table"><thead><tr><th>날짜</th><th>웹 기기</th><th>앱 기기</th><th>판 시작</th><th>전투 시간</th><th>완주</th><th>사망</th></tr></thead><tbody>${rows.map(row=>`<tr><td>${row.day.slice(4,6)}/${row.day.slice(6)}</td><td>${row.webDevices}</td><td>${row.appDevices}</td><td>${row.webStarts+row.appStarts}</td><td>${minutes(row.activeSeconds)}</td><td>${row.cleared}</td><td>${row.deaths}</td></tr>`).join('')}</tbody></table></div>${(()=>{const modes=usageModeTotals(rows),todayModes=today.modes||{},ids=Object.keys(USAGE_MODE_NAMES).sort((x,y)=>modes[y].seconds-modes[x].seconds);return `<h3 class="usage-mode-title">모드별 (최근 7일)</h3><div class="usage-table-wrap"><table class="usage-table"><thead><tr><th>모드</th><th>들어간 횟수</th><th>머문 시간</th><th>한 번 평균</th><th>오늘</th></tr></thead><tbody>${ids.map(id=>`<tr><td>${USAGE_MODE_NAMES[id]}</td><td>${modes[id].entries}</td><td>${minutes(modes[id].seconds)}</td><td>${modes[id].entries?minutes(modes[id].seconds/modes[id].entries):'-'}</td><td>${todayModes[id]?.entries||0}회 · ${minutes(todayModes[id]?.seconds||0)}</td></tr>`).join('')}</tbody></table></div>`;})()}<p class="developer-note">방문 수는 사람이 아닌 브라우저·앱 설치별 추정치예요. 새 앱 통계와 전투 시간은 해당 버전 설치 이후부터 기록돼요. 종료 직전 수초는 누락될 수 있어요.</p>`;
  }catch(error){if(mode==='developer-usage'&&target.isConnected)target.textContent=error?.message||'통계를 불러오지 못했어요.';}
  finally{loading=false;if(button.isConnected)button.disabled=false;}
 };
 $('#usage-refresh').onclick=refresh;$('#usage-back').onclick=showIntro;void refresh();
}
// 보관함·가져가기를 한 줄로("작은 물약 3 · 다시 싹 1"). 비어 있으면 빈 문자열.
const itemCounts=counts=>STASH_ORDER.filter(id=>counts?.[id]).map(id=>`${ITEMS[id].name} ${counts[id]}`).join(' · ');
// 개발자 후원(실제 결제). 공개 전(SUPPORT_RELEASED=false)에는 개발 서버의 가짜 결제(?billing=mock)와
// 안드로이드 앱의 관리자 계정(라이선스 테스터로 결제 시험)에서만 보인다.
const billing=createBilling();
let supportBusy=false,supportRecovered=false,supportCatalog=null,supportCatalogLoading=false,lastShopBack=showIntro;
const supportCanPay=()=>billing.status==='ready'||billing.status==='mock';
const supportVisible=()=>SUPPORT_RELEASED||billing.status==='mock'||(adminMode&&billing.status==='ready');
// 스토어 가격표(구글 플레이에 등록된 상품만). 불러오면 열려 있는 상점을 다시 그린다.
async function loadSupportCatalog(){
 if(supportCatalog||supportCatalogLoading||!supportCanPay())return;supportCatalogLoading=true;
 const list=await billing.products().catch(()=>[]);supportCatalogLoading=false;
 supportCatalog=new Map(list.filter(p=>p?.id).map(p=>[p.id,p.priceLabel||'']));
 if(document.querySelector('.shop-panel')&&!supportBusy)showShop(lastShopBack);
}
function supportSection(shop){
 if(!supportVisible())return '';
 if(!supportCatalog)loadSupportCatalog();
 const canPay=supportCanPay()&&Boolean(supportCatalog);
 const note=billing.status==='web'?'후원은 구글 플레이 안드로이드 앱에서 할 수 있어요.':billing.status==='not-ready'?'결제를 준비하고 있어요. 조금만 기다려 주세요.':billing.status==='mock'?'시험용 가짜 결제예요 · 돈이 나가지 않아요.':'구글 플레이로 결제돼요 · 받은 JP와 물약은 보관함에 바로 들어가요.';
 return `<section class="support-panel"><h3>개발자 후원하기</h3><p class="support-lead">재밌게 즐기셨다면 한 번 응원해 주세요. 고마운 마음으로 JP와 물약을 함께 드려요.</p><ul class="support-list">${SUPPORT_PRODUCTS.map(p=>{const room=supportRoom(shop,p),listed=!supportCatalog||supportCatalog.has(p.id),price=supportCatalog?.get(p.id)||supportPriceLabel(p);return `<li><button type="button" data-support="${p.id}" ${!canPay||supportBusy||!room.ok||!listed?'disabled':''}><span class="support-icon" aria-hidden="true">${p.icon}</span><span class="support-text"><strong>${escapeHtml(p.title)}</strong><small>${escapeHtml(supportRewardLines(p).join(' · '))}</small>${room.ok?'':`<small class="support-full">보관함이 가득 차서 지금은 받을 수 없어요</small>`}${listed?'':`<small class="support-full">스토어에 아직 준비되지 않은 상품이에요</small>`}</span><b class="support-price">${escapeHtml(price)}</b></button></li>`;}).join('')}</ul><p class="support-note">${supportCanPay()&&!supportCatalog?'스토어 가격을 불러오는 중… ':''}${note} 결제·환불은 구글 플레이 정책을 따라요.</p></section>`;
}
async function buySupport(back,id){
 if(supportBusy)return;
 const product=SUPPORT_PRODUCTS.find(p=>p.id===id);if(!product)return;
 if(!supportRoom(readShop(runStorage),product).ok){showShop(back,'보관함이 가득 차서 지금은 받을 수 없어요 · 물약을 조금 쓰고 다시 와 주세요');return;}
 supportBusy=true;showShop(back,'결제 창을 여는 중…');
 const purchase=await billing.purchase(id);
 if(!purchase?.ok){supportBusy=false;if(purchase?.reason==='owned'){supportRecovered=false;recoverSupport();}showShop(back,purchase?.reason==='cancelled'?'결제를 취소했어요':purchase?.reason==='pending'?'결제가 대기 중이에요 · 결제가 끝나면 앱을 다시 켤 때 받아요':purchase?.reason==='owned'?'마무리되지 않은 결제가 있어 먼저 받는 중이에요':'결제를 마치지 못했어요 · 돈이 나갔다면 앱을 다시 켜면 받을 수 있어요');return;}
 const result=await completeSupportPurchase(runStorage,billing,purchase);supportBusy=false;
 showShop(back,result.status==='granted'?`${product.icon} 고마워요! ${supportRewardLines(product).join(' · ')}를 보관함에 넣었어요`:result.status==='duplicate'?'이미 받은 결제예요':'결제는 됐지만 아직 못 받았어요 · 보관함을 비우고 앱을 다시 켜면 받아요');
}
// 앱을 켤 때 한 번: 지난번에 지급이 끝나지 않은 결제(앱이 결제 직후 꺼진 경우)를 마무리한다.
async function recoverSupport(){
 if(supportRecovered||!supportCanPay()||!(SUPPORT_RELEASED||adminMode||billing.status==='mock'))return;supportRecovered=true;
 const granted=await recoverSupportPurchases(runStorage,billing);
 if(granted.length){$('#toast').textContent=`지난 후원 ${granted.length}건을 보관함에 넣었어요 · 고마워요!`;if(document.querySelector('.shop-panel'))showShop(lastShopBack);}
}
function showShop(back=showIntro,message=''){
 lastShopBack=back;mode='ready';touch.reset();keys.clear();
 $('#overlay').classList.remove('ranking-overlay','garden-mode');$('#overlay').classList.add('intro','menu-screen');$('#overlay').hidden=false;
 const shop=readShop(runStorage),oneDisabled=shop.coins<SHOP_PRICES[1]||shop.stash.tonic>=SHOP_STOCK_MAX,bundleDisabled=shop.coins<SHOP_PRICES[10]||shop.stash.tonic+10>SHOP_STOCK_MAX;
 // 보관함: 가진 물약마다 새 여정에 가져갈 개수를 − + 로 고른다. 많이 있어도 0개로 두면 안 가져간다.
 const stashRows=STASH_ORDER.filter(id=>id==='tonic'||shop.stash[id]).map(id=>{
  const most=Math.min(shop.stash[id],STASH_ITEMS[id].carryMax);
  return `<li class="stash-row">${itemArt(id)}<div class="stash-name"><strong>${ITEMS[id].name}</strong><small>보관 ${shop.stash[id]}개 · 출발 최대 ${STASH_ITEMS[id].carryMax}개</small></div>`
   +`<div class="stash-carry" role="group" aria-label="${ITEMS[id].name} 가져갈 개수"><button type="button" data-carry="${id}" data-step="-1" ${shop.carry[id]<=0?'disabled':''} aria-label="하나 덜">−</button><b>${shop.carry[id]}</b><button type="button" data-carry="${id}" data-step="1" ${shop.carry[id]>=most?'disabled':''} aria-label="하나 더">+</button></div></li>`;
 }).join('');
 $('#overlay').innerHTML=`<div class="menu-panel shop-panel"><p class="eyebrow">SEED · 출발 준비</p><h2>물약 상점</h2>
  <div class="shop-wallet"><span>보유 JP</span><strong>${shop.coins.toLocaleString('ko-KR')} JP</strong></div>
  <div class="shop-columns">
  <section class="shop-product"><div class="shop-product-art">${itemArt('tonic')}<div><h3>${ITEMS.tonic.name}</h3><p>생명력 +${ITEMS.tonic.heal} · 보관 최대 ${SHOP_STOCK_MAX}개</p></div></div>
   <div class="shop-buy"><button id="buy-one" ${oneDisabled?'disabled':''}><strong>1개 · ${SHOP_PRICES[1].toLocaleString('ko-KR')} JP</strong><small>낱개 구매</small></button><button id="buy-ten" ${bundleDisabled?'disabled':''}><strong>10개 · ${SHOP_PRICES[10].toLocaleString('ko-KR')} JP</strong><small>25% 할인 묶음</small></button></div>
   <p class="shop-message" aria-live="polite">${escapeHtml(message)}</p></section>
  <section class="shop-stash"><h3>보관함 · 새 여정에 가져갈 개수</h3><ul>${stashRows}</ul>
   <p class="stash-note">새 여정을 시작할 때만 가방에 들어가요 · 이어하기에는 안 들어가요</p></section>
  </div>
  ${supportSection(shop)}
  <p class="shop-note">문지기 +50 JP · 오스틴 +200 JP · ${supportVisible()?'물약은 게임 안에서 모은 JP로만 사요. 실제 돈은 후원에서만 쓰여요.':'게임 안에서 얻는 재화이며 실제 결제가 아닙니다.'}</p>
  <button id="shop-back" class="menu-item small-item">돌아가기</button></div>`;
 const buy=count=>{const result=buyTonics(runStorage,count);showShop(back,result.ok?`${result.count}개를 보관함에 담았어요 · ${result.price.toLocaleString('ko-KR')} JP 사용`:result.reason==='full'?`보관함에는 작은 물약을 ${SHOP_STOCK_MAX}개까지 둘 수 있어요`:'JP가 부족해요');};
 $('#buy-one').onclick=()=>buy(1);$('#buy-ten').onclick=()=>buy(10);$('#shop-back').onclick=back;
 document.querySelectorAll('[data-support]').forEach(button=>button.onclick=()=>buySupport(back,button.dataset.support));
 document.querySelectorAll('[data-carry]').forEach(button=>button.onclick=()=>{const id=button.dataset.carry;setCarry(runStorage,id,readShop(runStorage).carry[id]+Number(button.dataset.step));showShop(back);});
}
// 점검 사과 선물 안내. 한 번만 뜬다(grantGift가 같은 선물을 다시 주지 않는다).
const BETA_BOOSTER_GIFT='beta-booster-sprout-20260918';
const SORRY_GIFT='sorry-20260917';
const SORRY_TONIC_GIFT='sorry-tonics-20260917';
// 2026-09-22 사용자: "잦은 패치로 미안하니까 창고에 보스 4종 물약 1세트 주자" — 계정(보관함)마다 한 번.
const PATCH_GIFT='sorry-boss-potions-20260922',PATCH_GIFT_ITEMS=Object.freeze({potion:1,wind:1,shell:1,sprout:1});
const CHUSEOK_GIFT='chuseok-2026-boss-potions',CHUSEOK_GIFT_ITEMS=Object.freeze({potion:5,wind:5,shell:5,sprout:5});
let chuseokGiftPending=false;
// 2026-09-22 사용자(운영자): 사과 선물이 '가져가기'로 자동 설정돼 여정에 바로 들고 들어가 버렸다 → 운영자 계정에 한 번 더.
const ADMIN_REGIFT='admin-regift-boss-potions-20260922';
// 선물 창은 앱을 켤 때마다 종류별로 한 번만 띄운다(9/22 아이폰: '확인'을 눌러도 선물 창이 다시 떠 안 눌리는 것처럼 보였다 —
// 저장이 늦거나 실패해 같은 선물이 또 '새로 받음'으로 잡히면 창이 계속 반복될 수 있어서 막는다).
const giftPopupsShown=new Set();
function firstGiftPopup(kind){if(giftPopupsShown.has(kind))return false;giftPopupsShown.add(kind);return true;}
function showChuseokGift(){
 mode='gift';touch.reset();keys.clear();
 $('#overlay').classList.remove('ranking-overlay','garden-mode','developer-mode');$('#overlay').classList.add('intro','menu-screen');$('#overlay').hidden=false;
 $('#overlay').innerHTML=`<div class="menu-panel gift-panel gift-compact"><p class="eyebrow">SEED · 추석 선물</p><h2>풍성한 여정 되세요</h2>
  <div class="gift-grid">${Object.entries(CHUSEOK_GIFT_ITEMS).map(([id,n])=>`<div class="gift-item">${itemArt(id)}<div><strong>${escapeHtml(ITEMS[id].name)} ${n}개</strong><small>${escapeHtml(ITEMS[id].desc)}</small></div></div>`).join('')}</div>
  <p class="gift-line">보스 물약 4종을 각각 5개씩 창고에 넣었어요. 다시 싹도 창고에는 5개를 보관할 수 있어요.</p>
  <p class="gift-line">여정에 가져갈 때는 종류별 소지 한도가 적용됩니다. 다시 싹은 한 번에 1개만 가져갈 수 있어요.</p>
  <div class="gift-actions"><button id="gift-shop" class="menu-item"><strong>상점 보관함 보기</strong></button><button id="gift-ok" class="menu-item primary"><strong>확인</strong></button></div></div>`;
 $('#gift-ok').onclick=showIntro;$('#gift-shop').onclick=()=>showShop(showIntro);
}
function showPatchGift(){
 mode='gift';touch.reset();keys.clear();
 $('#overlay').classList.remove('ranking-overlay','garden-mode','developer-mode');$('#overlay').classList.add('intro','menu-screen');$('#overlay').hidden=false;
 // 물약 4개를 2×2로 묶는다(한 줄씩 쌓으면 가로 휴대폰에서 '확인'이 화면 밖으로 밀려 눌리지 않았다, 9/22).
 $('#overlay').innerHTML=`<div class="menu-panel gift-panel gift-compact"><p class="eyebrow">SEED · 선물</p><h2>자주 고쳐서 미안해요</h2>
  <div class="gift-grid">${Object.keys(PATCH_GIFT_ITEMS).map(id=>`<div class="gift-item">${itemArt(id)}<div><strong>${escapeHtml(ITEMS[id].name)} 1개</strong><small>${escapeHtml(ITEMS[id].desc)}</small></div></div>`).join('')}</div>
  <p class="gift-line">요즘 업데이트가 잦았죠. 보스 물약 4종 1세트를 상점 보관함에 넣어 두었어요.</p>
  <p class="gift-line">보관함에 그대로 모아 둬요. 쓰고 싶을 때 상점에서 가져갈 개수를 고르면 새 여정에 들고 가요.</p>
  <div class="gift-actions"><button id="gift-shop" class="menu-item"><strong>상점 보관함 보기</strong></button><button id="gift-ok" class="menu-item primary"><strong>확인</strong></button></div></div>`;
 $('#gift-ok').onclick=showIntro;$('#gift-shop').onclick=()=>showShop(showIntro);
}
function showBetaBoosterGift(){
 mode='gift';touch.reset();keys.clear();
 $('#overlay').classList.remove('ranking-overlay','garden-mode','developer-mode');$('#overlay').classList.add('intro','menu-screen');$('#overlay').hidden=false;
 $('#overlay').innerHTML=`<div class="menu-panel gift-panel"><p class="eyebrow">SEED · BETA BOOSTER</p><h2>함께 시험해 줘서 고마워요</h2>
  <div class="gift-item">${itemArt('sprout')}<div><strong>부활 물약 · ${ITEMS.sprout.name} 1개</strong><small>${escapeHtml(ITEMS.sprout.desc)}</small></div></div>
  <p class="gift-line">베타테스터 전용 부스터를 상점 보관함에 넣어 두었어요. 계정마다 한 번만 받을 수 있습니다.</p>
  <p class="gift-line">보관함에 모아 두었다가 상점에서 가져갈 개수를 고르면 새 여정에 들고 가요. 쓰러지는 순간 자동으로 사용됩니다.</p>
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
  <p class="gift-line">보관함에 그대로 모아 둬요. 쓰고 싶을 때 상점에서 가져갈 개수를 고르면 새 여정에 들고 가요.</p>
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
  for(const [id,n] of Object.entries(r.seeds||{}))lines.push(`<li><strong>${escapeHtml(SEEDS[id]?.name||id)} ×${n}</strong><small>나의 정원 화단에 자동으로 심겼어요</small></li>`);
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
// Existing two main modes stay prominent; the new defence slice is a separate trial.
let defenseScreen=null,adventureScreen=null;
let defenseLoadSerial=0;
async function showSeedAdventure(){
 mode='adventure';touch.reset();keys.clear();stopAnimation();$('#overlay').hidden=true;
 try{
  const {mountSeedAdventure}=await import('./seed-adventure-view.js');
  // 2026-09-28: 모험도 계정과 잇는다. 문 앞 저장·도감·JP·보스 칭호 모두 계정 저장(클라우드 동기화)에. 연습은 보상 없음.
  const owner=account.user()?.uid||'guest',practice=Boolean(localInspection||developerRun);
  // 2026-09-28 사용자: "펫은 모험에선 못 가져가나?" — 계정에서 고른 보스 동행이 모험에도 따라온다(본편처럼 꾸밈만).
  const petId=readBossPet(runStorage,profile).id,pet=petId?BOSS_PETS[petId]:null;
  adventureScreen=mountSeedAdventure({audio,storage:runStorage,owner,practice:()=>practice||developerRun||localInspection,currentOwner:()=>account.user()?.uid||'guest',titleStats:()=>seedTitle.state(),pet:pet?{id:pet.id,name:pet.name,file:pet.file}:null,
   onCredit:jp=>{if(owner!==(account.user()?.uid||'guest'))return '계정이 바뀌어 적립하지 않았어요';earnCoins(runStorage,jp);return `햇살 ${jp} JP 적립`;},
   onDiscover:id=>{profile=readDiscoveries(runStorage);remember('forms',id);},
   onBossDefeated:event=>awardModeBoss('adventure',event.runId,event.boss,event.ordinal,practice||owner!==(account.user()?.uid||'guest')),
   onResult:state=>submitExtraModeRanking('adventure',adventureRankEntry(state,{uid:owner,name:playerName}),practice),
   onRanking:()=>{adventureScreen?.close();showModeRanking('adventure',showDungeon);},
   onClose:()=>{adventureScreen=null;showDungeon();last=performance.now();realLast=Date.now();startAnimation();}});
 }catch(error){console.error('씨앗의 모험 시작 실패',error);showDungeon();last=performance.now();realLast=Date.now();startAnimation();$('#toast').textContent='모험을 불러오지 못했어요. 다시 눌러 주세요.';}
}

// 2026-09-28 사용자: 서바이벌 프로젝트처럼 막기가 있는 수 싸움 대전 → 씨앗 대전 1차(1:1 AI, 시험 모드).
let duelScreen=null;
async function showSeedDuel(){
 mode='duel';touch.reset();keys.clear();stopAnimation();$('#overlay').hidden=true;
 const back=()=>{duelScreen=null;showDungeon();last=performance.now();realLast=Date.now();startAnimation();};
 try{const {mountSeedDuel}=await import('./seed-duel-view.js');const owner=account.user()?.uid||'guest',practice=Boolean(localInspection||developerRun),sameOwner=()=>owner===(account.user()?.uid||'guest');
  duelScreen=mountSeedDuel({audio,storage:runStorage,owner,practice,inspection:Boolean(localInspection&&new URLSearchParams(location.search).get('duelCandidates')==='08'),initialCharacter:localInspection?new URLSearchParams(location.search).get('duelCharacter')||'pierce':'pierce',canSave:sameOwner,
   onProgress:p=>{if(!sameOwner())return;garden=readGarden(runStorage);garden.duelStory=p;writeGarden(runStorage,garden);},
   onSaveAccount:!practice&&account.user()&&!account.user().isAnonymous?async()=>{if(!sameOwner())return false;const r=await cloud.flush();return r.ok&&!cloud.isDirty();}:null,
   onResult:(state,meta)=>submitExtraModeRanking('duel',duelRankEntry(state,{uid:owner,name:playerName,storyStage:meta?.storyStage||0}),practice),
   onRanking:()=>{duelScreen?.close();showModeRanking('duel',showDungeon);},onClose:back});}
 catch(error){console.error('씨앗 대전 시작 실패',error);back();$('#toast').textContent='대전을 불러오지 못했어요. 다시 눌러 주세요.';}
}
// 2026-09-28 사용자: "퍼즐게임 같은 거" → 씨앗 맞추기(3개 맞추기, PUZZLE_MATCH3_PLAN.md). 모험처럼 계정 저장소에 진행을 두고,
// 첫 깨기·새 별 햇살(JP)과 조합 효과 도감 발견을 계정에 남긴다. 연습(로컬 검증·개발자 실험)은 보상 없음.
let puzzleScreen=null,gardenHubScreen=null;
async function showSeedPuzzle(){
 mode='puzzle';touch.reset();keys.clear();stopAnimation();$('#overlay').hidden=true;
 const back=()=>{puzzleScreen=null;showDungeon();last=performance.now();realLast=Date.now();startAnimation();};
 try{
  const {mountSeedPuzzle}=await import('./seed-puzzle-view.js');
  const owner=account.user()?.uid||'guest',practice=Boolean(localInspection||developerRun);
  // 2026-09-28 로열 매치식: +5 이동·시작 전 부스터·판 안 도구를 햇살(JP)로 산다. 계정이 바뀌었으면 쓰지 않는다.
  const sameOwner=()=>owner===(account.user()?.uid||'guest');
  puzzleScreen=mountSeedPuzzle({audio,storage:runStorage,owner,practice,
   onSaveAccount:!practice&&account.user()&&!account.user().isAnonymous?async()=>{if(!sameOwner())return false;const result=await cloud.flush();return result.ok&&!cloud.isDirty();}:null,
   onPlayed:info=>{if(owner!==(account.user()?.uid||'guest'))return '';treeWater(.5);return info.won&&!info.daily?treeReward({type:'puzzle',stage:info.stage,stars:info.stars,firstThree:info.firstThree}):'';},
   wallet:()=>readShop(runStorage).coins,
   onSpend:jp=>sameOwner()&&spendCoins(runStorage,jp).ok,
   onCredit:jp=>{if(owner!==(account.user()?.uid||'guest'))return '계정이 바뀌어 적립하지 않았어요';earnCoins(runStorage,jp);return `햇살 ${jp} JP 적립`;},
   onDiscover:id=>{profile=readDiscoveries(runStorage);remember('forms',id);},
   // 2026-09-28 사용자: "성꾸미기 같은건 정원으로 연결" — 씨앗 맞추기 별로 꾸민 것은 SEED 정원 저장(계정 동기화)에 남고 3D 정원에 보인다.
   garden:{get:()=>garden,set:next=>{if(!sameOwner())return;garden=normalizeGarden(next);writeGarden(runStorage,garden);refreshGardenEffects();gardenScene?.setGarden(garden,{austinDefeated:austinKnown()});}},
   onOpenGarden:()=>showGarden(showDungeon),
   onResult:payload=>{const entry=puzzleRankEntry(payload?.progress,{uid:owner,name:playerName,stage:payload?.stage,stars:payload?.stars,score:payload?.score});return submitExtraModeRanking('puzzle',entry,practice);},
   onRanking:()=>{puzzleScreen?.close();showModeRanking('puzzle',showDungeon);},onClose:back});
  if(localInspection)window.seedPuzzle=puzzleScreen;
 }catch(error){console.error('씨앗 맞추기 시작 실패',error);back();$('#toast').textContent='씨앗 맞추기를 불러오지 못했어요. 다시 눌러 주세요.';}
}
// 2026-09-28 사용자: "정원메뉴는 앞으로 빼야 … 정원에 들어가서 다시 테마로 들어가는건데 테마는 단계별로 잠궈놔야 … 일단 첫번째 온실만 열어 놓고
// … 구성물을 배치할 때는 마음대로 배치할 수 있게 하고 구성물은 제이피 게임내 통화로 살 수 있게" — 처음 화면의 정원 → 허브 → 테마 정원.
function gardenHomeLine(){
 const opened=GARDEN_THEMES.filter(t=>themeUnlocked(garden,t.id)).length,placed=GARDEN_THEMES.reduce((n,t)=>n+themeItemCount(garden,t.id)+spotsFilled(garden,t.id),0);
 return `테마 정원 ${opened}/${GARDEN_THEMES.length} 열림 · 구성물 ${placed}`;
}
async function showGardenHub(start=null){
 mode='garden-hub';touch.reset();keys.clear();stopAnimation();$('#overlay').hidden=true;
 const owner=account.user()?.uid||'guest',sameOwner=()=>owner===(account.user()?.uid||'guest');
 const resume=()=>{gardenHubScreen=null;last=performance.now();realLast=Date.now();startAnimation();};
 try{
  const {mountGardenHub}=await import('./garden-hub-view.js');
  gardenHubScreen=mountGardenHub({audio,start,
   wallet:()=>readShop(runStorage).coins,
   onSpend:jp=>sameOwner()&&spendCoins(runStorage,jp).ok,
   onCredit:jp=>{if(!sameOwner())return false;earnCoins(runStorage,jp);return true;},
   garden:{get:()=>garden,set:next=>{if(!sameOwner())return;garden=normalizeGarden(next);writeGarden(runStorage,garden);}},
   onOpenSanctuary:()=>{resume();showGarden(()=>showGardenHub());},
   onClose:()=>{resume();showIntro();}});
  if(localInspection)window.seedGardenHub=gardenHubScreen;
 }catch(error){console.error('정원 열기 실패',error);resume();showIntro();$('#toast').textContent='정원을 불러오지 못했어요. 다시 눌러 주세요.';}
}
async function showSeedDefense({actCount=3,bossPreview=null}={}){
 const serial=++defenseLoadSerial;let accountPreparation=null,defenseNext=showDungeon;
 mode='defense-loading';touch.reset();keys.clear();stopAnimation();
 const overlay=$('#overlay');overlay.hidden=false;
 overlay.innerHTML='<div class="menu-panel defense-entry-panel"><p class="eyebrow">SEED · 씨앗 수호전</p><h2>정원을 준비하고 있어요</h2><p id="defense-load-status" role="status">수호전 파일을 불러오는 중이에요…</p><div id="defense-account-choices"></div><button id="defense-load-reload" hidden>최신 화면으로 다시 열기</button><button id="defense-load-back">돌아가기</button></div>';
 const back=()=>{if(serial!==defenseLoadSerial)return;++defenseLoadSerial;clearTimeout(slow);showDungeon();last=performance.now();realLast=Date.now();startAnimation();};
 $('#defense-load-back').onclick=back;
 $('#defense-load-reload').onclick=()=>location.reload();
 const slow=setTimeout(()=>{if(serial!==defenseLoadSerial)return;$('#defense-load-status').textContent='불러오기가 지연되고 있어요. 연결을 확인하거나 최신 화면으로 다시 열어 주세요. 저장 기록은 지우지 않아요.';$('#defense-load-reload').hidden=false;},12000);
 try{
  const {mountSeedDefense}=await import('./seed-defense-view.js');
  clearTimeout(slow);if(serial!==defenseLoadSerial)return;
  const owner=account.user()?.uid||'guest',testRun=localInspection||developerRun,circuit=publicCircuitActCount()===5?5:localInspection&&actCount===5?5:3;
  if(!testRun&&owner!=='guest'&&!account.user()?.isAnonymous){
   const {prepareDefenseAccount}=await import('./defense-account-entry.js');
   if(serial!==defenseLoadSerial)return;
   accountPreparation=await prepareDefenseAccount({storage:rawStorage,account,owner,circuit,databaseURL:FIREBASE_APP.databaseURL,practice:()=>testRun||developerRun||localInspection,isCurrent:()=>serial===defenseLoadSerial&&owner===account.user()?.uid,status:$('#defense-load-status'),controls:$('#defense-account-choices')});
   if(serial!==defenseLoadSerial){await accountPreparation?.release();return;}
   if(!accountPreparation)return;
  }
  mode='defense';overlay.hidden=true;accountPreparation?.activate();
  defenseScreen=mountSeedDefense({storage:rawStorage,owner,audio,preparation:accountPreparation?.preparation||null,bossPreview:localInspection?bossPreview:null,currentOwner:()=>account.user()?.uid||'guest',titleStats:()=>seedTitle.state(),practice:()=>testRun||developerRun||localInspection,actCount:publicCircuitActCount()===5?5:localInspection&&actCount===5?5:3,onBossDefeated:event=>localInspection&&actCount===5?true:awardModeBoss('defense',event.runId,event.boss,event.ordinal,testRun||owner!==(account.user()?.uid||'guest')),onRanking:()=>{defenseNext=showDefenseRanking;defenseScreen?.close();},onResult:async state=>{
   const entry=defenseRankEntry(state,{uid:owner,name:playerName});
   const decision=rankingDecision({isTestRun:testRun,localInspection,score:entry?.score||0,name:playerName,native:account.native,admin:adminMode,tester:betaTesterMode,user:account.user()});
   if(testRun)return '연습 기록은 온라인 랭킹에 등록하지 않아요.';
   if(owner===(account.user()?.uid||'guest')){treeWater(.5);treeReward({type:'defense',wave:state.wave,runId:state.runId});}
   if(!decision.eligible||owner!==account.user()?.uid)return '온라인 기록은 같은 계정으로 로그인한 정상 플레이만 등록해요.';
   try{await defenseRanking.submit(entry);return '계정 최고기록 확인 완료 · 사용한 씨앗도 랭킹에 남았어요.';}catch{return '온라인 등록 대기 · 이 계정에 보관하고 랭킹을 열면 다시 전송해요.';}
  },onClose:async()=>{defenseScreen=null;
   if(accountPreparation){mode='defense-loading';overlay.hidden=false;$('#defense-load-status').textContent='수호전 준비를 계정에 저장하고 있어요…';$('#defense-account-choices').replaceChildren();const saved=await accountPreparation.close();if(serial!==defenseLoadSerial)return;if(!['synced','empty'].includes(saved?.kind))$('#toast').textContent='수호전은 이 기기에 보존했어요 · 계정 전송은 다음 입장 때 다시 확인합니다';}
   defenseNext();last=performance.now();realLast=Date.now();startAnimation();}});
 }catch(error){
  clearTimeout(slow);if(serial!==defenseLoadSerial)return;
  await accountPreparation?.release();
  if(serial!==defenseLoadSerial)return;
  console.error('씨앗 수호전 시작 실패',error);
  document.querySelector('#seed-defense')?.remove();document.body.classList.remove('seed-defense-open');
  mode='defense-loading';overlay.hidden=false;
  $('#defense-load-status').textContent='수호전 파일을 불러오지 못했어요. 업데이트 전 화면이 남아 있거나 연결이 끊겼을 수 있어요. 최신 화면으로 다시 열어 주세요. 저장 기록은 지우지 않아요.';
  $('#defense-load-reload').hidden=false;
 }
}
function showDungeon(){
 retryModeBossRewards();
 mode='ready';touch.reset();keys.clear();
 $('#overlay').classList.remove('ranking-overlay','garden-mode','survival-overlay');$('#overlay').classList.add('intro','menu-screen');$('#overlay').hidden=false;
 $('#overlay').innerHTML=`<div class="menu-panel dungeon-panel dungeon-hub"><header class="dungeon-heading"><p class="eyebrow">SEED · PLAY</p><h2>어떤 도전을 떠날까요</h2><span class="menu-ornament" aria-hidden="true">✦</span></header><div class="dungeon-scroll"><div class="dungeon-modes"><button id="open-adventure" class="dungeon-mode mode-adventure"><img class="mode-art" src="${import.meta.env.BASE_URL}assets/menu/mode-adventure-v2.webp" alt="" decoding="async"><span class="mode-caption"><strong>씨앗의 모험</strong><small>직접 베고 던지는 RPG · 시범 모험</small></span></button><button id="open-duel" class="dungeon-mode mode-duel"><img class="mode-art" src="${import.meta.env.BASE_URL}assets/menu/mode-duel-v2.webp" alt="" decoding="async"><span class="mode-caption"><strong>씨앗 대전</strong><small>막기·반격·강공격 수 싸움 · 시험 1:1</small></span></button><button id="open-journey" class="dungeon-mode mode-journey"><img class="mode-art" src="${import.meta.env.BASE_URL}assets/menu/mode-journey-v1.webp" alt="" decoding="async"><span class="mode-caption"><strong>여정</strong><small>세 개의 막 · 조합을 찾아 떠나는 모험</small></span></button><button id="open-survival" class="dungeon-mode mode-survival"><img class="mode-art" src="${import.meta.env.BASE_URL}assets/menu/mode-survival-v1.webp" alt="" decoding="async"><span class="mode-caption"><strong>물량생존전</strong><small>밀려오는 숲 · 끝없이 몰려오는 무리</small></span></button><button id="open-puzzle" class="dungeon-mode mode-puzzle"><img class="mode-art" src="${import.meta.env.BASE_URL}assets/menu/mode-puzzle-v2.webp" alt="" decoding="async"><span class="mode-caption"><strong>씨앗 맞추기</strong><small>같은 법칙 셋을 한 줄로 · 3개 맞추기 퍼즐</small></span></button><button id="open-defense" class="dungeon-mode mode-defense"><img class="mode-art" src="${import.meta.env.BASE_URL}assets/menu/mode-defense-v1.webp" alt="" decoding="async"><span class="mode-caption"><strong>씨앗 수호전</strong><small>피어나는 씨앗 · 끝까지 지켜내는 정원</small></span></button></div></div><footer class="dungeon-footer"><button id="back-menu">돌아가기</button></footer></div>`;
 $('#open-adventure').onclick=()=>void showSeedAdventure();$('#open-duel').onclick=()=>void showSeedDuel();$('#open-journey').onclick=showJourneys;$('#open-survival').onclick=showSurvivalSetup;$('#open-defense').onclick=()=>void showSeedDefense();$('#open-puzzle').onclick=()=>void showSeedPuzzle();$('#back-menu').onclick=showIntro;
}
// 던전 화면: 어떤 여정을 시작할지 고른다(스테이지를 직접 고르지는 않는다).
function showJourneys(){
 mode='ready';touch.reset();keys.clear();
 $('#overlay').classList.remove('ranking-overlay','garden-mode');$('#overlay').classList.add('intro','menu-screen');$('#overlay').hidden=false;
 const saved=readCheckpoint(actStorage(runStorage,1));
 const act2Ready=act2Available()&&act2Unlocked(profile);
 const saved2=act2Ready?readCheckpoint(actStorage(runStorage,2)):null;
 const act3Ready=act3Available()&&act3Unlocked(profile);
 const saved3=act3Ready?readCheckpoint(act3Storage(runStorage)):null;
 const expansionReady=expansionCircuitReleased()&&!localInspection&&!account.user()?.isAnonymous&&Boolean(account.user()?.uid),expansionRows=expansionReady?Object.entries(EXPANSION_ACTS).map(([act,definition])=>({act,definition,record:createExpansionAccountSaveStore(rawStorage,act,expansionOwner(),{context:()=>({currentOwner:expansionOwner(),inspection:false,practice:false,acts:EXPANSION_ACTS})}).read()})):[];
 const mirrorReady=MIRROR_TRIAL_PROTOTYPE.released&&austinKnown(),mirrorRecord=readMirrorRecord(runStorage),mirrorCheckpoint=readMirrorCheckpoint(runStorage);
 // 2026-09-23 테스터 신고: 다른 기기에서 더 나중에 시작한 판이 이 기기의 더 긴 판을 덮었다(cloud-save.js replacedRuns).
 // 덮인 판을 맞바꿔 되살린다. 되살린 판은 지금 시각으로 저장되어 다른 기기에서도 이어진다.
 const backups=readCheckpointBackups(runStorage),restoreStores={act1:actStorage(runStorage,1),act2:actStorage(runStorage,2),act3:act3Storage(runStorage)};
 const restoreRuns=[['act1','1막',true],['act2','2막',act2Ready],['act3','3막',act3Ready]].filter(([act,,ready])=>ready&&backups[act]).map(([act,label])=>{const b=backups[act].checkpoint,bosses=b.austins?` · 보스 ${b.austins}번 처치`:'';return {act,label,detail:`여정 ${b.cycle+1} · ${b.stage+1}번째 방${bosses} · ${Math.round(b.elapsed/60)}분 진행`};});
 const where=saved?`여정 ${saved.cycle+1} · ${saved.mode==='crossroads'?'다음 여정':saved.mode==='austin'?AUSTIN.name:(saved.stage+1)+'번째 방'}`:'',shop=readShop(runStorage);
 const art=(back,boss,sheet=false)=>`<span class="journey-picture" style="background-image:url('${import.meta.env.BASE_URL}assets/${back}')"><span class="journey-boss ${sheet?'sheet':''}" style="background-image:url('${import.meta.env.BASE_URL}assets/mobile/${boss}')"></span></span>`;
 const expansionCardArt=act=>`<span class="journey-picture" style="background-image:url('${import.meta.env.BASE_URL}assets/expansion/${act==='crosswind'?'act4-crosswind-plate-mobile-v1.webp':'act5-crystal-gorge-plate-mobile-v1.webp'}')"><span class="journey-boss sheet" style="background-size:400% 200%;background-image:url('${import.meta.env.BASE_URL}assets/expansion/${act==='crosswind'?'boss-crosswind-motion-mobile-v1.webp':'boss-crystal-motion-mobile-v1.webp'}')"></span></span>`;
 const actCard=(id,number,title,description,picture,ready=true)=>`<button id="${id}" class="journey-card act-card-${number}" ${ready?'':'disabled'}>${picture}<span class="journey-act">${number}막</span><span class="journey-caption"><strong>${title}</strong><small>${description}</small></span></button>`;
 $('#overlay').innerHTML=`<div class="menu-panel dungeon-panel journey-panel">
  <header class="dungeon-heading"><p class="eyebrow">SEED · JOURNEY</p><h2>어디로 떠날까요</h2><span class="menu-ornament" aria-hidden="true">✦</span></header>
  <div class="dungeon-scroll">
   <button id="open-shop" class="journey-shop"><strong>출발 상점</strong><small>가져갈 물약 · ${itemCounts(shop.carry)||'없음'}</small><span aria-hidden="true">→</span></button>
   <div class="journey-grid">
    ${actCard(saved?'continue-run':'start-game',1,'잠든 정원',saved?'이어하기 · '+escapeHtml(where):'새 씨앗으로 출발 · 오스틴',art('mobile/ground-garden-v5.webp','boss-austin-v1.webp',true))}
    ${actCard('start-act2',2,'야간 경기장',act2Ready?(saved2?`이어하기 · 여정 ${saved2.cycle+1}`:'베이스를 타고 돌파 · 항상초심'):'오스틴 격파 후 열려요',art('stadium-clay-hd-v1.webp','boss-always-beginner-v1.webp',true),act2Ready)}
    ${actCard('start-act3',3,'폭풍의 항로',act3Ready?(saved3?`이어하기 · 여정 ${saved3.cycle+1}`:'폭풍을 뚫는 비행 · 요한'):'항상초심 격파 후 열려요',art('mobile/act3-storm-route-v1.webp','boss-johan-core-v1.webp'),act3Ready)}
    ${expansionRows.map(({act,definition,record})=>actCard('start-'+act,definition.number,definition.name,record&&!record.entry.ended?'이어하기 · '+(record.campaign?.lap+1||1)+'순환':'새 씨앗으로 출발 · '+definition.bossName,expansionCardArt(act))).join('')}
   </div>
   <details class="journey-extra"><summary>별도 도전 · 거울의 탑</summary>${mirrorReady?`<button id="start-mirror" class="menu-item mirror-button"><strong>거울의 탑 · 100층</strong><small>${mirrorRecord.bestFloor?`최고 ${mirrorRecord.bestFloor}층 · `:''}같은 조합을 쓰는 분신과 승부</small></button>${mirrorCheckpoint?`<button id="continue-mirror" class="menu-item mirror-button">거울의 탑 ${mirrorCheckpoint.floor}층 이어하기</button>`:''}`:'<p>오스틴을 쓰러뜨리면 열려요.</p>'}</details>
   ${saved||saved2||saved3||restoreRuns.length?`<details class="journey-extra"><summary>저장 관리 · 새로 시작</summary>${saved?'<button id="start-game" class="menu-item">1막 새로 시작</button>':''}${saved2?'<button id="new-act2" class="menu-item">2막 새로 시작</button>':''}${saved3?'<button id="new-act3" class="menu-item">3막 새로 시작</button>':''}${restoreRuns.map(r=>`<button id="restore-${r.act}" class="menu-item restore-run"><strong>${r.label} 이전 저장 되살리기</strong><small>${escapeHtml(r.detail)} · 현재 판과 맞바꿔요</small></button>`).join('')}</details>`:''}
  </div>
  <footer class="dungeon-footer"><button id="back-menu">돌아가기</button></footer>
 </div>`;
 for(const {act,record} of expansionRows)$('#start-'+act).onclick=()=>{if(!requireName())return;void startPublicExpansionJourney(act,{resume:Boolean(record&&!record.entry.ended)});};
 const enter=(run,selectedRegion='garden')=>{if(!requireName())return;mirrorSession=null;startRegion=selectedRegion;$('#overlay').classList.remove('intro','menu-screen');if(run)restart(run);else startGame();};
 for(const r of restoreRuns)$(`#restore-${r.act}`).onclick=()=>{const store=restoreStores[r.act],current=readCheckpoint(store),backup=backups[r.act].checkpoint;if(!writeCheckpoint(store,backup)){$('#toast').textContent='판을 되살리지 못했어요';return;}setCheckpointBackup(runStorage,r.act,current);$('#toast').textContent=`${r.label} 판을 되살렸어요${current?' · 바꾼 판은 다시 맞바꿀 수 있어요':''}`;showJourneys();};
 if($('#continue-run'))$('#continue-run').onclick=()=>enter(saved);
 $('#start-game').onclick=()=>enter(null);
 $('#open-shop').onclick=()=>showShop(showJourneys);
 if(act2Ready&&$('#start-act2'))$('#start-act2').onclick=()=>enter(saved2||null,ACT2_REGION);
 if($('#new-act2'))$('#new-act2').onclick=()=>enter(null,ACT2_REGION);
 if(act3Ready&&$('#start-act3'))$('#start-act3').onclick=()=>enter(saved3||null,ACT3_REGION);
 if($('#new-act3'))$('#new-act3').onclick=()=>enter(null,ACT3_REGION);
 if($('#start-mirror'))$('#start-mirror').onclick=()=>{if(!requireName())return;$('#overlay').classList.remove('intro','menu-screen');startMirrorTower({publicRun:true});};
 if($('#continue-mirror'))$('#continue-mirror').onclick=()=>{if(!requireName())return;$('#overlay').classList.remove('intro','menu-screen');startMirrorTower({publicRun:true,checkpoint:readMirrorCheckpoint(runStorage)});};
 $('#back-menu').onclick=showDungeon;
}
// Every visible ranking line shows its build. Legacy runs explain why they cannot.
function rankBuild(entry,place,showBoss=true){
 const b=parseBuild(entry.build);
 if(!b)return '<div class="rank-build none">조합 기록 없음</div>';
 const boss=showBoss?`<span class="rank-boss">${bossText(entry.build,isAct3(entry.region)?ACT.JOHAN:runAct(entry))}</span>`:'';
 const chips=[...b.forms.map(([id,lv])=>`<span class="rank-chip form">${formArt(id,'rank-art')}${FORMS[id].name} <i>Lv.${lv}</i></span>`),...b.laws.map(([id,lv])=>`<span class="rank-chip">${lawArt(id,'rank-art')}${LAWS[id].name} <i>Lv.${lv}</i></span>`),b.relic?`<span class="rank-chip relic">${relicArt(b.relic,'rank-art')}유물 ${RELICS[b.relic].name}</span>`:''].join('');
 return `<div class="rank-build" title="${escapeHtml(buildText(entry.build))}">${boss}${chips}</div>`;
}
function defenseRankBuild(entry){
 const towers=parseDefenseTowers(entry.towers);if(!towers)return '<div class="rank-build none">씨앗 조합 기록 없음</div>';
 return '<div class="rank-build">'+towers.map(([id,lv],i)=>`<span class="rank-chip ${FORMS[id]?'form':''}">${FORMS[id]?formArt(id,'rank-art'):LAWS[id]?lawArt(id,'rank-art'):'<span class="rank-art rank-seed">♧</span>'}${i+1}. ${FORMS[id]?.name||LAWS[id]?.name||'씨앗'} <i>강화 ${lv}</i></span>`).join('')+'</div>';
}
function rankSafety(entry){
 if(!entry?.uid||entry.uid===online.uid())return '';
 return `<div class="rank-actions"><a href="${escapeHtml(rankingReportMailto(entry))}">신고</a><button type="button" data-block-ranker="${escapeHtml(entry.uid)}">이 사용자 숨기기</button></div>`;
}
function bindRankSafety(){document.querySelectorAll('[data-block-ranker]').forEach(button=>button.onclick=()=>{blockRankingUser(runStorage,button.dataset.blockRanker);button.closest('li')?.remove();$('#toast').textContent='이 사용자의 기록을 내 화면에서 숨겼어요';});}
function rankingBoard(board,mine=null,onlineView=false,personalRank=0,personalLoading=false,personalError=false){
 const shown=onlineView?visibleRanking(board,runStorage):board;
 const topMine=mine&&shown.slice(0,10).find(entry=>entry===mine||(entry.id&&entry.id===mine.id));
 const details=onlineView?(entry,place)=>rankBuild(entry,place)+rankSafety(entry):rankBuild;
 const top=`<section class="ranking-top"><strong>TOP 10</strong>${rankingTable(shown,topMine,10,details)}</section>`;
 if(topMine)return top;
 const place=personalRank>0?personalRank:'—';
 const own=mine?rankingTable([mine],mine,1,rankBuild,place):`<p class="ranking-empty">${personalLoading?'내 기록을 확인하는 중…':personalError?'내 기록을 불러오지 못했어요. 다시 열어 확인해 주세요.':'이 계정으로 등록된 기록이 아직 없어요.'}</p>`;
 return top+`<section class="ranking-self"><strong>내 기록${personalRank>0?' · '+personalRank+'위':''}</strong>${own}</section>`;
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
   // 훈련장은 비교 방식과 보상을 다시 정할 때까지 진입점만 숨긴다.
   // 구현과 개인 최고기록은 보존해 두어 나중에 안전하게 다시 켤 수 있다.
   onSelect:selectGardenSpot,
   onClose:()=>gardenReturn()
 });
}
function showTrainingSetup(){
 const found=(adminMode?Object.keys(FORMS):profile.forms).filter(id=>FORMS[id]);mode='training-setup';touch.reset();keys.clear();ensureGardenScene();
 $('#overlay').hidden=false;$('#overlay').classList.remove('garden-mode','ranking-overlay');$('#overlay').classList.add('intro','menu-screen');
 $('#overlay').innerHTML=`<div class="menu-panel training-setup"><p class="eyebrow">GARDEN · TRAINING</p><h2>정원 훈련장</h2><p>발견한 진화 하나를 Lv.5로 맞추고 15초 동안 실제 자동공격을 측정합니다.</p>${found.length?`<label class="training-select"><span>측정할 진화</span><select id="training-form">${found.map(id=>`<option value="${id}">${escapeHtml(FORMS[id].name)}</option>`).join('')}</select></label><button id="training-start" class="menu-item"><strong>훈련 시작</strong><small>점수·아이템·여정 기록에는 남지 않아요</small></button>`:'<p class="form-note">먼저 전투에서 진화를 하나 발견하면 훈련장을 사용할 수 있어요.</p>'}<button id="training-back" class="menu-item small-item">정원으로 돌아가기</button></div>`;
 if($('#training-start'))$('#training-start').onclick=()=>startTraining($('#training-form').value);$('#training-back').onclick=()=>showGarden(gardenReturn);
}
function startTraining(formId){
 if(!FORMS[formId]||(!adminMode&&!profile.forms.includes(formId)))return;trainingSession={formId,start:0,duration:15};developerRun=true;startRegion='garden';restart();
 for(const e of enemies)releaseEnemy(e);enemies=[];for(const p of [...shots,...enemyShots,...effects])release(p.ob);shots=[];enemyShots=[];effects=[];crowdLeft=0;crowdTimer=999;roomCleared=false;
 heldForms.set(formId,5);syncForms(true);growth.select(effectiveLaws(),mutated);updateFormLabel();
 const dummy=enemy('caster',0,-2.8);dummy.type='training-dummy';dummy.hp=dummy.maxHp=1e9;dummy.g.scale.setScalar(1.45);trainingSession.start=elapsed;combatAnalysis.begin(elapsed,{training:true,formId});
 $('#encounter').textContent=`정원 훈련장 · ${FORMS[formId].name} · 15초`;$('#toast').textContent='훈련용 허수아비를 공격하세요 · 결과는 도감 개인 기록에 반영됩니다';
}
function finishTraining(){
 if(!trainingSession)return;const report=finishRoomAnalysis(true),formId=trainingSession.formId;
 profile=writeDiscoveries(runStorage,recordPersonalBests(profile,report));for(const e of enemies)releaseEnemy(e);enemies=[];for(const p of [...shots,...enemyShots,...effects])release(p.ob);shots=[];enemyShots=[];effects=[];clearForms();
 mode='training-result';touch.reset();keys.clear();$('#boss-hud').hidden=true;$('#overlay').hidden=false;$('#overlay').classList.remove('garden-mode','ranking-overlay');$('#overlay').classList.add('intro','menu-screen');
 const own=report?.sources.find(row=>row.id===formId);$('#overlay').innerHTML=`<div class="menu-panel training-result"><p class="eyebrow">TRAINING COMPLETE</p><h2>${escapeHtml(FORMS[formId].name)}</h2><div class="training-score"><strong>${Math.round(own?.dps||0)} DPS</strong><span>전체 조합 ${Math.round(report?.dps||0)} · 최고 1초 ${Math.round(report?.peak||0)}</span></div><p>도감의 개인 최고기록에 저장했습니다. 같은 조건에서 다른 진화와 비교해 보세요.</p><button id="training-again" class="menu-item"><strong>다른 진화 측정</strong></button><button id="training-finish" class="menu-item small-item">정원으로 돌아가기</button></div>`;
 $('#training-again').onclick=()=>{trainingSession=null;developerRun=false;showTrainingSetup();};$('#training-finish').onclick=()=>{trainingSession=null;developerRun=false;showGarden(gardenReturn);};
}
function showGarden(back=showIntro){
 audio.setScene('garden');
 gardenReturn=back;mode='garden';touch.reset();keys.clear();
 refreshGardenEffects();ensureGardenScene();gardenSelection=null;if(gardenScene)gardenScene.select(-1);
 $('#overlay').hidden=false;$('#overlay').classList.remove('intro','menu-screen','ranking-overlay');$('#overlay').classList.add('garden-mode');
 paintGardenPanel();
}
function showDiscoveries(back=showIntro){
 mode='discoveries';touch.reset();keys.clear();
 const bookProfile=adminMode?{...profile,forms:Object.keys(FORMS)}:profile;
 $('#overlay').hidden=false;$('#overlay').classList.remove('intro','menu-screen','garden-mode','ranking-overlay');
 $('#overlay').innerHTML=discoveryBook(bookProfile,seedTitle.state());
 $('#close-discoveries').onclick=back;
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
 if(['crosswind','crystal'].includes(view)&&!expansionCircuitReleased())view='online';
 const remote=['online','austin','always','johan','crosswind','crystal'].includes(view),locked=gameplayPaused(),bossAct=view==='austin'?ACT.AUSTIN:view==='always'?ACT.ALWAYS_BEGINNER:view==='johan'?ACT.JOHAN:view==='crosswind'?ACT.CROSSWIND_KEEPER:view==='crystal'?ACT.CRYSTAL_GARDENER:null;
 const localBoard=readRanking(view==='act3'?act3Storage(runStorage):view==='act2'?actStorage(runStorage,2):runStorage),localMine=localBoard.find(e=>e.name===playerName)||null;
 const tabs=`<div class="rank-season"><strong>${SEASON.name}</strong><div class="rank-tabs"><button class="primary" data-board="online" aria-pressed="${view==='online'}">종합</button><button class="primary" data-board="austin" aria-pressed="${view==='austin'}">오스틴</button><button class="primary" data-board="always" aria-pressed="${view==='always'}">항상초심</button><button class="primary" data-board="johan" aria-pressed="${view==='johan'}">요한</button>${expansionCircuitReleased()?`<button class="primary" data-board="crosswind" aria-pressed="${view==='crosswind'}">횡풍의 수호자</button><button class="primary" data-board="crystal" aria-pressed="${view==='crystal'}">수정의 정원사</button>`:''}</div></div>${locked?'':`<div class="rank-tabs secondary"><button class="primary" data-board="local" aria-pressed="${view==='local'}">1막 · 이 기기</button>${act2Available()&&act2Unlocked(profile)?`<button class="primary" data-board="act2" aria-pressed="${view==='act2'}">2막 · 이 기기</button>`:''}${act3Available()&&act3Unlocked(profile)?`<button class="primary" data-board="act3" aria-pressed="${view==='act3'}">3막 · 이 기기</button>`:''}</div>`}`;
 const boardLabel=view==='austin'?'오스틴 최고 기록':view==='always'?'항상초심 최고 기록':view==='johan'?'폭풍비행사 요한 최고 기록':view==='crosswind'?'횡풍의 수호자 최고 기록':view==='crystal'?'수정의 정원사 최고 기록':view==='act3'?'폭풍비행사 요한 · 이 기기 최고 기록':'가장 높이 오른 씨앗들';
 $('#overlay').innerHTML=`<div class="ranking-panel"><p>${boardLabel}</p><h2>명예의 전당</h2>${tabs}<p id="rank-status" class="form-note">${remote?'불러오는 중…':'상위 10명 · 10위 밖이면 내 순위를 아래에 표시'}</p><div id="rank-board">${!remote?rankingBoard(localBoard,localMine):''}</div></div><button class="primary" id="close-ranking">돌아가기</button>`;
 $('#close-ranking').onclick=locked?showSeasonPause:showIntro;document.querySelectorAll('[data-board]').forEach(b=>b.onclick=()=>showRanking(b.dataset.board));
 if(!locked){$('.rank-season .rank-tabs').insertAdjacentHTML('beforeend','<button class="primary" id="hall-survival-ranking">물량생존전</button><button class="primary" id="hall-defense-ranking">씨앗 수호전</button>');$('#hall-survival-ranking').onclick=()=>showSurvivalRanking(()=>showRanking(view));$('#hall-defense-ranking').onclick=()=>showDefenseRanking(()=>showRanking(view));}
 if(!locked)for(const [kind,label] of [['adventure','씨앗의 모험'],['duel','씨앗 대전'],['puzzle','씨앗 맞추기']]){const button=document.createElement('button');button.className='primary';button.textContent=label;button.onclick=()=>showModeRanking(kind,()=>showRanking(view));$('.rank-season .rank-tabs').append(button);}
 if(!remote)return;
 const readBoard=()=>online.top(500,playerName,SEASON,bossAct);
 online.flush().catch(()=>0).then(readBoard).then(board=>{
  if(serial!==rankSerial)return;setText($('#rank-status'),`${bossAct===ACT.AUSTIN?'오스틴 · ':bossAct===ACT.ALWAYS_BEGINNER?'항상초심 · ':bossAct===ACT.JOHAN?'요한 · ':bossAct===ACT.CROSSWIND_KEEPER?'횡풍의 수호자 · ':bossAct===ACT.CRYSTAL_GARDENER?'수정의 정원사 · ':''}상위 10명 · 10위 밖이면 내 순위를 아래에 표시`);
  const mine=board.find(e=>e.uid===online.uid())||null,box=$('#rank-board');if(box){box.innerHTML=rankingBoard(board,mine,true,0,!mine);bindRankSafety();}
  online.personalRank(SEASON,bossAct).then(personal=>{
   if(serial!==rankSerial)return;
   const current=$('#rank-board');if(current){current.innerHTML=rankingBoard(board,personal.entry||mine,true,personal.rank);bindRankSafety();}
  }).catch(()=>{
   if(serial!==rankSerial)return;
   const current=$('#rank-board');if(current){current.innerHTML=rankingBoard(board,mine,true,0,false,true);bindRankSafety();}
  });
 }).catch(()=>{
  if(serial!==rankSerial)return;const status=$('#rank-status');if(status)status.innerHTML='랭킹 서버에 잠깐 연결하지 못했어요 · <b>모두의 기록은 서버에 그대로 있어요</b><br><button class="primary" id="rank-retry">다시 불러오기</button>';
  const retry=$('#rank-retry');if(retry)retry.onclick=()=>showRanking(view);
 });
}
// Falling ends the run: the score goes to this browser's board at once and to everyone's ranking in the background.
function showEnd(deathReport=null,{cleared=false,newTitle=null,bonus=0}={}){perfFinish(cleared?'cleared':'ended');touch.reset();$('#overlay').classList.remove('intro','menu-screen','garden-mode');activeVfx.clear();cancelActive(activeGauge);$('#active-cinematic').hidden=true;$('#active-cinematic').innerHTML='';$('#item-bar').hidden=true;$('#active-skill').hidden=true;$('#item-status').hidden=true;$('#room-analysis').hidden=true;
 if(developerRun){$('#overlay').hidden=false;$('#overlay').classList.add('intro','menu-screen','developer-mode');$('#overlay').innerHTML=`<div class="menu-panel developer-panel developer-end"><p class="eyebrow">SEED · ADMIN ONLY</p><h2>${cleared?'완주 · 실험':'실험 종료'}</h2><p>점수·보상·도감·정원·저장에는 아무것도 남지 않았습니다.</p><div class="developer-footer"><button id="developer-retry">실험실로</button><button id="developer-end-main">메인으로</button></div></div>`;$('#developer-retry').onclick=showDeveloperLab;$('#developer-end-main').onclick=showIntro;logRankingFailure(null,{uid:account.user()?.uid,score,reason:'test_run'});return;}
 const serial=++rankSerial,name=playerName||lastName(runStorage),ranked=!localInspection&&!developerRun&&score>0&&Boolean(name);
 const build=buildRecord({levels,forms:heldForms,relic:relics.equipped,wardens:wardensDefeated,austins:austinsDefeated});
 // 정원: 이번 여정이 남긴 씨앗을 자동으로 심고, 심어진 식물에 성장점을 준다.
 const gardenBoss=austinsDefeated>0?(isAct3(region)?'tempestcarrier':isAct2(region)?'alwaysbeginner':'austin'):null;
 lastHarvest=harvestFromRun({levels:Object.fromEntries(effectiveLevels(levels,heldForms)),forms:Object.fromEntries(heldForms),wardens:wardensDefeated,austins:austinsDefeated,bossId:gardenBoss,score,kills,journey:cycle+1,elapsed,dashes:runDashes,damageTaken:runDamageTaken});
 garden=growPlants(addHarvest(garden,lastHarvest),lastHarvest.growth);writeGarden(runStorage,garden);refreshGardenEffects();
 treeWater(1+Math.min(2,wardensDefeated));
 // 보낼 값은 판이 끝난 지금 그대로 찍어 둔다. 예전에는 flush()가 끝난 뒤에야 점수·처치를 읽어서,
 // 그 사이에 다음 판을 시작하면 앞뒤가 안 맞는 기록이 랭킹에 올라갔다.
 const entry={name,score,cycle,stage,kills,time:elapsed,act:isAct3(region)?ACT.JOHAN:isAct2(region)?ACT.ALWAYS_BEGINNER:ACT.AUSTIN,region,done:cleared,build};
 if(ranked){submitScore(actStore(),entry);const act=isAct3(region)?'act3':isAct2(region)?'act2':'act1',before=readAccountProfile(runStorage),after=recordBestScore(before,act,score);if(after.bestScores[act]>before.bestScores[act])writeAccountProfile(runStorage,after);}
 $('#overlay').hidden=false;$('#overlay').innerHTML=`<p>${cleared?`${finalBossName()}을 ${FINAL_BOSS_CAP}번 이겼습니다`:'씨앗은 다시 뿌리를 내립니다'}</p><h2>${cleared?'완주!':'잠든 씨앗'}</h2><div class="final-score${cleared?' cleared':''}"><small>${name?escapeHtml(name)+'의 ':''}최종 점수</small><strong>${formatScore(score)}</strong><span>${cleared?'3회 격파 · 완주 · ':''}여정 ${cycle+1} · ${cleared?'':inAustinRoom()?finalBossName()+' · ':(stage+1)+'번째 방 · '}${kills} 처치 · ${formatTime(elapsed)}</span></div><p id="rank-status" class="rank-result">${ranked?'모두의 랭킹에 올리는 중…':localInspection?'로컬 검사 · 랭킹에 올리지 않습니다':'점수가 없어서 랭킹에 올리지 않았어요'}</p><div class="end-actions"><button class="primary" id="restart">돌아가기</button><button class="discovery-link" id="end-ranking">랭킹 보기</button></div>`;
 if(deathReport)$('#rank-status').insertAdjacentHTML('beforebegin',combatAnalysisSummary(deathReport));
 if(cleared)$('#rank-status').insertAdjacentHTML('beforebegin',`<p class="clear-bonus">완주 보너스 <b>+${formatScore(bonus)}</b> · ${bonus>0?'빨리 끝낸 만큼 더했어요':`${Math.round(CLEAR_BONUS.baseSeconds/60)}분 안에 끝내면 보너스가 붙어요`}</p>`);
 if(newTitle)$('#rank-status').insertAdjacentHTML('beforebegin',`<p class="clear-title">새 칭호 <b>'${escapeHtml(newTitle.name)}'</b> · ${escapeHtml(newTitle.perk)}</p>`);
 $('#restart').onclick=showIntro;
 $('#end-ranking').onclick=()=>showRanking(isAct3(region)?'johan':'online');
 if(!ranked)return;
 // 화면 시계와 실제 시계가 크게 어긋난 판(게임 속도를 바꾸는 도구)은 모두의 랭킹에 올리지 않는다.
 const role=accountRole({admin:adminMode,tester:betaTesterMode}),decision=rankingDecision({isTestRun:developerRun,localInspection,score,name,native:account.native,admin:role.isAdmin,tester:role.isTester,user:account.user(),paceTrusted:paceTrusted(paceGame,paceReal)});
 if(!decision.eligible){logRankingFailure(runStorage,{uid:account.user()?.uid,score,reason:decision.reason});setText($('#rank-status'),decision.reason==='invalid_score'?'게임 속도가 평소와 달라서 이 판은 모두의 랭킹에 올리지 않았어요 · 이 기기 기록에는 남아요':`이 기기 기록에는 남았어요 · ${SEASON.name.split(' · ')[0]} 랭킹은 Android 앱 또는 등록된 PC 웹 테스터의 Google 계정 기록만 받아요`);return;}
 online.flush().catch(()=>0).then(()=>online.submit(entry,500)).then(r=>{
  if(serial!==rankSerial)return;
  const status=$('#rank-status');
  if(status)status.innerHTML=r.rank?`모두의 랭킹 <b>${r.rank}위</b>에 올랐어요!`:r.bestRank?`기록했어요 · ${escapeHtml(name)}의 최고 기록은 <b>${r.bestRank}위</b>`:'기록했어요 · 아직 상위권 밖이에요';
 }).catch(error=>{
  logRankingFailure(runStorage,{uid:online.uid()||account.user()?.uid,score,reason:classifySubmitError(error)});
  if(serial!==rankSerial)return;
  const status=$('#rank-status');if(status)status.innerHTML='지금은 랭킹 서버에 연결하지 못했어요 · 이 기록은 기기에 보관했다가 다음에 자동으로 올라가요<br><b>랭킹 보기</b>에서 다시 확인할 수 있어요';
 });
}
// 점검 중 화면. 정원은 뒤에 그대로 보이고, 들어갈 단추는 두지 않는다.
function showMaintenance(){
 mode='maintenance';touch.reset();keys.clear();
 $('#overlay').classList.remove('ranking-overlay','garden-mode');$('#overlay').classList.add('intro','menu-screen');$('#overlay').hidden=false;
 $('#overlay').innerHTML=`<div class="menu-panel maintenance-panel"><p class="eyebrow">SEED</p><h2>${escapeHtml(MAINTENANCE.title)}</h2>${MAINTENANCE.lines.map(line=>`<p class="maintenance-line">${escapeHtml(line)}</p>`).join('')}</div>`;
}
function restart(saved=null,{expansion=false}={}){if(!protectJourneyBossReceipts()||saved?.pendingBossTitles?.length&&saved.bossReceiptOwner!==(account.user()?.uid||'guest')){$('#toast').textContent='이전 보스 기록을 보관하지 못해 새 판을 시작하지 않았어요. 저장을 확인한 뒤 다시 시도해 주세요.';return;}if(!expansion){++expansionLaunch;void releaseExpansionSaveLease();expansionChannel='inspection';expansionPublicEntry=null;expansionPublicSync=null;expansionFreshExpected=null;expansionPendingBossCheckpoint=null;}expansionJourney=null;expansionTerrain=null;expansionJourneyView?.setActive(false);if(gameplayPaused()){showSeasonPause();return;}if(maintenanceOn){showMaintenance();return;}const candidate=saved?.version===1?saved:null,playable=r=>playableAct3Region(playableRegion(r),globalThis.location,developerRun),regionBlocked=candidate&&playable(candidate.region)!==candidate.region,restore=regionBlocked?null:candidate;currentJourneyOwner=account.user()?.uid||'guest';currentJourneyRunId=journeyRunId(restore);pendingJourneyBossTitles=(restore?.pendingBossTitles||[]).map(e=>({...e}));region=playable(restore?.region||startRegion);if(touch.enabled)appShell.enterFullscreen();perfBegin();if(!expansion&&!restore&&!developerRun&&!survivalSession&&protectJourneyBossReceipts())clearCheckpoint(actStore());heldForms.clear();rerollUsed=restore?.rerollUsed===true;if(restore)guideTarget=profile.forms.includes(restore.guideTarget)?restore.guideTarget:null;promptedForms.clear();clearEscorts();vfx.clear();wells.length=0;orbitGroup.visible=false;touch.reset();for(let e of enemies)releaseEnemy(e);for(const f of fallen)releaseEnemy(f.e);fallen.length=0;for(let p of [...shots,...enemyShots,...effects])release(p.ob);enemies=[];shots=[];enemyShots=[];effects=[];levels.clear();bankedUpgrades=0;syncLaws();choicesTaken=0;choiceKills=0;runBonusOffer=null;dashLock=0;pulls.length=0;orbitHits.clear();chosen.clear();mutated.clear();roomCleared=false;exitOpen=false;growth.reset();playerMotion.reset();player.visible=true;evolutionTime=0;$('#evolution').hidden=true;$('#active-cinematic').hidden=true;$('#active-cinematic').innerHTML='';updateFormLabel();document.querySelectorAll('#rules>div').forEach(n=>n.classList.remove('active'));hp=maxPlayerHp();playerSlow=0;dashState=createDashState();invuln=1;shootCD=0;keyboardDash=false;keys.clear();player.userData.dashTime=0;stage=0;kills=0;elapsed=0;runDashes=0;runDamageTaken=0;player.position.set(0,0,5);mode='playing';paused=false;if(!expansion&&!developerRun&&!survivalSession)void webTelemetry.playStart(isAct3(region)?3:isAct2(region)?2:1);$('#overlay').hidden=true;$('#pause').textContent='Ⅱ';$('#toast').textContent='';$('#overlay').classList.remove('intro','menu-screen','developer-mode','garden-mode','ranking-overlay');lastMove.set(0,0,1);cycle=restore?.cycle||0;score=restore?restoredScore(restore):0;paceGame=0;paceReal=0;wardensDefeated=restore?restoredWardens(restore):0;austinsDefeated=restore?restoredAustins(restore):0;inventory=restore?normalizeInventory(restore.inventory):startingInventory();runBonuses=normalizeRunBonuses(restore?.runBonuses);if(!expansion&&!restore&&!developerRun&&!survivalSession)for(const [id,n] of Object.entries(claimCarry(runStorage)))addItem(inventory,id,n);turretPotionDry=restore?.turretPotionDry||0;hasteTime=0;shellTime=0;selectedItem=null;itemBarKey='';relics=normalizeRelics(restore?.relics);dashRelicReady=false;relicRewardPending=false;dashState=createDashState(restore?.dashEvolution);dashRewardPending=Boolean(restore&&wardensDefeated>=1&&!dashState.id);austinRoom=false;potionCD=0;
 if(survivalSession){inventory=emptyInventory();addItem(inventory,'tonic',2);relics=emptyRelics();dashRewardPending=false;}
 if(mirrorSession){inventory=emptyInventory();runBonuses=emptyRunBonuses();relics=emptyRelics();hp=100;dashRewardPending=false;}
 if(restore){stage=restore.stage;hp=Math.min(maxPlayerHp(),restore.hp);kills=restore.kills;elapsed=restore.elapsed;runDashes=restore.playDashes||0;runDamageTaken=restore.playDamage||0;for(const [id,v] of levelsFromSave(restore))levels.set(id,v);bankedUpgrades=restore.banked||0;syncLaws();choicesTaken=restore.choicesTaken||0;choiceKills=restore.choiceKills||0;growth.select(effectiveLaws(),mutated);growth.update(0,0,false);updateFormLabel();}
 for(const [id,lv] of Object.entries(restore?.forms||{}))if(Object.hasOwn(FORMS,id))heldForms.set(id,lv);
 // 변이는 이어하기에서만 돌아온다. 새 여정은 빈 상태로 시작한다.
 mutations.clear();for(const [law,kind] of mutationsFromSave(restore?.mutations))mutations.set(law,kind);
 clearRunes();
 activeGauge=createActiveGauge(restore?.activeGauge||0,restore?.activeCooldown||0);activeReadyAnnounced=false;audio.setPaused(false);finaleEchoes.length=0;promptedSolo.clear();promptedAwaken.clear();promptedSecond.clear();
 if(restore?.form&&!heldForms.size&&canFuse(levels,restore.form))bankAndFuse(restore.form);
 syncLaws();syncForms(true);growth.select(effectiveLaws(),mutated);
 if(!expansion){if(restore?.mode==='crossroads')nextJourney();else{austinRoom=restore?.mode==='austin';wave();}}
 if(!expansion&&!restore){
  itemBarKey='';
  const departure=itemCounts(inventory);
  $('#toast').textContent=mirrorSession?'':departure
   ?`${departure} 가지고 출발해요${inventory.sprout?' · 다시 싹은 쓰러지면 자동 사용':' · Q로 사용'}`
   :'가져온 물약 없이 출발해요 · 출발 상점에서 준비할 수 있어요';
 }}

function togglePause(){if(saveExitBusy||mode!=='playing'&&mode!=='evolving')return;paused=!paused;touch.reset();keys.clear();keyboardDash=false;if(paused)player.visible=true;$('#pause').textContent=paused?'▶':'Ⅱ';$('#toast').textContent='';audio.setPaused(paused);if(paused){void webTelemetry.playPause();exitWithoutSaveArmed=false;$('#save-exit').textContent=saveExitLabel();pauseBuild.show(levels,heldForms,{survival:Boolean(survivalSession),killScale:survivalSession?SURVIVAL.killChargeScale:1});}else{pauseBuild.hide();$('#pause').focus({preventScroll:true});}}
window.addEventListener('keydown',e=>{if(mode==='defense'||mode==='adventure')return;if(e.target?.closest?.('input,textarea'))return;if(['Enter','Space'].includes(e.code)&&e.target?.closest?.('button,summary,a,select'))return;if(!e.repeat){const pick={Digit1:1,Digit2:2,Digit3:3,Numpad1:1,Numpad2:2,Numpad3:3}[e.code];if(pick){if(pickChoice(pick))e.preventDefault();}else if(e.code==='KeyF')useActive();else if(e.code==='KeyQ'&&e.shiftKey){selectedItem=nextHeld(inventory,selectedItem);itemBarKey='';if(selectedItem)$('#toast').textContent=`${ITEMS[selectedItem].name} 고름 · Q로 마시기`;}else if(e.code==='KeyQ')useInventoryItem(selectedItem&&inventory[selectedItem]>0?selectedItem:nextHeld(inventory));}if(['Space','KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();keys.add(e.code);if(e.code==='Space'&&!e.repeat&&mode==='playing'&&!paused)keyboardDash=true;if(!e.repeat&&(e.code==='KeyP'||e.code==='Escape'))togglePause();if(e.code==='KeyE'&&!e.repeat)useExit();if(e.code==='Enter'&&mode==='ready'){if($('#open-journey')){$('#open-journey').click();return;}if($('.journey-panel')){($('#continue-run')||$('#start-game')).click();return;}if($('#start-survival')){($('#resume-survival')||$('#start-survival')).click();return;}if($('#go-dungeon')){showDungeon();return;}if(!requireName())return;const saved=readCheckpoint(actStore());if(saved)restart(saved);else startGame();}});window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{keys.clear();keyboardDash=false;if(!paused&&(mode==='playing'||mode==='evolving'))togglePause();});$('#pause').onclick=togglePause;
window.addEventListener('pagehide',()=>{saveLeaveState();});
function refreshCloudOnReturn(){
 if(expansionChannel==='public'&&canSaveExpansion())void syncPublicExpansion();
 if(mode==='ready'&&$('#survival-cloud-status'))void refreshSurvivalAccount();
 if(!startupCloudReady||localInspection||!account.user()||mode!=='ready'||foregroundCloudSync||Date.now()-lastForegroundCloudSync<5000)return;
 lastForegroundCloudSync=Date.now();foregroundCloudSync=cloud.syncNow().then(result=>{
  if(!result?.changed)return;
  if(mode==='ready')location.reload();else pendingCloudReload=true;
 }).catch(()=>{}).finally(()=>{foregroundCloudSync=null;});
}
document.addEventListener('visibilitychange',()=>{if(mode==='defense'||mode==='adventure')return;if(document.hidden){saveLeaveState();if(!paused&&(mode==='playing'||mode==='evolving'))togglePause();void webTelemetry.playPause();audio.setPaused(true);stopAnimation();}else{last=performance.now();realLast=Date.now();startAnimation();if(!paused)audio.setPaused(false);enforceCurrentWebAccess().catch(()=>{});refreshCloudOnReturn();}});
if(!account.native&&!import.meta.env.DEV){
 setInterval(()=>{if(!document.hidden)enforceCurrentWebAccess().catch(()=>{});},WEB_ACCESS_POLL_MS);
 window.addEventListener('focus',()=>{enforceCurrentWebAccess().catch(()=>{});refreshCloudOnReturn();});
 window.addEventListener('online',()=>enforceCurrentWebAccess().catch(()=>{}));
}
function update(dt,time){
if(expansionJourney&&mode!=='ready'&&expansionChannel==='public'&&!canSaveExpansion()){showIntro();$('#toast').textContent='계정 또는 이용 상태가 바뀌어 여정을 멈췄어요. 원래 계정의 방 입구 기록은 보존했습니다.';return;}
if(mode==='evolving'){
  if(paused)return;
  evolutionTime=Math.min(evolutionDuration,evolutionTime+dt);
  const progress=evolutionTime/evolutionDuration;
  growth.update(dt,time,true,progress);$('#evolution').style.setProperty('--growth',progress);
  if(progress>=1){growth.update(0,time,false);$('#evolution').hidden=true;mode='playing';invuln=Math.max(invuln,.6);if(!offerForm(false,finishEvolutionChoices)&&!offerSolo()&&!offerAwaken()&&roomCleared){if(mirrorSession)advanceMirrorFloor();else openExit();}}
  return;
}
perfT=performance.now();if(!paused)growth.update(dt,time,false);
perfMark(PS.animation);if(mode!=='playing'||paused){cameraMoveX=0;cameraMoveZ=0;mirrorReadyRing.visible=false;player.userData.updateArt(camera);return;}if(survivalSession?.won){updateFallen(dt,time);survivalSession.transitionTime+=dt;if(survivalSession.transitionTime>=2)continueSurvival();return;}if(skywayAdvance>0){skywayAdvance-=dt;if(skywayAdvance<=0&&exitOpen&&isAct3(region)){useExit(true);return;}}if(trainingSession&&elapsed-trainingSession.start>=trainingSession.duration){finishTraining();return;}previousPlayer.copy(player.position);potionCD=Math.max(0,potionCD-dt);hasteTime=Math.max(0,hasteTime-dt);shellTime=Math.max(0,shellTime-dt);playerSlow=Math.max(0,playerSlow-dt);baseSlideCooldown=Math.max(0,baseSlideCooldown-dt);tickDash(dashState,dt*gardenCooldown());invuln=Math.max(0,invuln-dt);shootCD-=dt;const titleState=mirrorSession?{moveSpeed:1,shotSpeed:1}:seedTitle.state();const move=moveVector.set(0,0,0);if(keys.has('KeyW')||keys.has('ArrowUp'))move.z-=1;if(keys.has('KeyS')||keys.has('ArrowDown'))move.z+=1;if(keys.has('KeyA')||keys.has('ArrowLeft'))move.x-=1;if(keys.has('KeyD')||keys.has('ArrowRight'))move.x+=1;move.x+=touch.axes.move.x;move.z+=touch.axes.move.y;if(survivalSession?.benchmark){if(survivalSession.benchmark.stationary){move.set(0,0,0);keyboardDash=false;}else keyboardDash=survivalBenchmarkMove(survivalSession.time,player.position,enemies,move);if(hp<=maxPlayerHp()-25&&inventory.tonic>0&&potionCD<=0){useInventoryItem('tonic');survivalSession.benchmark.potions++;}if(heldForms.size&&activeGauge.value>=100&&!activeGauge.plan&&activeGauge.cooldown<=0){useActive();survivalSession.benchmark.ultimates++;}}move.clampLength(0,1);if(move.lengthSq()>.001)lastMove.copy(move).normalize();dashLock=Math.max(0,dashLock-dt);const touchDash=touch.consumeDash(),dashRequested=keyboardDash||touchDash;keyboardDash=false;if(dashRequested&&canUseExit({open:exitOpen,mode,paused,x:player.position.x,z:player.position.z,exit:arena.exit||EXIT})){useExit();return;}const dashMove=dashRequested&&dashLock<=0?spendDash(dashState):null;if(dashMove){if(relics.equipped==='stride')dashRelicReady=true;baseSlideTime=0;runDashes++;invuln=Math.max(invuln,dashMove.invuln);player.userData.dashTime=dashMove.duration;player.userData.dashSpeed=dashMove.speed;player.userData.dashDir=lastMove.clone();vfx.burst(player.position,dashState.id==='molt'?'reflect':'seed',dashState.id==='molt'?22:14);vfx.dash(player.position,player.rotation.y);audio.play('dash');player.userData.dashFX=0;}let sliding=false;if(player.userData.dashTime>0){player.userData.dashTime-=dt;player.position.addScaledVector(player.userData.dashDir,dt*(player.userData.dashSpeed||17));player.userData.dashFX+=dt;if(player.userData.dashFX>=.045){player.userData.dashFX=0;vfx.dash(player.position,player.rotation.y);}}else if(baseSlideTime>0){sliding=true;const remaining=baseSlideRemaining.copy(baseSlideTarget).sub(player.position).setY(0),distance=remaining.length(),step=Math.min(distance,dt*(survivalSession?.act===1?SURVIVAL_SLIDE.speed:BASE_SLIDE.speed));baseSlideTime=Math.max(0,baseSlideTime-dt);if(distance>.001){baseSlideDir.copy(remaining).normalize();player.position.addScaledVector(baseSlideDir,step);}if(distance<=step+.001||baseSlideTime<=0){player.position.x=baseSlideTarget.x;player.position.z=baseSlideTarget.z;baseSlideTime=0;}if(Math.floor(baseSlideTime/.07)!==Math.floor((baseSlideTime+dt)/.07))vfx.dash(player.position,Math.atan2(baseSlideDir.x,baseSlideDir.z));}else{player.position.addScaledVector(move,dt*PLAYER_SPEED*(isAct3(region)?ACT3_PLAYER_SPEED:1)*runMoveScale(runBonuses)*(1+masteryRate('move'))*titleState.moveSpeed*(playerSlow>0?.75:1)*(hasteTime>0?ITEMS.wind.speed:1));const survivalBase=survivalSession?.act===1,baseLayout=survivalBase?SURVIVAL_BASES:STADIUM_BASES;const occupiedBase=survivalBase?stadiumBaseAt(player.position,BASE_SLIDE.radius,baseLayout):stadium.baseAt(player.position);if(baseSlideLock>=0&&occupiedBase!==baseSlideLock)baseSlideLock=-1;const slide=survivalBase?baseSlideFor(player.position,baseSlideCooldown,true,baseSlideLock,baseLayout,SURVIVAL_SLIDE.speed):stadium.tryBaseSlide(player.position,baseSlideCooldown,baseSlideLock);if(slide){baseSlideDir.set(slide.dx,0,slide.dz);baseSlideTarget.set(slide.targetX,0,slide.targetZ);baseSlideTime=slide.duration;baseSlideCooldown=survivalBase?SURVIVAL_SLIDE.cooldown:slide.cooldown;baseSlideLock=baseLayout[slide.index].next;lastMove.copy(baseSlideDir);vfx.pulse(player.position,'chain',1.05,.26);audio.play('dash');}}if(sliding)constrainToArena(player.position,.4,arena);else collide(player.position,.4,previousPlayer);aimRing.visible=false;targetTimer-=dt;if(targetTimer<=0||!cachedTarget||cachedTarget.dead){cachedTarget=acquireTarget(player.position,enemies,obstacles,segmentHitsCover)||(expansionTerrain?acquireTarget(player.position,expansionTerrain.targets,obstacles,segmentHitsCover):null);targetTimer=.1;}const autoTarget=cachedTarget;if(autoTarget)aim.copy(autoTarget.g.position);const aimdir=aimDirection.copy(aim).sub(player.position).setY(0).normalize();player.rotation.y=Math.atan2(aimdir.x,aimdir.z);cameraMoveX=player.position.x-previousPlayer.x;cameraMoveZ=player.position.z-previousPlayer.z;playerMotion.update(dt,player.position.x-previousPlayer.x,player.position.z-previousPlayer.z,{dashing:player.userData.dashTime>0||sliding});player.userData.updateArt(camera,player.position.x-previousPlayer.x,player.position.z-previousPlayer.z);player.visible=invuln<.5||Math.floor(time*20)%2===0;player.userData.halo.rotation.z=time*.4;
perfMark(PS.player);mirrorReadyRing.visible=Boolean(mirrorSession&&!roomCleared);if(mirrorReadyRing.visible){const progress=1-Math.max(0,Math.min(1,shootCD/mirrorAttackCooldown()));mirrorReadyRing.position.set(player.position.x,1.55,player.position.z);mirrorReadyRing.material.opacity=.14+progress*.7;mirrorReadyRing.scale.setScalar(.84+progress*.2);}
if(autoTarget&&shootCD<=0&&!roomCleared){shootCD=mirrorSession?mirrorAttackCooldown()+MIRROR_BURST.shots*MIRROR_BURST.interval:runCadenceInterval(.22/gardenCooldown(),runBonuses)/(titleState.attackCadence||1);growth.fire();shotOrigin.copy(player.position).addScaledVector(aimdir,.65);vfx.muzzle(shotOrigin,aimdir,[...chosen][0]||'seed');shotOrigin.copy(player.position).addScaledVector(aimdir,.6);if(mirrorSession)mirrorBurst={left:MIRROR_BURST.shots,clock:0,index:0,volley:{hit:false}};else{projectile(shotOrigin,aimdir);audio.play('shot');}}
// 거울의 탑 연사(2026-09-22): 7발을 interval마다 한 발씩, 쏘는 순간의 조준 방향으로. 연사가 끝나면 shootCD 동안 장전.
if(mirrorBurst){if(!mirrorSession||roomCleared)mirrorBurst=null;else{mirrorBurst.clock-=dt;while(mirrorBurst.left>0&&mirrorBurst.clock<=0){shotOrigin.copy(player.position).addScaledVector(aimdir,.6);const shot=projectile(shotOrigin,fanDir.copy(aimdir).applyAxisAngle(AXIS_Y,MIRROR_BURST.jitter[mirrorBurst.index%MIRROR_BURST.jitter.length]));shot.volley=mirrorBurst.volley;if(mirrorBurst.index%2===0)audio.play('shot');mirrorBurst.index++;mirrorBurst.left--;mirrorBurst.clock+=MIRROR_BURST.interval;}if(mirrorBurst.left<=0)mirrorBurst=null;}}
perfMark(PS.shooting);enemyIndex.rebuild(enemies);
perfMark(PS.collision);for(const [id,combat] of formCombats){const cd=(formCooldowns.get(id)||0)-dt;if(autoTarget&&cd<=0&&!roomCleared&&!FORMS[formAttacks.get(id)||id]?.passive){formCooldowns.set(id,runCadenceInterval(combat.fire(player.position,aimdir,autoTarget.g.position)/gardenCooldown(),runBonuses)/(titleState.attackCadence||1));audio.play(combat.audioEvent());}else formCooldowns.set(id,Math.max(-1,cd));}
if(!roomCleared)for(const combat of formCombats.values())combat.update(dt);perfMark(PS.forms);updateActive(dt);perfMark(PS.active);updateEscorts(dt);updateAct2WardenSupport();
if(survivalSession)updateSurvival(dt);
if(expansionJourney)updateExpansionCourse(dt);else if(survivalExpansion){expansionJourneyView?.beginFrame();syncExpansionCrystals();}
perfMark(PS.enemyAI);crowdTimer-=dt;if(!expansionJourney&&!survivalSession&&crowdTimer<=0&&!roomCleared){spawnCrowd(2);crowdTimer=crowdInterval(cycle)*(isAct3(region)?act3RoomPressure(stage).crowdInterval:isAct2(region)?ACT2_PRESSURE.crowdInterval:1);}
perfMark(PS.spawn);enemyIndex.rebuild(enemies);
perfMark(PS.collision);if(!roomCleared){trapClock+=dt;for(const t of traps){tickTrap(t,trapClock,{player:player.position,enemies,hurtPlayer:a=>{if(invuln>0)return false;hitPlayer(a);return true;},hurtEnemy:(e,a)=>damageEnemy(e,a,false)});const info=trapPhase(trapClock+t.offset);t.visual.update(info.phase,info.progress);}}else for(const t of traps)t.visual.update('idle',0);
for(let i=pulls.length-1;i>=0;i--){const w=pulls[i];w.life-=dt;w.pulse-=dt;if(w.life<=0){pulls.splice(i,1);continue;}if(w.pulse<=0){vfx.pulse(w.pos,'gravity',1.2,.3);w.pulse=.25;}const d=pullVector.copy(w.pos).sub(player.position).setY(0);if(d.length()<2.6&&player.userData.dashTime<=0){player.position.addScaledVector(d.normalize(),dt*2.6);collide(player.position);}}
for(let i=wells.length-1;i>=0;i--){const w=wells[i];w.life-=dt;w.pulse-=dt;if(w.life<=0){wells.splice(i,1);continue;}const radius=LS.gravityRadius||2.2;if(w.pulse<=0){vfx.pulse(w.pos,'gravity',radius*.45,.4);w.pulse=.3;}for(const e of enemyIndex.queryInto(w.pos,radius,nearbyEnemies)){const d=wellVector.copy(w.pos).sub(e.g.position);if(!e.dead&&!isBoss(e)&&e.type!=='turret'){e.g.position.addScaledVector(d,dt*1.5);if(relics.equipped==='core')e.slow=Math.max(e.slow||0,.8);collide(e.g.position,.4);}}}
perfMark(PS.hazards);orbitGroup.visible=chosen.has('orbit');orbitTime+=dt*3.1;
if(orbitGroup.visible){for(const [e,t] of orbitHits){if(e.dead||t<=dt)orbitHits.delete(e);else orbitHits.set(e,t-dt);}
 orbitGroup.children.forEach((o,i)=>{o.visible=i<LS.orbitPetals;if(!o.visible)return;const a=orbitTime+i*Math.PI*2/LS.orbitPetals,bob=Math.sin(orbitTime*1.7+i*1.9);o.position.set(player.position.x+Math.cos(a)*LS.orbitRadius,.68+bob*.075,player.position.z+Math.sin(a)*LS.orbitRadius);o.quaternion.copy(camera.quaternion).multiply(orbitRoll.setFromAxisAngle(orbitAxis,-a));o.scale.setScalar(.95+.06* Math.max(0,bob));
  for(const e of expansionNearby(o.position,1.5,nearbyEnemies))if(!e.dead&&!orbitHits.has(e)&&Math.hypot(e.g.position.x-o.position.x,e.g.position.z-o.position.z)<(isBoss(e)?1.5:.95)){orbitHits.set(e,.28);const push=e.g.position.clone().sub(player.position).setY(0).normalize();applyLawHit(e,LS.orbitDamage*gardenPower());if(!e.dead&&!e.immovable&&!isBoss(e)&&e.type!=='turret'){e.g.position.addScaledVector(push,.4);collide(e.g.position,.4);}}
  for(const q of enemyShots)if(q.life>0&&!q.boss&&Math.hypot(q.ob.position.x-o.position.x,q.ob.position.z-o.position.z)<.6){q.life=0;q.struck=true;combatAnalysis.utility('blocked');vfx.burst(q.ob.position,'orbit',8);}
 });}
 perfMark(PS.orbit);const enemyDifficulty=difficulty(cycle,region);for(let e of enemies){if(e.dead)continue;e.slow=Math.max(0,(e.slow||0)-dt);e.frostLock=Math.max(0,(e.frostLock||0)-dt);const edt=dt*enemyDifficulty.speed*(isAct3(region)?ACT3_PRESSURE.speed:isAct2(region)?ACT2_PRESSURE.speed:1)*(e.frostLock>0&&!isBoss(e)?.06:e.slow>0?(isBoss(e)?Math.max(.74,LS.frostFactor):LS.frostFactor):1);if(e.updateArt)e.updateArt(time);if(e.expansionActor){tickExpansionActor(e,edt);continue;}if(e.type==='training-dummy'){e.hit=Math.max(0,(e.hit||0)-dt);continue;}if(e.type==='mirrorseed'){tickMirrorFighter(e,edt,time,{player:player.position,camera,constrain:p=>collide(p,.6),fire:mirrorBolt,hit:a=>hitPlayer(a),guardDt:dt});continue;}if(e.survivalBoss){tickSurvivalBoss(e,dt,time);continue;}if(e.type==='austin'){tickAustin(e,dt*enemyDifficulty.bossTempo*(e.slow>0?Math.max(.8,LS.frostFactor):1),{player:player.position,collide,clearBolts:()=>{for(const p of enemyShots)release(p.ob);enemyShots=[];},bolt:austinBolt,hit:a=>{if(invuln>0||shellTime>0)return false;hitPlayer(a);return true;},burst,pulse:(p,c,r,l)=>vfx.pulse(p,c,r,l),sound:id=>audio.play(id)});e.updateActionArt?.(time);clockFloor?.point(e.pendingRing>0?e.ringHour:e.hour);continue;}if(e.type==='alwaysbeginner'){tickAlwaysBeginner(e,dt*enemyDifficulty.bossTempo*ACT2_PRESSURE.bossTempo*(e.slow>0?Math.max(.8,LS.frostFactor):1),{player:player.position,collide,clearBolts:()=>{for(const p of enemyShots)release(p.ob);enemyShots=[];},bolt:(pos,dir,spec)=>stadiumBolt(pos,dir,{...spec,speed:spec.speed*enemyDifficulty.projectileSpeed*ACT2_PRESSURE.projectile}),hit:a=>{if(invuln>0||shellTime>0)return false;hitPlayer(a);return true;},burst,pulse:(p,c,r,l)=>vfx.pulse(p,c,r,l),bossPitch:vfx.bossPitch,bossRush:vfx.bossRush,bossSwing:vfx.bossSwing,bossWave:vfx.bossWave,bossPhase:vfx.bossPhase,sound:id=>audio.play(id),summon:types=>{for(const type of types){const pos=safeArenaSpawn(player.position,obstacles,crowdIndex++,arena);if(!pos)continue;const minion=spawnAct2(type,pos.x,pos.z);minion.hp*=enemyDifficulty.hp*ACT2_PRESSURE.hp*levelPressure();minion.maxHp=minion.hp;vfx.pulse(minion.g.position,'amber',1.4,.35);}}});e.updateActionArt?.(time);continue;}if(e.type==='turret'){tickTurret(e,edt,player.position,{fire:turretBolt,hurt:hitPlayer,strikeFx:p=>{vfx.arc(e.g.position.clone().setY(1.8),p);vfx.pulse(p,'chain',1.15,.3);vfx.burst(p,'chain',16);}});continue;}if(e.type==='shield'){tickShield(e,edt,player.position,{collide,hit:hitPlayer});continue;}if(e.survivalKind){moveSurvivalEnemy(e,edt,dt,time);continue;}if(e.type==='swarm'){e.hit=Math.max(0,e.hit-dt);e.timer-=dt;const d=enemyVector.copy(player.position).sub(e.g.position).setY(0),distance=d.length();d.normalize();e.g.rotation.y=Math.atan2(d.x,d.z);e.g.position.addScaledVector(d,edt*(1.6+stage*.14)*(isAct2(region)?ACT2_PRESSURE.swarmSpeed:1));{const ep=e.g.position;for(const other of enemyIndex.queryInto(ep,.65,separationEnemies))if(other!==e&&!other.dead){const ax=ep.x-other.g.position.x,az=ep.z-other.g.position.z,length=Math.hypot(ax,az);if(length>0&&length<.65){const k=edt*(.65-length)*4/length;ep.x+=ax*k;ep.z+=az*k;}}}collide(e.g.position,.28);e.g.children[0].rotation.z=Math.sin(time*14+e.phase)*.1;if(distance<.65&&e.timer<=0){hitPlayer(isAct2(region)?ACT2_PRESSURE.swarmDamage:10);e.timer=.85;}continue;}if(isAct3Minion(e.type)){tickAct3Minion(e,edt,time,act3Ctx);continue;}if(e.type==='act3warden'){tickAct3Warden(e,edt,time,act3Ctx);continue;}if(e.type==='tempestcarrier'){tickTempestCarrier(e,dt*enemyDifficulty.bossTempo*ACT3_PRESSURE.bossTempo*(e.slow>0?Math.max(.8,LS.frostFactor):1),time,act3Ctx);e.updateActionArt?.(time);continue;}if(isRelayPart(e.type)){tickRelayRig(e,dt,time,relayCtx);continue;}if(isAct2Minion(e.type)){tickAct2Minion(e,edt,time,act2Ctx);continue;}if(e.type==='act2warden'){tickAct2Warden(e,edt,time,act2Ctx);continue;}if(e.type==='warden'){const wardenDamage=e.duoSupport?DUO_WARDEN.damage:1;tickWarden(e,edt,time,player.position,effectiveLaws(),{collide,bolt:(pos,dir,bounces,laws)=>bossBolt(pos,dir,bounces,laws,wardenDamage),hit:a=>hitPlayer(a*wardenDamage),burst,seal:(pos,r)=>{vfx.pulse(pos,'gravity',r,.5);vfx.burst(pos,'gravity',30,2);if(Math.hypot(player.position.x-pos.x,player.position.z-pos.z)<r){dashLock=SEAL.lock;hitPlayer(SEAL.damage*wardenDamage);$('#toast').textContent='회피 봉인 · 걸어서 피하세요';}}});continue;}previousEnemy.copy(e.g.position);let delta=enemyVector.copy(player.position).sub(e.g.position).setY(0),dist=delta.length();delta.normalize();e.tell.visible=e.state==='tell';e.tell.material.opacity=.12+Math.abs(Math.sin(time*9))*.17;e.timer-=edt;e.hit=Math.max(0,e.hit-edt);e.g.rotation.y=Math.atan2((e.state==='tell'||e.state==='commit'?e.dir:delta).x,(e.state==='tell'||e.state==='commit'?e.dir:delta).z);if(e.state==='stalk'){if(e.type==='hound'){e.g.position.addScaledVector(delta,edt*(1.65+stage*.15));if(e.timer<0&&dist<6){e.state='tell';e.timer=.58;e.dir.copy(delta);}}else{/* 2026-09-22: 다가가도 뒷걸음질하지 않는다(밀리는 것처럼 보였다) */if(dist>6.8)e.g.position.addScaledVector(delta,edt*.8);e.g.position.x+=delta.z*edt*.65*(e.phase<3?1:-1);e.g.position.z-=delta.x*edt*.65*(e.phase<3?1:-1);if(e.timer<0){e.state='tell';e.timer=.85;e.dir.copy(delta);}}}else if(e.state==='tell'){e.ring.material.opacity=.45+Math.sin(time*20)*.3;e.ring.scale.setScalar(1+(1-e.timer)*.3);if(e.timer<=0){e.state='commit';e.timer=e.type==='hound'?.48:.2;if(e.type==='caster'){const fan=stage>=2||cycle>0?2:1;for(let j=-fan;j<=fan;j++){let d=e.dir.clone().applyAxisAngle(new V(0,1,0),j*.17);let ob=enemyBolt(e.g.position,'caster');enemyShots.push({ob,dir:d,life:4,speed:(5+stage*.45)*enemyDifficulty.projectileSpeed});}}}}else if(e.state==='commit'){if(e.type==='hound'){e.g.position.addScaledVector(e.dir,edt*8);if(e.g.position.distanceTo(player.position)<1)hitPlayer(22);}if(e.timer<=0){e.state='recover';e.timer=1.25;e.ring.material.opacity=.16;e.ring.scale.setScalar(1);}}else if(e.timer<=0){e.state='stalk';e.timer=.55+rng()*.65;}collide(e.g.position,.65);e.motion.update(edt,e.g.position.x-previousEnemy.x,e.g.position.z-previousEnemy.z,{type:e.type,state:e.state,timer:e.timer,hit:e.hit});e.tell.visible=e.state==='tell';}
perfMark(PS.enemyAI);enemyIndex.rebuild(enemies);
perfMark(PS.collision);for(let p of shots){const previous=previousShot.copy(p.ob.position);p.life-=dt;p.age+=dt;if(chosen.has('recall')&&!p.fragment&&p.age>.8){if(!p.returning){p.returning=true;p.hitSet.clear();p.crystalHits?.clear();p.hits=0;vfx.pulse(p.ob.position,'recall',.22,.2);}p.dir.copy(player.position).sub(p.ob.position).setY(0).normalize();if(Math.hypot(p.ob.position.x-player.position.x,p.ob.position.z-player.position.z)<.45){p.life=0;continue;}}p.ob.position.addScaledVector(p.dir,dt*(p.fragment?FRAGMENT_SPEED:SHOT_SPEED)*titleState.shotSpeed*(p.speedScale||1));p.ob.rotation.y=Math.atan2(p.dir.x,p.dir.z);applyProjectileTheme(p.ob,p.tint,combatTheme,p.age,p.visualScale||1);p.trailTime+=dt;if(p.trailTime>=playerTrailInterval&&p.trailPos.distanceToSquared(p.ob.position)>.018&&!(shotAurasOn&&!p.fragment)){vfx.trail(p.trailPos,p.ob.position,p.critical?'amber':p.tint,p.fragment);p.trailPos.copy(p.ob.position);p.trailTime=0;}let pos=p.ob.position;let wallHit=traceExpansionShot(p,previous,pos)||(mirrorPanelsActive&&chosen.has('reflect')&&reflectMirrorPanels(previous,pos,p.dir));if(!wallHit)wallHit=reflectArenaBoundary(previous,pos,p.dir,arena);for(let o of obstacles){if(Math.abs(pos.x-o.x)<o.w/2+.1&&Math.abs(pos.z-o.z)<o.d/2+.1){wallHit=true;let dx=Math.abs(pos.x-o.x)/(o.w/2),dz=Math.abs(pos.z-o.z)/(o.d/2);if(dx>dz)p.dir.x*=-1;else p.dir.z*=-1;break;}}if(wallHit){if(chosen.has('reflect')&&p.bounces<LS.reflectBounces){pos.addScaledVector(p.dir,.1);constrainToArena(pos,.05,arena);p.bounces++;if(relics.equipped==='mirror')p.relicBounce=true;vfx.reflect(pos,p.dir);audio.play('reflect');p.trailPos.copy(pos);if(hasMutation(mutations,'reflect','speed')){p.speedScale=reflectBounceSpeed(mutations,p.bounces);p.life+=TUNE.reflectSpeed.lifePerBounce;}if(hasMutation(mutations,'reflect','rune'))dropRune(pos);if(hasMutation(mutations,'reflect','burst')&&p.bounces>=LS.reflectBounces)mutationBurst(pos.clone(),TUNE.reflectBurst.radius,TUNE.reflectBurst.damage);}else{if(chosen.has('reflect')&&hasMutation(mutations,'reflect','burst'))mutationBurst(pos.clone(),TUNE.reflectBurst.radius,TUNE.reflectBurst.damage);p.life=0;}}if(p.life<=0)continue;for(let e of enemyIndex.queryInto(pos,1.2,nearbyEnemies)){if(p.hits<LS.pierceHits+(p.dashStrike?1:0)&&!e.dead&&e!==p.ignoreEnemy&&!p.hitSet.has(e)&&Math.hypot(e.g.position.x-pos.x,e.g.position.z-pos.z)<(isBoss(e)?1.2:.9)){if(!shotPierce&&blocksShield(e,p.dir)){p.life=0;e.block=.18;catcherReturn(e,act2Ctx);vfx.pulse(e.g.position,'reflect',.65,.18);break;}p.hitSet.add(e);const follow=Boolean(p.volley?.hit&&e.type==='mirrorseed');if(p.volley&&e.type==='mirrorseed')p.volley.hit=true;p.hits++;const shotDamage=(p.fragment?8:BASE_SHOT_DAMAGE)*damageScale(levels,bankedUpgrades)*runPowerScale(runBonuses)*gardenPower()*(p.returning?LS.recallReturn:1)*(p.critical?LS.critDamage:1)*(p.dashStrike?1.8:1)*(p.relicBounce?1.25:1);p.relicBounce=false;if(follow)damageEnemy(e,shotDamage*MIRROR_BURST.followDamage,true,p.critical);else applyLawHit(e,shotDamage,false,p.critical);if(p.hits>=LS.pierceHits+(p.dashStrike?1:0)){if(!(chosen.has('recall')&&!p.returning&&!p.fragment))p.life=0;}if(chosen.has('split')&&!p.fragment&&!follow&&shots.length<MAX_SHOTS){vfx.split(pos,p.dir,Math.min(5,LS.splitCount));audio.play('split');const spread=LS.splitCount>3?.85:.65;if(hasMutation(mutations,'split','rune'))dropRune(pos);for(let k=0;k<LS.splitCount;k++){const angle=relicSplitAngle(relics.equipped,LS.splitCount,k,spread),fragment=projectile(pos.clone().addScaledVector(p.dir,.85),p.dir.clone().applyAxisAngle(new V(0,1,0),angle),true,e);if(fragment){fragment.speedScale=fragmentSpeedScale(mutations);fragment.life+=fragmentExtraLife(mutations);fragment.burstOnEnd=hasMutation(mutations,'split','burst');}}}break;}}}
perfMark(PS.projectiles);for(let p of enemyShots){p.life-=dt;p.age=(p.age||0)+dt;if(p.recall&&p.age>1.3){p.dir.copy(p.origin).sub(p.ob.position).setY(0).normalize();if(p.ob.position.distanceTo(p.origin)<.8){p.life=0;continue;}}const previous=previousEnemyShot.copy(p.ob.position);if(p.curve)p.dir.applyAxisAngle(AXIS_Y,p.curve*dt);if(p.mirror){p.ob.rotation.y=Math.atan2(p.dir.x,p.dir.z);applyProjectileTheme(p.ob,p.law,combatTheme,p.age,1.08);}else if(p.skyway)p.ob.rotation.y=Math.atan2(p.dir.x,p.dir.z);else p.ob.rotation.y+=dt*(p.boss?5:8);p.ob.position.addScaledVector(p.dir,dt*(p.speed??(5+stage*.45)));if(p.mirror){p.trailTime+=dt;const interval=qualityLevel===0?.11:.075;if(p.trailTime>=interval&&p.trailPos.distanceToSquared(p.ob.position)>.03){vfx.trail(p.trailPos,p.ob.position,'mirrorHostile',false);p.trailPos.copy(p.ob.position);p.trailTime=0;}}if(expansionTerrain&&!p.pierce&&expansionTerrain.sweep(previous,p.ob.position,{damage:0}).blocked){p.life=0;continue;}const outside=reflectArenaBoundary(previous,p.ob.position,p.dir,arena);
 if((!p.pierce&&segmentHitsCover(previous,p.ob.position,obstacles,.13))||outside){if(p.bounces>0){const next=p.ob.position;let flipX=false,flipZ=false;for(const o of obstacles)if(!p.pierce&&!outside&&segmentHitsCover(previous,next,[o],.13)){if(Math.abs(previous.x-o.x)>=o.w/2+.13)flipX=true;else flipZ=true;break;}if(flipX)p.dir.x*=-1;if(flipZ)p.dir.z*=-1;p.ob.position.copy(previous);p.bounces--;audio.play('reflect');}else p.life=0;continue;}
 if(p.mirror&&player.userData.dashTime>0&&Math.hypot(p.ob.position.x-player.position.x,p.ob.position.z-player.position.z)<MIRROR_BREAK.perfectDodgeRadius){mirrorPerfectDodge(p);continue;}
 if(Math.hypot(p.ob.position.x-player.position.x,p.ob.position.z-player.position.z)<(p.boss?.6:.55)){const couldHit=invuln<=0;hitPlayer(p.damage??13);if(couldHit){p.struck=true;if(p.frost)playerSlow=1.2;}p.life=0;}}

perfMark(PS.enemyShots);for(let arr of [shots,enemyShots,effects])for(let i=arr.length-1;i>=0;i--){let p=arr[i];if(arr===effects){p.life-=dt;if(p.vel)p.ob.position.addScaledVector(p.vel,dt);p.ob.scale.setScalar(Math.max(.01,p.life/p.max));}if(p.life<=0){if(arr===enemyShots)endEnemyShot(p);if(p.burstOnEnd)mutationBurst(p.ob.position.clone(),TUNE.splitBurst.radius,TUNE.splitBurst.damage);release(p.ob);arr.splice(i,1);}}
perfMark(PS.effects);updateEscorts(0);updateFallen(dt,time);updateRunes(dt);const bossFalling=fallen.some(f=>f.hold);
 if(expansionTerrainDirty)syncExpansionCrystals();enemies=enemies.filter(e=>!e.dead);if(!survivalSession&&!trainingSession&&!enemies.length&&crowdLeft===0&&mode==='playing'&&!roomCleared&&!bossFalling){for(let p of enemyShots)release(p.ob);enemyShots=[];roomCleared=true;finishRoomAnalysis(false,false);if(!mirrorSession&&!(expansionJourney&&expansionChannel==='public'))score+=roomPoints(stage,cycle);clearForms();for(const p of shots)release(p.ob);shots=[];if(expansionJourney){openExit();}else if(mirrorSession){if(mirrorSession.floor>=MIRROR_TRIAL_PROTOTYPE.localSliceFloors)showMirrorTrialResult(true,lastRoomAnalysis);else cardChoice();}else if(stage<4)openExit();else if(runComplete())completeRun();else cardChoice();}
if(!mirrorSession&&!survivalSession?.lab&&mode==='playing'&&!roomCleared&&!bossFalling&&choiceKills>=choiceGoal()){choiceKills-=choiceGoal();choicesTaken++;cardChoice(true);}perfMark(PS.world);}
// 판 시간은 게임 시계(프레임 간격)가 아니라 실제 시계로 잰다. 게임을 느리게 돌리는 도구를 쓰면
// 예전에는 기록 시간이 그만큼 줄어 '분당 처치'가 부풀려졌다. 실제 시계는 그렇게 줄지 않는다.
let last=performance.now(),realLast=Date.now(),paceGame=0,paceReal=0,frames=[],frameCounter=0,animationHandle=0;
const framePacer=createFramePacer();
function startAnimation(){if(mode!=='defense'&&mode!=='adventure'&&!animationHandle&&!document.hidden)animationHandle=requestAnimationFrame(animate);}
function stopAnimation(){if(animationHandle)cancelAnimationFrame(animationHandle);animationHandle=0;}
function animate(now){animationHandle=0;if(document.hidden)return;startAnimation();const coveredMenu=menuArtCovers();if(!framePacer(now,coveredMenu?10:mode==='playing'&&!paused?60:30))return;let raw=(now-last)/1000;last=now;
 // The static menu painting fully covers the scene: only music needs a tick.
 if(coveredMenu){realLast=Date.now();audio.tick(Math.min(.1,Math.max(0,raw)));return;}
 {const realNow=Date.now();const realDelta=(realNow-realLast)/1000;realLast=realNow;if(mode==='playing'&&!paused&&!survivalSession?.benchmark&&realDelta>0&&realDelta<2){elapsed+=realDelta;paceReal+=realDelta;paceGame+=Math.min(2,Math.max(0,raw));webTelemetry.playTick(realDelta);}}if(perfEnabled)try{perf.frame(raw*1000,mode==='playing'&&!paused,perfSnapshot);perf.beginFrame();if(perf.due())perf.sampleState(perfSnapshot());}catch{}frames.push(raw*1000);if(frames.length>180)frames.shift();const visualDt=Math.min(.1,Math.max(0,raw)),timeScale=cameraFeel.stepEffects(visualDt),dt=survivalSession?.benchmark?(()=>{for(let i=0;i<4;i++)stepSurvivalBenchmark(1/60);return 4/60;})():advanceFrame(raw*timeScale,now*.001,(step,time)=>update(step,time));if(survivalSession&&!survivalSession.lab&&!survivalSession.finished&&survivalSession.time>=survivalAutosaveAt){survivalAutosaveAt=survivalSession.time+15;saveSurvival();}audio.tick(visualDt);perfT=performance.now();if(!paused)vfx.update(visualDt);perfMark(PS.particles);frameCounter++;
 // Ambient motes move slowly: 30 Hz looks identical and low quality can omit both batches entirely.
 perfT=performance.now();if(moteMeshes[0].visible&&(frameCounter===1||frameCounter%2===0)){for(const m of motes){m.y+=Math.sin(now*.001+m.seed)*visualDt*(frameCounter===1?.08:.16);moteMatrix.makeTranslation(m.x,m.y,m.z);moteMeshes[m.kind].setMatrixAt(m.index,moteMatrix);}for(const m of moteMeshes)m.instanceMatrix.needsUpdate=true;}
 const skyCamera=isAct3(region)&&!mirrorSession;
 const cameraPose=cameraFeel.follow(visualDt,{playerX:player.position.x,playerZ:player.position.z,moveX:cameraMoveX,moveZ:cameraMoveZ,followX:expansionJourney?1:survivalSession?1:skyCamera ? 0.045 : mirrorSession?Math.max(viewLayout.followX,MIRROR_VIEW.followX):viewLayout.followX,followZ:expansionJourney?.25:survivalSession?1:skyCamera ? 0.02 : mirrorSession?Math.max(viewLayout.followZ,MIRROR_VIEW.followZ):viewLayout.followZ,leadScale:skyCamera?0:1,baseZoom:viewLayout.zoom*(survivalSession?1.12:skyCamera?ACT3_VIEW_ZOOM:mirrorSession?MIRROR_VIEW.zoom:1),biasX:survivalExpansion?.act===3?3:0,biasZ:skyCamera?ACT3_VIEW_BIAS:0});look.set(cameraPose.x,0,cameraPose.z);if(Math.abs(camera.zoom-cameraPose.zoom)>.0005){camera.zoom=cameraPose.zoom;camera.updateProjectionMatrix();}camera.position.set(look.x,22,15.5+look.z);cameraShake=Math.max(0,cameraShake-visualDt);if(cameraShake>0)camera.position.x+=(rng()-.5)*cameraShake;camera.lookAt(look);camera.updateMatrixWorld();if(!paused)survivalVisualTime+=visualDt;survivalArt?.update(enemies,survivalComparisonEnabled?survivalVisualTime:now*.001);survivalComparison?.refresh();stadium.update(now*.001);skyway.tick(visualDt,mode==='playing'&&!paused);seedTitle.update(camera,canvasRect,player.visible&&mode==='playing'&&!paused);bossPet.update(visualDt,player.position,{visible:player.visible&&mode==='playing'&&!paused});perfMark(PS.scene);presentFrame(now*.001);perfMark(PS.hud);renderer.info.autoReset=false;renderer.info.reset();shadowClock+=Math.max(0,raw||0);if(sun.castShadow&&shadowClock>=SHADOW_REFRESH){shadowClock=0;renderer.shadowMap.needsUpdate=true;}const showGardenScene=(mode==='ready'||mode==='garden'||mode==='training-setup'||mode==='training-result'||mode==='notes'||mode==='maintenance'||mode==='gift'||mode==='developer-usage')&&gardenScene;
 if(showGardenScene)gardenScene.update(visualDt);
 renderPass.scene=showGardenScene?gardenScene.scene:scene;renderPass.camera=showGardenScene?gardenScene.camera:camera;
 if(!showGardenScene){const laws=chosen.values(),first=laws.next().value||'seed';auraList.length=0;projectileBodyList.length=0;for(const p of shots){auraList.push(p);projectileBodyList.push(p);}for(const c of formCombats.values()){c.auraBolts?.(auraList);c.projectileBodies?.(projectileBodyList);}projectileSprites.sync(projectileBodyList,enemyShots);shotAuras.sync(auraList,camera,{theme:combatTheme,first,second:laws.next().value,bodyArt:'spriteHidden'});}perfMark(PS.scene);if(!menuArtCovers())composer.render();perfMark(PS.render);if(inspection&&!inspection.hidden&&frameCounter%30===0){const state=window.seedDebug.getState();inspection.textContent=JSON.stringify({fps:Math.round(state.fps),frameMsP95:Math.round(state.frameMsP95),drawCalls:state.drawCalls,triangles:state.triangles,textures:state.textures,geometries:state.geometries,enemies:state.enemies.length,projectiles:state.projectiles,enemyProjectiles:state.enemyProjectiles,player:state.player,mode:state.mode,paused:state.paused});}}
function renderBossHud(boss,group=[boss]){
 const hud=$('#boss-hud'),hpTotal=group.reduce((n,e)=>n+Math.max(0,e.hp),0),maxTotal=group.reduce((n,e)=>n+e.maxHp,0),pct=Math.max(0,hpTotal/maxTotal*100);setHidden(hud,false);setWidth(hud.querySelector('i'),pct.toFixed(1)+'%');
 if(boss.expansionBoss){
  delete hud.dataset.phase;setText(hud.querySelector('strong'),boss.config.name+' · '+Math.ceil(pct)+'%');setHidden(hud.querySelector('.boss-move'),false);
  const crystal=boss.expansionMotion?.id==='crystalGardener'||boss.type==='crystalGardener'||expansionJourney?.act==='crystalGorge';
  setText(hud.querySelector('.boss-move'),boss.state==='tell'?'방향 고정 · 공격 준비':boss.state==='attack'?(crystal?'수정 공격':'횡풍 공격'):'회복 중 · 반격 기회');setText(hud.querySelector('small'),crystal?'열린 꽃심 피해 +30% · 다시 자라는 수정에서 비켜서세요':'준비 때 옆으로 피하세요 · 돌진이 끝난 뒤 반격');
 }else if(boss.type==='mirrorseed'){
  delete hud.dataset.phase;setText(hud.querySelector('strong'),`거울의 탑 ${mirrorSession?.floor||1}층 · 비친 씨앗 · ${Math.ceil(pct)}%`);setText(hud.querySelector('.boss-move'),boss.moveName||'같은 선택을 비추는 중');setHidden(hud.querySelector('.boss-move'),false);setText(hud.querySelector('small'),boss.broken>0?'거울이 깨졌습니다 · 지금 공격을 집중하세요':`회피로 탄환을 스치세요 · 균열 ${mirrorSession?.cracks||0}/${MIRROR_BREAK.crackGoal}`);
 }else if(boss.type==='austin'){
  const phase=PHASES[boss.phase];if(hud.dataset.phase!==boss.phase)hud.dataset.phase=boss.phase;
  setText(hud.querySelector('strong'),`${AUSTIN.name} · ${phase.label} · ${Math.ceil(pct)}%`);setText(hud.querySelector('.boss-move'),austinPatternName(boss));setHidden(hud.querySelector('.boss-move'),false);setText(hud.querySelector('small'),austinHint(boss));
 }else if(boss.type==='alwaysbeginner'){
  const phase=ALWAYS_PHASES[boss.phase];if(hud.dataset.phase!==boss.phase)hud.dataset.phase=boss.phase;
  setText(hud.querySelector('strong'),`${ALWAYS_BEGINNER.name} · ${phase.label} · ${Math.ceil(pct)}%`);setText(hud.querySelector('.boss-move'),alwaysBeginnerPatternName(boss));setHidden(hud.querySelector('.boss-move'),false);setText(hud.querySelector('small'),alwaysBeginnerHint(boss));
 }else if(boss.type==='tempestcarrier'){
  const phase=['전운','뇌우','폭풍핵'][boss.phaseIndex||0];if(hud.dataset.phase!==phase)hud.dataset.phase=phase;
  setText(hud.querySelector('strong'),`${TEMPEST_CARRIER.name} · ${phase} · ${Math.ceil(pct)}%`);setText(hud.querySelector('.boss-move'),act3BossPatternName(boss));setHidden(hud.querySelector('.boss-move'),false);setText(hud.querySelector('small'),act3BossHint(boss));
 }else if(boss.type==='act3warden'){
  delete hud.dataset.phase;setText(hud.querySelector('strong'),`${boss.config.name} · ${Math.ceil(pct)}%`);setText(hud.querySelector('.boss-move'),act3BossPatternName(boss));setHidden(hud.querySelector('.boss-move'),false);setText(hud.querySelector('small'),act3BossHint(boss));
 }else if(boss.type==='act2warden'){
  delete hud.dataset.phase;setText(hud.querySelector('strong'),group.length>1?`연계 문지기 · ${Math.ceil(pct)}%`:`${boss.config.name} · ${Math.ceil(pct)}%`);setText(hud.querySelector('.boss-move'),boss.moveName||'다음 공격 준비');setHidden(hud.querySelector('.boss-move'),false);setText(hud.querySelector('small'),act2WardenHint(boss)+(act2Support?' · 생명 60%에서 다음 문지기 난입':''));
 }else{
  delete hud.dataset.phase;setHidden(hud.querySelector('.boss-move'),!boss.moveName);setText(hud.querySelector('.boss-move'),boss.moveName||'');setText(hud.querySelector('strong'),group.length>1?`쌍문지기 · ${Math.ceil(pct)}%`:`${boss.config?.name||'기억의 문지기'} · ${Math.ceil(pct)}%`);
  setText(hud.querySelector('small'),boss.moveName?'진화의 성질을 흉내 냅니다 · 예고된 틈으로 피하세요':pendingEscorts.length?'호위 등장 예고 · 주황 원에서 떨어지세요':boss.variant==='seal'?'보라 원이 닫힐 때 안에 있으면 회피가 봉인됩니다':boss.variant==='hunter'?'돌진 뒤 곧바로 한 번 더 돌진합니다':boss.learned.length?'습득: '+boss.learned.map(id=>LAW_NAMES[id]).join(' · '):boss.copiedForm?`${boss.config?.echoEvery||4}번째 공격마다 ${boss.copiedForm.name} 모방`:'생명 67% · 34%에서 당신의 법칙을 배웁니다');
 }
}
let hudLast=-Infinity,hudMode='',hudPaused=false;
function presentFrame(time){
 contactShadows.update(player,enemies,fallen);contactShadows.mesh.visible=!isAct3(region);player.userData.updateEvolutionArt?.(time,activeGauge.plan?.state==='OVERDRIVE');
 trackOverhead();
 const hudInterval=1/(mobileDevice?20:30),hudDue=time-hudLast>=hudInterval||mode!==hudMode||paused!==hudPaused;if(!hudDue)return;hudLast=time;hudMode=mode;hudPaused=paused;
 if(survivalSession){const pressure=survivalPressure(survivalSession),act=survivalAct(survivalSession);setText($('#encounter'),`${survivalSession.lap+1}순환 · ${survivalSession.act+1}막 ${act.name} · ${survivalClock(survivalActTime(survivalSession))} / ${survivalSession.bossSpawned?'보스':survivalClock(SURVIVAL.duration)}\n${survivalSession.benchmark?'가속 비교 · ':''}${pressure.formationLabel} · ${kills} 처치`);}

 const dm=dashMeter(dashState),dashExit=!mirrorSession&&canUseExit({open:exitOpen,mode,paused,x:player.position.x,z:player.position.z,exit:arena.exit||EXIT});touch.update(mode==='playing'&&!paused,Math.max(dm.ready?0:dm.recharge,dashLock),dm,{exit:dashExit});setHidden($('#save-exit'),!(paused&&(mode==='playing'||mode==='evolving')));
 const dashPips=$('#dash-pips'),dashPipKey=`${dm.charges}/${dm.maxCharges}`;setHidden(dashPips,dm.maxCharges<2);if(dashPips&&dashPips.__key!==dashPipKey){dashPips.innerHTML=Array.from({length:dm.maxCharges},(_,i)=>`<i class="${i<dm.charges?'ready':''}"></i>`).join('');dashPips.__key=dashPipKey;}
 // 메뉴·정원 화면에서는 전투 HUD를 감춘다(정원이 그대로 보이게).
 const menuMode=['ready','garden','training-setup','training-result','ranking','discoveries','notes','maintenance','gift','developer-lab','developer-usage'].includes(mode);
 if(document.body.__menuMode!==menuMode){document.body.classList.toggle('menu-mode',menuMode);document.body.__menuMode=menuMode;}
 updateGauges();
 setText($('#score-hud b'),formatScore(score));setText($('#score-hud small'),playerName?playerName+' · 점수':'점수');setHidden($('#score-hud'),!['playing','cards','forms','evolving'].includes(mode));
 renderItemBar();renderActiveButton($('#active-skill'),{forms:heldForms,gauge:activeGauge,live:mode==='playing'&&!paused,touch:document.body.classList.contains('touch-mode')});
 const readyNow=mode==='playing'&&!paused&&!activeGauge.plan&&activeGauge.cooldown<=0&&activeGauge.value>=ACTIVE.max&&activeState(heldForms).state!=='LOCKED';if(readyNow&&!activeReadyAnnounced)audio.play('ultimateReady');activeReadyAnnounced=readyNow;
 if(mode!=='playing'||paused)return;
 const wardenGroup=enemies.filter(e=>(e.type==='warden'||e.type==='act2warden'||e.type==='act3warden')&&!e.dead&&(stage===4||!e.elite)),boss=enemies.find(e=>e.expansionBoss||e.type==='mirrorseed'||e.type==='austin'||e.type==='alwaysbeginner'||e.type==='tempestcarrier')||wardenGroup.find(e=>e.moveName)||wardenGroup.find(e=>!e.duoSupport&&!e.support)||wardenGroup[0];if(boss)renderBossHud(boss,(boss.expansionBoss||boss.type==='mirrorseed'||boss.type==='austin'||boss.type==='alwaysbeginner'||boss.type==='tempestcarrier')?[boss]:wardenGroup);else setHidden($('#boss-hud'),true);const nearExit=!mirrorSession&&canUseExit({open:exitOpen,mode,paused,x:player.position.x,z:player.position.z,exit:arena.exit||EXIT});setHidden($('#exit-room'),!nearExit);setText($('#exit-room'),stage===4?(finalBossAhead()?'최종 보스에게 · E':'다음 여정으로 · E'):touch.enabled?'다음 방으로':'다음 방으로 · E');gateHalo.rotation.y=time*.6;setWidth($('#hpbar'),(hp/maxPlayerHp()*100).toFixed(1)+'%');setText($('#hptext'),`${displayHp(hp)} / ${displayHp(maxPlayerHp())}`);setText($('#dashname'),`◇  ${dashState.id?DASH_EVOLUTIONS[dashState.id].name:'회피'}`);setWidth($('#dashbar'),(dm.fill*100).toFixed(1)+'%');setText($('#dashtext'),dashLock>0?'봉인 '+dashLock.toFixed(1)+'s':dm.maxCharges>1?`${dm.charges}/${dm.maxCharges}${dm.charges<dm.maxCharges?' · '+dm.recharge.toFixed(1)+'s':''}`:dm.ready?'준비':dm.recharge.toFixed(1)+'s');
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
 const need=choiceGoal(),have=Math.min(need,choiceKills);
 setText($('#growth-progress span'),survivalSession?.lab&&!survivalSession.benchmark?`로컬 검증 · ${labSafe?'피해 면역':'실제 피해'} · 기록 제외`:mirrorSession?`완벽 회피로 균열 ${mirrorSession.cracks}/${MIRROR_BREAK.crackGoal} · 승리하면 같은 법칙 선택`:`다음 법칙까지 ${need-have} 처치 · 슬롯 ${slotsUsed(levels,heldForms)}/${SLOT_CAP}`);setWidth($('#growth-progress i'),mirrorSession?(mirrorSession.cracks/MIRROR_BREAK.crackGoal*100).toFixed(1)+'%':(have/need*100).toFixed(1)+'%');
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
 if(shaderWarmKey)scheduleShaderWarm(200);
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
 if(save)writeTheme(runStorage,id);
 const button=document.getElementById('theme-toggle');if(button)button.textContent=themeButtonLabel();
 return combatTheme;
}
function mountThemeButton(){
 const footer=document.querySelector('#pause-build footer');if(!footer||footer.querySelector('#theme-toggle'))return;
 const button=document.createElement('button');button.id='theme-toggle';button.type='button';button.textContent=themeButtonLabel();
 button.title='탄환·잔상·궁극기 외형만 바뀝니다 · 능력치는 그대로예요';
 button.onclick=()=>{$('#toast').textContent=`${THEMES[applyCombatTheme(nextTheme(combatTheme))].name} · 탄환과 잔상이 바뀌었어요`;};
 footer.prepend(button);
}
// ---------------- 조용한 성능 감시 ----------------
// 화면에는 아무것도 띄우지 않는다. 판마다 프레임 통계와 렉 순간의 상황을 이 기기에 남기고, 개발자 계정이면 개발용 저장소에도 올린다.
// 화질을 바꾸거나 연출을 줄이지 않는다. 랭킹과도 무관하다(진단이 켜져 있어도 랭킹에서 빠지지 않는다).
const GAME_VERSION=`${latestNoteId}${typeof __SEED_BUILD__==='string'&&__SEED_BUILD__?'·'+__SEED_BUILD__:''}`;
const perf=createPerfMonitor(),perfSections=perf.sections,perfState={};let perfT=0;
// 로컬 검사에서 감시 모듈 자체의 비용을 잴 때만 끈다(?noPerf).
const perfEnabled=!(localInspection&&new URLSearchParams(location.search).has('noPerf'));
function perfMark(index){const t=performance.now();perfSections[index]+=t-perfT;perfT=t;}
function perfBossPattern(boss){
 try{return boss.type==='austin'?austinPatternName(boss):boss.type==='alwaysbeginner'?alwaysBeginnerPatternName(boss):(boss.type==='tempestcarrier'||boss.type==='act3warden')?act3BossPatternName(boss):boss.moveName||'';}catch{return '';}
}
// 0.5초마다와 사건이 난 순간에만 부른다. 같은 객체를 다시 쓴다.
function perfSnapshot(){try{
 const boss=enemies.find(e=>isBoss(e)&&!e.dead),fx=vfx.state(),info=renderer.info,plan=activeGauge.plan;
 let formShots=0;for(const combat of formCombats.values())formShots+=combat.state?.().bolts||0;
 perfState.act=isAct3(region)?3:isAct2(region)?2:1;perfState.journey=cycle+1;perfState.room=stage;
 perfState.boss=boss?.type||'';perfState.bossPattern=boss?perfBossPattern(boss):'';
 perfState.enemies=enemies.length;perfState.bullets=shots.length;perfState.enemyShots=enemyShots.length;perfState.formShots=formShots;
 perfState.particles=fx.active;perfState.effects=effects.length;perfState.damageText=0;perfState.activeFx=activeVfx.state?.().instances||0;perfState.loot=runes.length;
 perfState.drawCalls=info.render.calls;perfState.triangles=info.render.triangles;perfState.textures=info.memory.textures;perfState.geometries=info.memory.geometries;perfState.programs=info.programs?.length||0;
 perfState.pool=`${fx.active}/${fx.capacity}`;
 perfState.activeSkill=plan?plan.forms.join('+'):'';perfState.ultimate=plan?`${plan.archetype||''}·${plan.state||''}`:'';
 perfState.quality=qualityLevel;
 perfState.build=buildRecord({levels,forms:heldForms,relic:relics.equipped,wardens:wardensDefeated,austins:austinsDefeated});
 perfState.fxCounters=fx.events;
}catch{}
 return perfState;
}
// 감시는 어떤 경우에도 판을 막지 않는다.
function perfBegin(){
 try{if(perf.running())perfFinish('restart');perf.begin({env:describeEnvironment({launch:appShell.launch,renderer,version:GAME_VERSION,quality:qualityLevel})});}catch{}
}
// 판이 끝나면 한 번 요약해서 이 기기에 남긴다. 개발자 계정은 개발용 저장소(seedPerformance)에도 올린다.
function perfFinish(outcome){
 try{return perfFinishNow(outcome);}catch{return null;}
}
function perfFinishNow(outcome){
 // A suspended app may resume the same run. Keep its usage session open while
 // pagehide writes the latest foreground time; end it only when the run ends.
 if(outcome!=='closed')void webTelemetry.endPlay(outcome);
 if(!perf.running())return null;
 const report=perf.end({outcome,context:{act:isAct3(region)?3:isAct2(region)?2:1,journey:cycle+1,room:stage,test:developerRun,mirror:Boolean(mirrorSession),survival:Boolean(survivalSession),training:Boolean(trainingSession),build:buildRecord({levels,forms:heldForms,relic:relics.equipped,wardens:wardensDefeated,austins:austinsDefeated})}});
 if(!report)return null;
 saveSession(rawStorage,report);
 if(adminMode&&!localInspection)account.tokenSession().then(session=>uploadSession(report,{session,databaseURL:FIREBASE.databaseURL})).then(r=>{if(r&&!r.ok)console.info('PERF UPLOAD SKIPPED',r.reason);}).catch(()=>{});
 return report;
}
// 모드별 이용 현황: 1초마다 지금 어떤 모드 화면인지 보고, 화면이 보이고 멈춰 있지 않을 때만 센다.
// 메뉴로 잠깐 나갔다 같은 모드로 돌아오면 이어서 세고, 다른 모드에 들어가면 새로 센다.
{const trackedMode=()=>mode==='playing'||mode==='evolving'?(survivalSession?(survivalSession.benchmark?null:'survival'):'journey'):['defense','adventure','duel','puzzle'].includes(mode)?mode:null;
 setInterval(()=>{if(document.hidden)return;const m=trackedMode();if(!m)return;void webTelemetry.modeEnter(m);if(!((m==='journey'||m==='survival')&&paused))webTelemetry.modeTick(1);},1000);}
window.addEventListener('pagehide',()=>{void webTelemetry.modePause();stopAnimation();audio.setPaused(true);void webTelemetry.playPause();perfFinish('closed');});
window.addEventListener('pageshow',()=>{if(mode==='adventure')return;last=performance.now();realLast=Date.now();startAnimation();if(!document.hidden&&!paused)audio.setPaused(false);});
mountPerfDevMenu({storage:rawStorage,version:GAME_VERSION,live:()=>perf.state()});
let sizedW=0,sizedH=0;
// iPadOS·iOS 홈 화면 앱(standalone)은 화면이 상태 표시줄 밑까지 그려지는데 높이(100%·clientHeight)는 상태 표시줄만큼 짧게 알려 줘서
// 위로 쏠리고 아래에 빈 띠가 생긴다(2026-09-29 사용자 아이패드). 화면 크기와 차이가 작을 때만(분할 화면 제외) 화면 높이로 맞춘다.
function appViewHeight(){
 const de=document.documentElement,w=de.clientWidth,h=de.clientHeight;
 if(navigator.standalone!==true||!screen?.width)return h;
 const full=w>h?Math.min(screen.width,screen.height):Math.max(screen.width,screen.height),fix=full>h&&full-h<=64&&Math.abs((w>h?Math.max(screen.width,screen.height):Math.min(screen.width,screen.height))-w)<=2;
 de.classList.toggle('ios-full',fix);de.style.setProperty('--app-h',(fix?full:h)+'px');return fix?full:h;
}
function resize(){const w=document.documentElement.clientWidth,viewHeight=appViewHeight();sizedW=w;sizedH=viewHeight;const h=touch.enabled&&viewHeight>w?Math.max(250,viewHeight-160):viewHeight;syncPixelRatio(w,h);renderer.setSize(w,h,false);renderer.domElement.style.width='100%';renderer.domElement.style.height=h+'px';camera.aspect=w/h;viewLayout=responsiveView(w,h,touch.enabled);document.body.classList.toggle('phone-landscape',viewLayout.phone);camera.zoom=viewLayout.zoom;camera.updateProjectionMatrix();composer.setSize(w,h);sizeBloom(w,h);canvasRect=renderer.domElement.getBoundingClientRect();if(gardenScene)gardenScene.resize(w,h);if(touch.enabled&&mode==='playing'&&!paused)togglePause();}window.addEventListener('resize',resize);
// 설치 앱에서 화면을 돌리면 resize 순간에 아직 옛 크기를 알려 주는 기기가 있다(iOS). 돌린 뒤 크기가 정말 바뀌었을 때만 한 번 더 맞춘다.
const settleResize=()=>{if(document.documentElement.clientWidth!==sizedW||appViewHeight()!==sizedH)resize();};
screen.orientation?.addEventListener?.('change',()=>{requestAnimationFrame(settleResize);setTimeout(settleResize,350);});
// 정원에서는 화면을 눌러 식물과 빈 자리를 고른다.
 renderer.domElement.addEventListener('pointerdown',event=>{
 if(mode!=='garden'||!gardenScene)return;
 const rect=canvasRect,hit=gardenScene.pick((event.clientX-rect.left)/Math.max(1,rect.width),(event.clientY-rect.top)/Math.max(1,rect.height));
 selectGardenSpot(hit);
 });
function runLocalStartupLab(){
 if(!localInspection)return;const params=new URLSearchParams(location.search);
 let attempts=0;const launch=()=>{if(!window.seedDebug?.qa&&attempts++<20){setTimeout(launch,50);return;}if(params.has('adventureLab'))void showSeedAdventure();else if(params.has('duelLab'))void showSeedDuel();else if(params.has('defenseLab'))void showSeedDefense({actCount:['five','act4','act5'].includes(params.get('defenseLab'))?5:3,bossPreview:params.get('defenseLab')==='act4'?'crosswind':params.get('defenseLab')==='act5'?'crystalGorge':null});else if(params.has('survivalLab')){const lab=params.get('survivalLab');if(['act4','act5','five'].includes(lab))void startSurvival(lab);else showSurvivalSetup();}else if(params.has('mirrorLab'))window.seedDebug?.qa.startMirrorTower(Number(params.get('mirrorLab'))||1);else if(params.has('act5Lab'))window.seedDebug?.qa.startExpansionJourney(Number(params.get('act5Lab'))||0,'crystalGorge',{resume:params.get('act5Lab')==='resume',bossPreview:params.get('act5Lab')==='boss'});else if(params.has('act4Lab'))window.seedDebug?.qa.startExpansionJourney(Number(params.get('act4Lab'))||0,'crosswind',{resume:params.get('act4Lab')==='resume',bossPreview:params.get('act4Lab')==='boss'});else if(params.has('act3Lab')){const value=params.get('act3Lab');if(value==='boss')window.seedDebug?.qa.startAct3Boss();else window.seedDebug?.qa.startAct3Stage(Number(value)||0);}else if(params.has('roomLab'))window.seedDebug?.qa.startAct2Stage(Number(params.get('roomLab'))||0);else if(params.has('lanceLab')){window.seedDebug?.qa.startRun();setTimeout(()=>window.seedDebug?.qa.lanceShowcase(),180);}};setTimeout(launch,50);
}
if(survivalComparisonEnabled)survivalComparison=mountSurvivalComparison({getActive:()=>Boolean(survivalSession)&&mode==='playing',getVariant:()=>survivalReadability?'quiet':'classic',setVariant:value=>{survivalReadability=value==='quiet';survivalArt?.setReadability(survivalReadability);player.scale.setScalar(survivalReadability?1.55:1.25);},getPaused:()=>paused,setPaused:value=>{paused=value;touch.reset();keys.clear();keyboardDash=false;if(paused)player.visible=true;audio.setPaused(paused);document.getElementById('pause').textContent=paused?'▶':'Ⅱ';}});
applyQuality(qualityLevel,{save:false});applyCombatTheme(combatTheme,{save:false});mountQualityButton();mountThemeButton();mountSoundButton();const startupCloud=localInspection?Promise.resolve({changed:false}):account.ready().then(()=>{backfillPersonalBests();return cloud.start();}),startupSeason=localInspection?Promise.resolve(DEFAULT_SEASON_STATUS):loadSeasonStatus({enabled:!import.meta.env.DEV});Promise.all([startupCloud,startupSeason]).then(async([result,status])=>{startupCloudReady=true;seasonStatus=status;await refreshAccessMode();const honored=await claimFirstGardenPioneer(runStorage,[account.user()?.uid,legacyRankingUid(rawStorage)]);if(honored&&account.user())await cloud.syncNow();if(result?.changed||honored){location.reload();return;}showEntry();void backfillBossVeterans();void webTelemetry.visit();if(result&&result.ok===false&&result.reason!=='signed-out')$('#toast').textContent='클라우드 저장을 불러오지 못했어요 · 이 기기 저장으로 열었어요(연결되면 합쳐져요)';runLocalStartupLab();scheduleShaderWarm();}).catch(async()=>{startupCloudReady=true;seasonStatus=DEFAULT_SEASON_STATUS;await account.ready().catch(()=>null);await refreshAccessMode();showEntry();void webTelemetry.visit();runLocalStartupLab();scheduleShaderWarm();});startAnimation();
// Read-only live diagnostics for performance and real-input validation.
if(import.meta.env.DEV||localInspection)window.seedDebug={getState:()=>({survival:survivalSession?{time:survivalSession.time,actTime:survivalActTime(survivalSession),act:survivalSession.act,lap:survivalSession.lap,bossesDefeated:survivalSession.bossesDefeated,completedLaps:survivalSession.completedLaps,bossSpawned:survivalSession.bossSpawned,won:survivalSession.won,art:survivalArt?.state(),cap:survivalPressure(survivalSession).cap,lab:survivalSession.lab,benchmark:survivalSession.benchmark||false}:null,pace:{game:+paceGame.toFixed(1),real:+paceReal.toFixed(1),trusted:paceTrusted(paceGame,paceReal)},mutations:mutationsToSave(mutations),runes:runes.length,gardenFx,theme:{id:combatTheme,...THEMES[combatTheme]},quality:{level:qualityLevel,name:QUALITY_NAMES[qualityLevel],bloom:bloomPass.enabled,pixelRatio:renderer.getPixelRatio(),shadows:sun.castShadow,lanternLights:lanternLights.filter(l=>l.visible).length,governor:'off'},items:{hasteTime,shellTime,selectedItem},runBonuses:{...runBonuses},active:{value:activeGauge.value,cooldown:activeGauge.cooldown,state:activeState(heldForms).state,forms:activeState(heldForms).forms,plan:activeGauge.plan&&{state:activeGauge.plan.state,forms:activeGauge.plan.forms,time:activeGauge.plan.time,tags:activeGauge.plan.tags,archetype:activeGauge.plan.archetype},visual:activeVfx.state()},relics:normalizeRelics(relics),relicStats:{...LS},score,mirror:mirrorSession?{floor:mirrorSession.floor,cracks:mirrorSession.cracks,perfectDodges:mirrorSession.perfectDodges}:null,wardensDefeated,austinsDefeated,austinRoom,austinTitle:seedTitle.isUnlocked(),inventory:{...inventory},fallen:fallen.length,levels:Object.fromEntries(levels),choicesTaken,choiceKills,nextChoice:choiceGoal(),dashLock,dash:dashMeter(dashState),forms:Object.fromEntries(heldForms),orbitCore:orbitCore(heldForms,FORMS),traps:traps.length,turrets:enemies.filter(e=>e.type==='turret').map(e=>e.laws),pulls:pulls.length,formCombat:Object.fromEntries([...formCombats].map(([id,c])=>[id,c.state()])),discoveries:profile,guideTarget,rerollUsed,arena,escortWaves,pendingEscorts:pendingEscorts.length,cycle,region,stadium:stadium.state(),skyway:skyway.state(),baseSlide:{time:baseSlideTime,cooldown:baseSlideCooldown,lock:baseSlideLock,dx:baseSlideDir.x,dz:baseSlideDir.z,targetX:baseSlideTarget.x,targetZ:baseSlideTarget.z,lockedBase:baseSlideLock},saveAvailable:Boolean(readCheckpoint(actStore())),autoAttack,crowdLeft,midReward,roomKills:kills-roomStartKills,audio:audio.state(),vfx:vfx.state(),shotAuras:shotAuras.state(),projectileSprites:projectileSprites.state(),mode,paused,hp,stage:stage+1,room:roomFor(stage,cycle,region).name,arenaShape:arena.id||arena.shape,exit:{open:exitOpen,x:(arena.exit||EXIT).x,z:(arena.exit||EXIT).z,near:canUseExit({open:exitOpen,mode,paused,x:player.position.x,z:player.position.z,exit:arena.exit||EXIT})},mutated:[...mutated],kills,playerVisible:player.visible,touch:touch.state(),motion:{...player.userData.motion},evolution:growth.state(),artFrame:player.userData.artFrame,evolutionArt:player.userData.evolutionArt,secondaryEvolutionArt:player.userData.secondaryEvolutionArt,contactShadows:contactShadows.mesh.count,rules:[...chosen],invulnerable:invuln>0,player:{x:player.position.x,z:player.position.z},enemies:enemies.map(e=>({type:e.type,escort:Boolean(e.escort),elite:Boolean(e.elite),inScene:Boolean(e.g.parent)&&e.g.visible,phase:e.phase,hour:e.hour,bellWarn:e.bellWarn,alarms:e.alarms?.length,hp:e.hp,maxHp:e.maxHp,learned:e.learned,attacks:e.attacks,pattern:e.pattern,state:e.state,actionArt:e.actionArtState,motion:{...e.g.userData.motion},facing:e.g.rotation.y,x:e.g.position.x,z:e.g.position.z})),projectiles:shots.length,enemyProjectiles:enemyShots.length,bossShots:enemyShots.filter(q=>q.boss&&q.life>0).map(q=>({x:q.ob.position.x,z:q.ob.position.z,pierce:q.pierce})),elapsed,fps:frames.length/(frames.reduce((a,b)=>a+b,0)/1000),frameMsP95:[...frames].sort((a,b)=>a-b)[Math.floor(frames.length*.95)],drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,coverBounds:obstacles.map(o=>({...o}))}),// Local QA only (localhost + ?inspect or the dev server): shorten long boss fights and hand out a potion to test the flows.
qa:{startExpansionJourney,resumeExpansionJourney:act=>startExpansionJourney(0,act,{resume:true}),expansionSave:act=>createExpansionSaveStore(rawStorage,act,expansionOwner()).read(),expansionState:()=>expansionJourney?expansionApi.checkpointExpansionJourney(expansionJourney):null,startBench:(cycleValue=20,room=2,act=1)=>{mirrorSession=null;developerRun=true;const where=act===3?ACT3_REGION:act===2?ACT2_REGION:'garden';startRegion=where;labSafe=true;restart({version:1,region:where,stage:room,mode:'entry',cycle:cycleValue,hp:100,kills:0,elapsed:0,rules:[],mutated:[],forms:{}});crowdLeft=100000;choicesTaken=500;return {cycle,stage,region};},benchSpawn:n=>{crowdLeft=Math.max(crowdLeft,n);spawnCrowd(n);return enemies.length;},perfReport:()=>perfFinish('bench'),perfLive:()=>perf.state(),// 이펙트 비교용(로컬 점검 전용): 씨앗 둘레에 법칙별 적중·폭발 효과를 한꺼번에 띄운다.
vfxShowcase:(freeze=.1)=>{vfx.clear();const ids=['reflect','split','chain','orbit','pierce','burst','recall','gravity','frost'],p=player.position;ids.forEach((id,i)=>{const a=i/ids.length*Math.PI*2,at=new V(p.x+Math.cos(a)*3.2,0,p.z+Math.sin(a)*3.2);if(id==='burst')vfx.explosion(at,'burst',1.4,true);else vfx.impact(at,id,true);});vfx.flame(p,'burst',14,1);vfx.update(freeze);paused=true;return vfx.state();},lanceShowcase:()=>{vfx.clear();const p=player.position;vfx.lance(new V(p.x-5,0,p.z-1.5),new V(p.x-1,0,p.z-4),'refractlance');vfx.lance(new V(p.x-1,0,p.z-4),new V(p.x+2,0,p.z-4),'refractlance',true);vfx.lance(new V(p.x-3,0,p.z+1),new V(p.x+4,0,p.z+2),'spearring');vfx.update(.05);paused=true;return vfx.state();},vfxResume:()=>{paused=false;},vfxFreeze:()=>{paused=true;return {shots:shots.length,auras:shotAuras.state()};},
// 탄환 소재 비교용(로컬 점검 전용): 법칙 10종 탄을 씨앗 앞에 두 줄로 세우고 멈춘다. 짝수 칸은 critical이면 치명타 탄.
shotShowcase:(critical=false)=>{for(const p of shots)release(p.ob);shots=[];vfx.clear();const ids=['seed','reflect','split','chain','orbit','pierce','burst','recall','gravity','frost'],c=player.position,dir=new V(1,0,-.45).normalize();ids.forEach((id,i)=>{const crit=critical&&i%2===0,k=projectileVisualScale(false,crit),at=new V(c.x-4.4+(i%5)*2.2,.67,c.z-2.4+Math.floor(i/5)*2.6),ob=new THREE.Object3D();ob.position.copy(at);ob.rotation.y=Math.atan2(dir.x,dir.z);applyProjectileTheme(ob,id,combatTheme,.3,k);vfx.trail(at.clone().addScaledVector(dir,-.9),at,crit?'amber':id,false);shots.push({ob,dir:dir.clone(),life:2,bounces:0,fragment:false,tint:id,critical:crit,visualScale:k,age:.3,returning:false,hitSet:new Set(),hits:0,trailTime:0,trailPos:at.clone(),auraLook:shotAuraLook(id,{critical:crit,trailLaw:id,theme:combatTheme})});});vfx.update(.04);paused=true;return shots.length;},previewColor:({sat=COLOR_SATURATION,tone='aces'}={})=>{outputPass.material.uniforms.seedSaturation.value=sat;renderer.toneMapping=tone==='neutral'?THREE.NeutralToneMapping:tone==='agx'?THREE.AgXToneMapping:THREE.ACESFilmicToneMapping;return {sat,tone};},programs:()=>renderer.info.programs.map(p=>({name:p.name,key:p.cacheKey,used:p.usedTimes})),programOwners:()=>{const out={};scene.traverse(o=>{for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[]){const key=renderer.properties.get(m).currentProgram?.cacheKey;if(!key)continue;const who=`${o.type}:${o.name||o.parent?.name||o.geometry?.name||o.geometry?.type||''}:${m.type}:${m.name||''}`;(out[key]||(out[key]=new Set())).add(who);}});return Object.fromEntries(Object.entries(out).map(([k,v])=>[k,[...v].slice(0,6)]));},// 일반 판 시작(로컬 점검 전용): 개발자 실험이 아닌 진짜 판으로 저장·이어하기 흐름을 재현한다.
startRun:()=>{developerRun=false;labSafe=false;mirrorSession=null;trainingSession=null;if(mode!=='ready')showIntro();mirrorSession=null;restart();return {mode,developerRun,saveAvailable:Boolean(readCheckpoint(actStore()))};},
startMirrorTower:(floor=1)=>{startMirrorTower({publicRun:false,floor});return true;},hurtBoss:fraction=>{const b=enemies.find(e=>isBoss(e)&&!e.elite&&!e.dead);if(b)damageEnemy(b,b.maxHp*fraction,false);return b?b.hp:null;},givePotion:()=>addItem(inventory,'potion',1),fillActive:()=>{activeGauge.cooldown=0;activeGauge.value=ACTIVE.max;return activeGauge.value;},showAustinTitle:()=>{seedTitle.setUnlocked(true);return seedTitle.isUnlocked();},giveForm:(id,level=4)=>{if(!Object.hasOwn(FORMS,id))return false;heldForms.set(id,level);syncForms();return true;},shotLaws:()=>({laws:[...chosen],mutated:[...mutated],shotPierce,pierceHits:LS.pierceHits,crit:Math.round(totalCritChance()*1000)/1000,eligible:eligibleForms(chosen).map(f=>f.id),damage:Math.round(damageScale(levels,bankedUpgrades)*100)/100,banked:bankedUpgrades}),fuseNow:id=>{if(!bankAndFuse(id))return false;syncLaws();syncForms();return true;},
// 재융합 시험(로컬 점검 전용): 보류 묶음도 실험실에서 바로 들 수 있다. 부모 두 진화는 빼고 한 칸으로.
giveSecond:(id,level=5)=>{if(!Object.hasOwn(SECOND_FORMS,id))return false;for(const part of SECOND_FORMS[id].parts)heldForms.delete(part);heldForms.set(id,level);syncForms();return true;},setLaw:(id,level)=>{if(!Object.hasOwn(LAWS,id))return false;if(level>0)levels.set(id,level);else levels.delete(id);syncLaws();return true;},offerSolo:()=>offerSolo(finishChoice,true),giveItem:(id,n=1)=>{const got=addItem(inventory,id,n);itemBarKey='';return got;},setHp:v=>{hp=Math.max(1,Math.min(100,v));},giveCoins:(n=500)=>earnCoins(runStorage,Math.max(0,Math.floor(n))).coins,startAustin:()=>{mirrorSession=null;developerRun=true;startRegion='garden';labSafe=true;restart();stage=4;wardensDefeated=Math.max(5,wardensDefeated);austinRoom=true;wave();return true;},clearEnemies:()=>{let n=0;for(const e of [...enemies])if(!e.dead&&!isBoss(e)){damageEnemy(e,(e.hp||1)+1,false);n++;}return n;},startFinalJourney:(room='austin',asPlayer=false,act=1)=>{mirrorSession=null;developerRun=!asPlayer;const where=act===2?ACT2_REGION:'garden';startRegion=where;labSafe=true;const boss=room==='austin';restart({version:1,region:where,stage:4,mode:boss?'austin':'entry',cycle:MAX_RUN_CYCLE,hp:100,kills:0,elapsed:0,rules:[],mutated:[],forms:{},wardens:boss?MAX_RUN_CYCLE+1:MAX_RUN_CYCLE,austins:FINAL_BOSS_CAP-1});return {cycle,stage,austinRoom,austins:austinsDefeated};},startAct2Stage:value=>{mirrorSession=null;const room=Math.max(0,Math.min(4,Math.floor(value)||0));developerRun=true;startRegion=ACT2_REGION;labSafe=true;restart({version:1,region:ACT2_REGION,stage:room,mode:'entry',hp:100,kills:0,elapsed:0,rules:[],mutated:[],forms:{}});return arena.id||arena.shape;},startAct2Boss:()=>{mirrorSession=null;developerRun=true;startRegion=ACT2_REGION;labSafe=true;restart({version:1,region:ACT2_REGION,stage:4,mode:'austin',hp:100,kills:0,elapsed:0,rules:[],mutated:[],forms:{},wardens:5,austins:0});return true;},startAct3Stage:value=>{mirrorSession=null;const room=Math.max(0,Math.min(4,Math.floor(value)||0));developerRun=true;startRegion=ACT3_REGION;labSafe=true;restart({version:1,region:ACT3_REGION,stage:room,mode:'entry',hp:100,kills:0,elapsed:0,rules:[],mutated:[],forms:{}});return arena.id||arena.shape;},startAct3Boss:()=>{mirrorSession=null;developerRun=true;startRegion=ACT3_REGION;labSafe=true;restart({version:1,region:ACT3_REGION,stage:4,mode:'austin',hp:100,kills:0,elapsed:0,rules:[],mutated:[],forms:{},wardens:5,austins:0});return true;}},census:()=>{const out={casters:{},meshes:0,shadowCasters:0,sprites:0,instanced:0,points:0,lines:0,lights:0,materials:new Set(),byParent:{}};scene.traverseVisible(o=>{if(o.isLight)out.lights++;if(o.isSprite)out.sprites++;else if(o.isInstancedMesh)out.instanced++;else if(o.isMesh){out.meshes++;if(o.castShadow){out.shadowCasters++;const key=(o.parent?.name||o.parent?.type||'?')+'/'+(o.name||o.geometry?.type||o.type);out.casters[key]=(out.casters[key]||0)+1;}}else if(o.isLineSegments)out.lines++;if(o.material)out.materials.add(o.material);if(o.isMesh||o.isSprite){const key=(o.parent?.name||o.parent?.type||'?')+'/'+(o.name||o.geometry?.type||o.type);out.byParent[key]=(out.byParent[key]||0)+1;}});out.materials=out.materials.size;out.behindCover=enemies.filter(e=>behindCover(e.g.position)).length;out.obstacles=obstacles.length;out.byParent=Object.fromEntries(Object.entries(out.byParent).sort((a,b)=>b[1]-a[1]).slice(0,25));out.programs=renderer.info.programs?.length;return out;},worldToScreen:(x,z)=>{let p=new V(x,.5,z).project(camera);const r=renderer.domElement.getBoundingClientRect();return {x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2};}};

// Visible local-only controls for CUA testing; absent on the public host.
function startDuoInspection(){restart();cycle=5;stage=4;wardensDefeated=5;austinsDefeated=1;austinRoom=false;heldForms.set('infiniteprism',6);syncForms();wave();}
if(localInspection&&new URLSearchParams(location.search).has('bossLab')){
 const lab=document.createElement('aside');lab.id='boss-lab';lab.style.cssText='position:fixed;top:6px;left:6px;z-index:30;background:#102020dd;padding:4px;font-size:10px';
 lab.innerHTML='<span>로컬 합성 검사 · 랭킹 전송 없음</span><button id="lab-mirror">거울의 탑 1층</button><button id="lab-austin">오스틴 바로</button><button id="lab-always">항상초심 바로</button><button id="lab-act3-field">3막 편대</button><button id="lab-act3-warden">3막 문지기</button><button id="lab-act3-boss">요한 바로</button><button id="lab-duo">쌍문지기 검사</button><button id="lab-coins">상점 500 JP</button><button id="lab-choice">선택 12처치</button><button id="lab-hurt">보스 다음 단계</button><button id="lab-heal">검사 생명 회복</button><button id="lab-safe">검사 보호 꺼짐</button><button id="lab-active">오버드라이브 준비</button><button id="lab-portal">차원 융합 준비</button><button id="lab-title">오스틴 칭호</button><button id="lab-dash">회피 진화 선택</button><button id="lab-solo-card">단독 선택 이미지</button><button id="lab-solo">단독 진화 외형</button><button id="lab-fusion">1차 융합 외형</button><button id="lab-second">재융합 선택</button><button id="lab-orbit">공전 5종 외형</button><button id="lab-mix">진화 겹침</button><button id="lab-awaken">각성 선택</button><button id="lab-twin">쌍둥이 각성 선택</button>';
 lab.querySelector('#lab-duo').onclick=startDuoInspection;
 const refreshShotArt=()=>{auraList.length=0;projectileBodyList.length=0;for(const p of shots){auraList.push(p);projectileBodyList.push(p);}for(const combat of formCombats.values()){combat.auraBolts?.(auraList);combat.projectileBodies?.(projectileBodyList);}projectileSprites.sync(projectileBodyList,enemyShots);const laws=chosen.values();shotAuras.sync(auraList,camera,{theme:combatTheme,first:laws.next().value||'seed',second:laws.next().value,bodyArt:'spriteHidden'});};
 const shotArtButton=document.createElement('button');shotArtButton.textContent='탄 원화 10종';
 shotArtButton.onclick=()=>{window.seedDebug.qa.shotShowcase();refreshShotArt();};lab.append(shotArtButton);
 const fusionArtIds=Object.keys(FIRST_FORMS),secondPairs=[['thunderlance','blastlance'],['seedstorm','lightningpetal'],['tidepull','stormanchor'],['returnblade','returnflare'],['frostkaleidoscope','frostbloom'],['collapse','frostkaleidoscope'],['frostbloom','lightningpetal'],['returnflare','stormcrown'],['blastlance','frostguard'],['stormanchor','comethalo'],['returningpetals','chainburst'],['chainburst','frostbloom'],['lightningpetal','blastlance'],['returnblade','frostguard'],['frostkaleidoscope','comethalo'],['gravitystake','collapse'],['stormanchor','frostbloom'],['tidepull','blastlance'],['collapse','stormcrown'],['seedstorm','frostguard']],orbitArtIds=['base','starring','frostguard','stormcrown','mirrorguard'];let soloArtIndex=0,fusionArtIndex=0,secondArtIndex=0,orbitArtIndex=0;document.body.append(lab);lab.querySelector('#lab-mirror').onclick=()=>window.seedDebug.qa.startMirrorTower();lab.querySelector('#lab-austin').onclick=()=>window.seedDebug.qa.startAustin();lab.querySelector('#lab-always').onclick=()=>window.seedDebug.qa.startAct2Boss();lab.querySelector('#lab-act3-field').onclick=()=>window.seedDebug.qa.startAct3Stage(0);lab.querySelector('#lab-act3-warden').onclick=()=>window.seedDebug.qa.startAct3Stage(4);lab.querySelector('#lab-act3-boss').onclick=()=>window.seedDebug.qa.startAct3Boss();lab.querySelector('#lab-coins').onclick=()=>window.seedDebug.qa.giveCoins(500);lab.querySelector('#lab-choice').onclick=()=>{if(mode!=='playing')restart();kills+=12;choiceKills=12;choicesTaken=1;score+=120;hp=68;addItem(inventory,'potion',1);runBonusOffer=runBonusOffers(runBonuses,{hp,choicesTaken});cardChoice(true,['reflect','split','chain']);};lab.querySelector('#lab-hurt').onclick=()=>window.seedDebug.qa.hurtBoss(1);lab.querySelector('#lab-heal').onclick=()=>window.seedDebug.qa.setHp(100);lab.querySelector('#lab-safe').onclick=()=>{labSafe=!labSafe;lab.querySelector('#lab-safe').textContent=labSafe?'검사 보호 켜짐':'검사 보호 꺼짐';};lab.querySelector('#lab-active').onclick=()=>{window.seedDebug.qa.giveForm('collapse',5);window.seedDebug.qa.giveForm('prism',5);window.seedDebug.qa.fillActive();};lab.querySelector('#lab-portal').onclick=()=>{heldForms.clear();window.seedDebug.qa.giveForm('f09-reflect-portal',5);window.seedDebug.qa.fillActive();$('#toast').textContent='외형 검사 · 차원경 개문';};lab.querySelector('#lab-title').onclick=()=>window.seedDebug.qa.showAustinTitle();lab.querySelector('#lab-dash').onclick=()=>{dashState=createDashState();dashRewardPending=true;offerDashEvolution(()=>{mode='playing';$('#overlay').hidden=true;});};lab.querySelector('#lab-solo-card').onclick=()=>{for(const form of Object.values(SOLO_FORMS))levels.set(form.requires[0],5);syncLaws();offerSolo(finishChoice,true);};lab.querySelector('#lab-solo').onclick=()=>{const id=Object.keys(SOLO_FORMS)[soloArtIndex++%Object.keys(SOLO_FORMS).length];heldForms.clear();heldForms.set(id,5);syncForms();$('#toast').textContent=`외형 검사 · ${FORMS[id].name}`;};lab.querySelector('#lab-fusion').onclick=()=>{const id=fusionArtIds[fusionArtIndex++%fusionArtIds.length];heldForms.clear();heldForms.set(id,5);syncForms();$('#toast').textContent=`외형 검사 · ${FORMS[id].name}`;};lab.querySelector('#lab-second').onclick=()=>{const pair=secondPairs[secondArtIndex++%secondPairs.length];heldForms.clear();for(const id of pair)heldForms.set(id,5);syncForms();promptedSecond.clear();offerSecondFusion(finishChoice,true);};lab.querySelector('#lab-orbit').onclick=()=>{const id=orbitArtIds[orbitArtIndex++%orbitArtIds.length];heldForms.clear();syncForms();chosen.delete('orbit');if(id==='base'){levels.set('orbit',1);chosen.add('orbit');LS=lawStats(levels);}else{heldForms.set(id,5);syncForms();}$('#toast').textContent=id==='base'?'외형 검사 · 기본 공전 씨앗잎':`외형 검사 · ${FORMS[id].name}`;};lab.querySelector('#lab-awaken').onclick=()=>{heldForms.clear();heldForms.set('collapse',5);heldForms.set('blackhole',5);heldForms.set('flarebloom',4);syncForms();promptedAwaken.clear();offerAwaken(finishChoice,true);};lab.querySelector('#lab-twin').onclick=()=>{heldForms.clear();heldForms.set('glassspear',5);heldForms.set('blackhole',5);syncForms();promptedAwaken.clear();offerAwaken(finishChoice,true);};lab.querySelector('#lab-mix').onclick=()=>{heldForms.clear();heldForms.set('collapse',6);heldForms.set('winterbreath',7);heldForms.set('prism',7);syncForms();activeGauge.value=ACTIVE.max;$('#toast').textContent='대표 겨울 숨결 · 보조 프리즘 가시';};
}

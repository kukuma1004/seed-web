import {EXPEDITION_SPECIES,getExpeditionSpecies} from './species.js';
import {EXPEDITION_GARDENS,EXPEDITION_ENEMIES} from './world.js';

// Audited files on 2026-10-06. These paths are candidates for reuse, not a
// claim that every sheet has passed Expedition pose, framing or device QA.
// In particular, duel preview assets retain their original artReady gates.
const MOTION=Object.freeze({
 reflect:'duel/reflect-motion-v1.webp',split:'duel/split-motion-v1.webp',chain:'duel/chain-motion-v1.webp',orbit:'duel/orbit-motion-v1.webp',pierce:'duel/pierce-motion-v1.webp',burst:'duel/burst-motion-v1.webp',recall:'duel/recall-motion-v1.webp',gravity:'duel/gravity-motion-v1.webp',frost:'duel/frost-motion-v1.webp',
 collapse:'duel/collapse-motion-v1.webp',frostguard:'duel/frostguard-motion-v1.webp',returnblade:'duel/returnblade-motion-v1.webp',prism:'duel/prism-motion-v1.webp',thunderlance:'duel/thunderlance-motion-v1.webp',frostbloom:'duel/frostbloom-motion-v1.webp',stormcrown:'duel/stormcrown-motion-v1.webp',tidepull:'duel/tidepull-motion-v2.webp',seedstorm:'duel/seedstorm-motion-v2.webp',mirrorguard:'duel/mirrorguard-motion-v2.webp',gravitymirror:'duel/gravitymirror-motion-v1.webp',chainburst:'duel/chainburst-motion-v1.webp',blastlance:'duel/blastlance-motion-v1.webp',frostkaleidoscope:'duel/frostkaleidoscope-motion-v2.webp',returnflare:'duel/returnflare-motion-v1.webp',comethalo:'duel/comethalo-motion-v2.webp',stormanchor:'duel/stormanchor-motion-v2.webp',returningpetals:'duel/returningpetals-motion-v2.webp',icicle:'duel/icicle-motion-v2.webp',halobloom:'duel/halobloom-motion-v2.webp',frostnet:'duel/frostnet-motion-v1.webp',rewindbolt:'duel/rewindbolt-motion-v1.webp',thundermirror:'duel/thundermirror-motion-v2.webp',sunmirror:'duel/sunmirror-motion-v1.webp',ebbring:'duel/ebbring-motion-v1.webp',pullgarden:'duel/pullgarden-motion-v1.webp',spearring:'duel/spearring-motion-v2.webp',accretiondisk:'duel/accretiondisk-motion-v1.webp',rimeback:'duel/rimeback-motion-v1.webp',coldwell:'duel/coldwell-motion-v2.webp',gravitystake:'duel/gravitystake-motion-v2.webp',
 mirrormaze:'duel/mirrormaze-motion-v2.webp',fullbloom:'duel/fullbloom-motion-v1.webp',thunderweb:'duel/thunderweb-motion-v3.webp',starring:'duel/starring-motion-v1.webp',glassspear:'duel/glassspear-motion-v1.webp',flarebloom:'duel/flarebloom-motion-v2.webp',rewind:'duel/rewind-motion-v1.webp',blackhole:'duel/blackhole-motion-v2.webp',winterbreath:'duel/winterbreath-motion-v2.webp',
 bigcrunch:'duel/bigcrunch-motion-v2.webp',pulsegravity:'duel/pulsegravity-motion-v2.webp',thousandblades:'duel/thousandblades-motion-v3.webp',maelstrom:'duel/maelstrom-motion-v2.webp',mirrorhall:'duel/mirrorhall-motion-v2.webp',
 'final-comethalo-burst':'duel/final-comethalo-burst-motion-v2.webp','final-comethalo-orbit':'duel/final-comethalo-orbit-motion-v1.webp','final-sunmirror-reflect':'duel/final-sunmirror-reflect-motion-v2.webp','final-blastlance-pierce':'duel/final-blastlance-pierce-motion-v2.webp','final-chainburst-burst':'duel/final-chainburst-burst-motion-v2.webp','final-seedstorm-burst':'duel/final-seedstorm-burst-motion-v2.webp','final-returnflare-burst':'duel/final-returnflare-burst-motion-v2.webp','final-returnflare-recall':'duel/final-returnflare-recall-motion-v2.webp','final-spearring-pierce':'duel/final-spearring-pierce-motion-v2.webp','final-accretiondisk-gravity':'duel/final-accretiondisk-gravity-motion-v2.webp','final-ebbring-orbit':'duel/final-ebbring-orbit-motion-v2.webp','final-ebbring-recall':'duel/final-ebbring-recall-motion-v2.webp','final-prism-reflect':'duel/final-prism-reflect-motion-v2.webp'
});
const ENEMY_SKELETON_ART=Object.freeze({assault:'cute/enemy-hound-v4.webp',ranged:'cute/enemy-caster-v4.webp',support:'cute/enemy-shield-v4.webp',disruptor:'cute/enemy-runner-v1.webp'});
// A normalized 4x2 sheet preserves native fractional cells without slicing.
// Feet are aligned in presentation only. These are connected candidates, not
// final human/device acceptance and never additional combat species.
const ENEMY_MOTION_CANDIDATES=Object.freeze({
 'meadow-normal-0':Object.freeze({motionPath:'expedition/enemies/meadow-normal-0-motion-v1.webp',cols:4,rows:2,facing:'left',baseline:.8771138669673055,renderScale:1.4,
  poseOffsets:Object.freeze([0,-.2255,-.2255,0,5.9752,5.7497,5.7497,5.7497]),
  impactPoses:Object.freeze({attack:Object.freeze([1,3]),skill1:3,skill2:5,awaken:5})}),
 'meadow-normal-1':Object.freeze({motionPath:'expedition/enemies/meadow-normal-1-motion-v1.webp',cols:4,rows:2,facing:'left',baseline:.8387824126268321,renderScale:1.7,
  poseOffsets:Object.freeze([0,0,-1.1274,-.9019,4.8478,5.9752,6.2007,5.9752]),
  impactPoses:Object.freeze({attack:3,skill1:3,skill2:5,awaken:5})}),
 'meadow-normal-2':Object.freeze({motionPath:'expedition/enemies/meadow-normal-2-motion-v1.webp',cols:4,rows:2,facing:'left',baseline:.859075535512965,renderScale:1.6,
  poseOffsets:Object.freeze([0,.6764,.6764,.2255,9.1319,9.1319,8.9064,8.9064]),
  impactPoses:Object.freeze({attack:Object.freeze([1,5]),skill1:5,skill2:5,awaken:5})}),
 'meadow-normal-3':Object.freeze({motionPath:'expedition/enemies/meadow-normal-3-motion-v1.webp',cols:4,rows:2,facing:'left',baseline:.85456595264938,renderScale:1.7,
  poseOffsets:Object.freeze([0,-.451,-.2255,-.451,7.5536,7.3281,7.5536,7.779]),
  impactPoses:Object.freeze({attack:Object.freeze([1,3]),skill1:3,skill2:5,awaken:5})}),
 'meadow-elite-0':Object.freeze({motionPath:'expedition/enemies/meadow-elite-0-motion-v2.webp',cols:4,rows:2,facing:'left',baseline:.8658399098083427,renderScale:1.8,
  motionDefects:Object.freeze(['cell_margin_12_7_percent_below_20_percent_goal']),
  poseOffsets:Object.freeze([0,-.451,-.451,-.2255,9.1319,9.3574,9.3574,8.9064]),
  impactPoses:Object.freeze({attack:Object.freeze([1,3]),skill1:3,skill2:5,awaken:5})}),
 'meadow-elite-1':Object.freeze({motionPath:'expedition/enemies/meadow-elite-1-motion-v3.webp',cols:4,rows:2,facing:'left',baseline:.9131905298759865,renderScale:1.7,
  motionDefects:Object.freeze(['cell_margin_8_45_percent_below_20_percent_goal']),
  poseOffsets:Object.freeze([0,-.2255,-.2255,8.3427,14.0924,14.7689,14.7689,13.6415]),
  impactPoses:Object.freeze({attack:Object.freeze([1,2]),skill1:5,skill2:5,awaken:5})}),
 'blossom-normal-0':Object.freeze({motionPath:'expedition/enemies/blossom-normal-0-motion-v5.webp',cols:4,rows:2,facing:'left',baseline:.9041713641488163,renderScale:1.8,
  poseOffsets:Object.freeze([0,0,-.451,0,8.6809,8.4555,8.6809,8.6809]),
  impactPoses:Object.freeze({attack:Object.freeze([1,2,3]),skill1:5,skill2:5,awaken:5})}),
 'blossom-normal-1':Object.freeze({motionPath:'expedition/enemies/blossom-normal-1-motion-v5.webp',cols:4,rows:2,facing:'left',baseline:.874859075535513,renderScale:1.8,
  poseOffsets:Object.freeze([0,0,0,0,13.867,13.867,13.867,13.867]),
  impactPoses:Object.freeze({attack:Object.freeze([1,2,3]),skill1:5,skill2:5,awaken:5})}),
 'blossom-normal-2':Object.freeze({motionPath:'expedition/enemies/blossom-normal-2-motion-v4.webp',cols:4,rows:2,facing:'left',baseline:.874859075535513,renderScale:2.1,
  // Guard bow tip is below both root feet: native foot y801, not bow y809.
  poseOffsets:Object.freeze([0,0,-.2255,0,6.6516,7.1026,6.8771,6.8771]),
  impactPoses:Object.freeze({attack:Object.freeze([1,2,3]),skill1:5,skill2:5,awaken:5})}),
 'blossom-normal-3':Object.freeze({motionPath:'expedition/enemies/blossom-normal-3-motion-v5.webp',cols:4,rows:2,facing:'left',baseline:.8478015783540023,renderScale:1.8,
  motionDefects:Object.freeze(['pose3_hover_not_used_as_attack']),
  poseOffsets:Object.freeze([0,-1.1274,-.451,-.2255,6.2007,9.5829,7.779,6.8771]),
  impactPoses:Object.freeze({attack:Object.freeze([1,2]),skill1:5,skill2:5,awaken:5})}),
 'blossom-elite-0':Object.freeze({motionPath:'expedition/enemies/blossom-elite-0-motion-v7.webp',cols:4,rows:2,facing:'left',baseline:.8816234498308907,renderScale:2.2,
  poseOffsets:Object.freeze([0,0,-.451,0,10.0338,10.0338,9.8083,8.4555]),
  impactPoses:Object.freeze({attack:Object.freeze([1,2,3]),skill1:5,skill2:5,awaken:5})}),
 'blossom-elite-1':Object.freeze({motionPath:'expedition/enemies/blossom-elite-1-motion-v7.webp',cols:4,rows:2,facing:'left',baseline:.8455467869222097,renderScale:2.2,
  poseOffsets:Object.freeze([0,0,0,0,11.6122,11.8377,11.6122,11.3867]),
  impactPoses:Object.freeze({attack:Object.freeze([1,2,3]),skill1:5,skill2:5,awaken:5})}),
 'blossom-boss':Object.freeze({motionPath:'expedition/bosses/blossom-motion-v7.webp',cols:4,rows:2,facing:'left',baseline:.8726042841037204,renderScale:2.2,
  motionDefects:Object.freeze(['pose3_folded_fans_not_used_as_attack']),
  // Pose2's fan extends below its roots; the root contact, not whole-art
  // alpha bounds, defines the ground pivot (native root y388, idle y387).
  poseOffsets:Object.freeze([0,.451,-.2255,-.2255,10.0338,9.8083,9.1319,9.3574]),
  impactPoses:Object.freeze({attack:Object.freeze([1,2]),skill1:5,skill2:5,awaken:5})}),
 'autumn-normal-0':Object.freeze({motionPath:'expedition/enemies/autumn-normal-0-motion-v2.webp',cols:4,rows:2,facing:'left',baseline:0.8410372040586246,renderScale:2.1,
  motionDefects:Object.freeze(["cell_margin_14_54_percent_below_20_percent_goal"]),
  poseOffsets:Object.freeze([0,0.2255,-0.6764,0,14.5434,14.7689,14.5434,14.5434]),
  impactPoses:Object.freeze({attack:Object.freeze([1,2,3]),skill1:5,skill2:5,awaken:5})}),
 'autumn-normal-1':Object.freeze({motionPath:'expedition/enemies/autumn-normal-1-motion-v2.webp',cols:4,rows:2,facing:'left',baseline:0.8320180383314544,renderScale:2.1,
  motionDefects:Object.freeze(["cell_margin_14_32_percent_below_20_percent_goal"]),
  poseOffsets:Object.freeze([0,0,0.2255,0,7.3281,7.5536,7.3281,7.3281]),
  impactPoses:Object.freeze({attack:Object.freeze([1,2,3]),skill1:5,skill2:5,awaken:5})}),
 'autumn-normal-2':Object.freeze({motionPath:'expedition/enemies/autumn-normal-2-motion-v2.webp',cols:4,rows:2,facing:'left',baseline:0.8523111612175873,renderScale:2.1,
  motionDefects:Object.freeze(["cell_margin_12_85_percent_below_20_percent_goal","pose3_rear_tail_not_used_as_left_attack"]),
  poseOffsets:Object.freeze([0,0.2255,0.2255,0.2255,15.6708,15.4453,15.2198,15.2198]),
  impactPoses:Object.freeze({attack:Object.freeze([1,2]),skill1:5,skill2:5,awaken:5})}),
 'autumn-normal-3':Object.freeze({motionPath:'expedition/enemies/autumn-normal-3-motion-v2.webp',cols:4,rows:2,facing:'left',baseline:0.8726042841037204,renderScale:1.9,
  motionDefects:Object.freeze(["cell_margin_9_36_percent_below_20_percent_goal","pose2_tail_occluded_feet_not_used_as_attack"]),
  poseOffsets:Object.freeze([0,-0.2255,-3.3822,-2.0293,15.8963,14.9944,13.6415,14.9944]),
  impactPoses:Object.freeze({attack:Object.freeze([1,3]),skill1:5,skill2:5,awaken:5})}),
 'autumn-elite-0':Object.freeze({motionPath:'expedition/enemies/autumn-elite-0-motion-v2.webp',cols:4,rows:2,facing:'left',baseline:0.8996617812852311,renderScale:1.9,preparationPose:3,
  motionDefects:Object.freeze(["cell_margin_9_13_percent_below_20_percent_goal","pose2_front_facing_not_used_as_left_attack","pose4_right_facing_replaced_with_left_crouch3"]),
  poseOffsets:Object.freeze([0,0.9019,0.2255,-0.9019,15.8963,14.7689,14.7689,15.2198]),
  impactPoses:Object.freeze({attack:Object.freeze([1,5]),skill1:5,skill2:5,awaken:5})}),
 'autumn-elite-1':Object.freeze({motionPath:'expedition/enemies/autumn-elite-1-motion-v2.webp',cols:4,rows:2,facing:'left',baseline:0.8455467869222097,renderScale:2.2,
  motionDefects:Object.freeze(["cell_margin_8_23_percent_below_20_percent_goal"]),
  poseOffsets:Object.freeze([0,0.6764,0.451,2.0293,10.4848,10.4848,11.1612,10.7103]),
  impactPoses:Object.freeze({attack:Object.freeze([1,2,3]),skill1:5,skill2:5,awaken:5})}),
 'autumn-boss':Object.freeze({motionPath:'expedition/bosses/autumn-motion-v2.webp',cols:4,rows:2,facing:'left',baseline:0.9086809470124013,renderScale:2.1,
  motionDefects:Object.freeze(["cell_margin_6_65_percent_below_20_percent_goal","pose2_low_tail_not_used_as_grounded_attack"]),
  poseOffsets:Object.freeze([0,0.451,-2.4803,0.2255,10.0338,10.2593,10.2593,10.4848]),
  impactPoses:Object.freeze({attack:Object.freeze([1,3]),skill1:5,skill2:5,awaken:5})}),
 'meadow-boss':Object.freeze({motionPath:'expedition/bosses/meadow-motion-v1.webp',cols:4,rows:2,facing:'left',baseline:.8771138669673055,renderScale:2.2,
  poseOffsets:Object.freeze([0,-.451,-.6764,-.2255,10.2593,9.5829,9.5829,9.8083]),
  impactPoses:Object.freeze({attack:Object.freeze([1,3]),skill1:3,skill2:5,awaken:5})})
});
// Forty-eight distinct static species candidates, mechanically extracted from
// eight garden atlases. Native alpha and crop framing were inspected, but a
// static portrait is not reviewed motion or a final gameplay-ready sprite.
const ENEMY_CANDIDATE_GARDENS=Object.freeze(['meadow','blossom','autumn','snow','moon','fire','shadow','dream']);
const ENEMY_CANDIDATE_DEFECTS=Object.freeze({
 'snow-elite-0':['cell_margin_45px_below_12_percent_goal'],
 'snow-elite-1':['cell_margin_34px_below_12_percent_goal'],
 'fire-normal-2':['cell_margin_43px_below_12_percent_goal'],
 'fire-elite-0':['cell_margin_11px_near_right_crop_edge','lizard_shape_needs_boss_separation_review'],
 'fire-elite-1':['cell_margin_46px_below_12_percent_goal'],
 'shadow-normal-2':['cell_margin_33px_below_12_percent_goal'],
 'shadow-elite-1':['cell_margin_36px_below_12_percent_goal']
});
const ENEMY_CANDIDATES=Object.freeze(Object.fromEntries(ENEMY_CANDIDATE_GARDENS.flatMap(garden=>
 ['normal-0','normal-1','normal-2','normal-3','elite-0','elite-1'].map(rank=>{
  const id=`${garden}-${rank}`;
  return [id,Object.freeze({path:`expedition/enemies/${id}-v1.webp`,thumbPath:`expedition/enemies/${id}-thumb-v1.webp`,facing:garden==='blossom'?'left':null,defects:Object.freeze(ENEMY_CANDIDATE_DEFECTS[id]||[])})];
 })
)));
// A painted portrait is not a pose sheet. Keep the original boss identity and
// missing motion visible to callers until an encounter animation is reviewed.
const BOSS_CANDIDATES=Object.freeze({
 'meadow-boss':Object.freeze({path:'expedition/bosses/meadow-v1.webp',thumbPath:'expedition/bosses/meadow-thumb-v1.webp',defects:Object.freeze([])}),
 'blossom-boss':Object.freeze({path:'expedition/bosses/blossom-v1.webp',thumbPath:'expedition/bosses/blossom-thumb-v1.webp',facing:'left',defects:Object.freeze([])}),
 'autumn-boss':Object.freeze({path:'expedition/bosses/autumn-v1.webp',thumbPath:'expedition/bosses/autumn-thumb-v1.webp',defects:Object.freeze([])}),
 'snow-boss':Object.freeze({path:'expedition/bosses/snow-v1.webp',thumbPath:'expedition/bosses/snow-thumb-v1.webp',defects:Object.freeze([])}),
 'moon-boss':Object.freeze({path:'expedition/bosses/moon-v1.webp',thumbPath:'expedition/bosses/moon-thumb-v1.webp',defects:Object.freeze(['antler_tip_has_insufficient_margin'])}),
 'fire-boss':Object.freeze({path:'expedition/bosses/fire-v1.webp',thumbPath:'expedition/bosses/fire-thumb-v1.webp',defects:Object.freeze([])}),
 'shadow-boss':Object.freeze({path:'expedition/bosses/shadow-v1.webp',thumbPath:'expedition/bosses/shadow-thumb-v1.webp',defects:Object.freeze([])}),
 'dream-boss':Object.freeze({path:'expedition/bosses/dream-v1.webp',thumbPath:'expedition/bosses/dream-thumb-v1.webp',defects:Object.freeze([])})
});
const FIELD_LAYER_NAMES=Object.freeze(['far','middle','foreground']);
const FIELD_LAYER_CANDIDATES=Object.freeze(Object.fromEntries(['meadow','blossom','autumn','snow','moon','fire','shadow','dream'].map(garden=>[garden,
 Object.freeze(Object.fromEntries(FIELD_LAYER_NAMES.map(layer=>[layer,`expedition/fields/${garden}-${layer}-v1.webp`])))
])));
// Native foreground tips differ: preserve their scale and keep decorations
// below the walking plane in wide crops rather than stretching the artwork.
const FIELD_FOREGROUND_START=Object.freeze({blossom:.85,autumn:.85,snow:.88,moon:.86,fire:.85,shadow:.83,dream:.87});
const FIELD_GROUND_CONTACT=Object.freeze({blossom:.72,autumn:.72,moon:.74,fire:.75,shadow:.72,dream:.72});
const FIELD_FAR_FRAMING=Object.freeze({moon:Object.freeze({anchorY:.25,focalX:.805})});
const HOME_THUMBS=Object.freeze(Object.fromEntries(Object.keys(EXPEDITION_GARDENS).map(id=>[id,`expedition/fields/${id}-home-thumb-v1.webp`])));
const knownPaths=new Set([...Object.values(MOTION),...Object.values(ENEMY_SKELETON_ART),...Object.values(ENEMY_CANDIDATES).flatMap(x=>[x.path,x.thumbPath]),...Object.values(BOSS_CANDIDATES).flatMap(x=>[x.path,x.thumbPath]),...Object.values(EXPEDITION_GARDENS).map(g=>g.homeArt),...Object.values(HOME_THUMBS)]);
const validBase=base=>typeof base==='string'&&(base==='./'||/^\/(?:[A-Za-z0-9._~!$&'()*+,;=:@%-]+\/)*$/.test(base)||/^https?:\/\/[A-Za-z0-9.-]+(?::\d+)?(?:\/[A-Za-z0-9._~!$&'()*+,;=:@%-]*)*\/?$/.test(base));
for(const layers of Object.values(FIELD_LAYER_CANDIDATES))for(const path of Object.values(layers))knownPaths.add(path);
for(const art of Object.values(ENEMY_MOTION_CANDIDATES))knownPaths.add(art.motionPath);

export function expeditionAssetUrl(path,base=import.meta.env?.BASE_URL||'/'){
 if(!knownPaths.has(path)||!validBase(base))return null;
 return `${base.endsWith('/')?base:base+'/'}assets/${path}`;
}

// Relative URLs in a custom property are resolved where var() is consumed,
// which may be a production stylesheet under assets/. Resolve against the
// document first so inherited backgrounds do not request assets/assets/.
export function expeditionCssAssetUrl(path,base,documentBase){
 const relative=expeditionAssetUrl(path,base);if(!relative)return null;
 try{return new URL(relative,documentBase).href;}catch{return null;}
}

export function expeditionAllyArt(speciesId){
 const species=getExpeditionSpecies(speciesId);if(!species)return null;
 const path=MOTION[speciesId]||null;
 return Object.freeze({id:speciesId,kind:species.kind,status:path?'reusable':'placeholder',path,cols:path?4:null,rows:path?2:null,placeholder:path?null:'formArt',ready:false,reason:path?'existing_duel_motion_needs_expedition_qa':'authored_motion_missing'});
}

export function expeditionEnemyArt(enemyId){
 const enemy=Object.hasOwn(EXPEDITION_ENEMIES,enemyId)?EXPEDITION_ENEMIES[enemyId]:null;if(!enemy)return null;
 const individual=ENEMY_CANDIDATES[enemyId];
 if(individual)return Object.freeze({id:enemyId,gardenId:enemy.gardenId,rank:enemy.rank,status:'authored_candidate',path:individual.path,thumbPath:individual.thumbPath,motionPath:null,cols:null,rows:null,facing:individual.facing,defects:individual.defects,...ENEMY_MOTION_CANDIDATES[enemyId],ready:false,reason:ENEMY_MOTION_CANDIDATES[enemyId]?'authored_motion_candidate_final_gameplay_device_qa_pending':'painted_static_candidate_motion_and_gameplay_qa_missing'});
 const authored=BOSS_CANDIDATES[enemyId];
 if(authored)return Object.freeze({id:enemyId,gardenId:enemy.gardenId,rank:enemy.rank,status:'authored_candidate',path:authored.path,thumbPath:authored.thumbPath,motionPath:null,cols:null,rows:null,facing:authored.facing||null,defects:authored.defects,...ENEMY_MOTION_CANDIDATES[enemyId],ready:false,reason:ENEMY_MOTION_CANDIDATES[enemyId]?'authored_motion_candidate_final_gameplay_device_qa_pending':'painted_static_candidate_motion_and_gameplay_qa_missing'});
 const path=enemy.rank==='boss'?null:ENEMY_SKELETON_ART[enemy.skeleton]||null;
 return Object.freeze({id:enemyId,gardenId:enemy.gardenId,rank:enemy.rank,status:path?'placeholder':'missing',path,thumbPath:null,motionPath:null,cols:path?2:null,rows:path?2:null,ready:false,reason:path?'shared_skeleton_only_no_region_identity':'authored_boss_missing'});
}

export function expeditionGardenArt(gardenId){
 const g=Object.hasOwn(EXPEDITION_GARDENS,gardenId)?EXPEDITION_GARDENS[gardenId]:null;if(!g)return null;
 const layers=FIELD_LAYER_CANDIDATES[gardenId]||null;
 return Object.freeze({id:gardenId,status:layers?'layered_candidate':'reusable',path:g.homeArt,thumbPath:HOME_THUMBS[gardenId],layers,foregroundStart:FIELD_FOREGROUND_START[gardenId]??null,groundContact:FIELD_GROUND_CONTACT[gardenId]??null,farFraming:FIELD_FAR_FRAMING[gardenId]??null,ready:false,missingLayers:layers?Object.freeze([]):FIELD_LAYER_NAMES,reason:layers?'authored_three_layer_candidate_gameplay_device_qa_pending':'single_existing_plate_not_authored_three_layer_side_scroll'});
}

// Returns only the current garden and up to eight current party sheets. No
// browser request is made here, and no 162-species gallery is constructed.
export function expeditionGardenAssetBatch(gardenId,{partySpeciesIds=[],includeEncounter=false,base=import.meta.env?.BASE_URL||'/'}={}){
 const field=expeditionGardenArt(gardenId);if(!field)return [];
 const paths=new Set(field.layers?Object.values(field.layers):[field.path]);
 for(const id of Array.isArray(partySpeciesIds)?partySpeciesIds.slice(0,8):[]){const art=expeditionAllyArt(id);if(art?.path)paths.add(art.path);}
 if(includeEncounter)for(const enemy of Object.values(EXPEDITION_ENEMIES))if(enemy.gardenId===gardenId){const art=expeditionEnemyArt(enemy.id);if(art?.thumbPath||art?.path)paths.add(art.thumbPath||art.path);}
 return [...paths].map(path=>expeditionAssetUrl(path,base));
}

export function expeditionArtAudit(){
 const species=Object.keys(EXPEDITION_SPECIES),enemies=Object.keys(EXPEDITION_ENEMIES);
 return Object.freeze({allies:Object.freeze({total:species.length,reusable:species.filter(id=>MOTION[id]).length,placeholder:species.filter(id=>!MOTION[id]).length,ready:0}),enemies:Object.freeze({total:enemies.length,placeholder:enemies.filter(id=>expeditionEnemyArt(id).status==='placeholder').length,authoredCandidate:enemies.filter(id=>expeditionEnemyArt(id).status==='authored_candidate').length,missing:enemies.filter(id=>expeditionEnemyArt(id).status==='missing').length,motionCandidate:enemies.filter(id=>expeditionEnemyArt(id).motionPath).length,motionReady:0,ready:0}),gardens:Object.freeze({total:Object.keys(EXPEDITION_GARDENS).length,reusable:Object.keys(EXPEDITION_GARDENS).length,threeLayerReady:0})});
}

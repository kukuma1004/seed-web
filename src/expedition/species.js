import {LAWS} from '../laws.js';
import {DISCOVERY_FORMS,SOLO_FORMS,FORMS,AWAKEN_FORMS,TWIN_FORMS} from '../forms.js';
import identityManifest from '../final-identity-manifest.json' with {type:'json'};
import {FINAL_BRANCH_PATTERNS} from '../final-branch-patterns.js';
import {TWIN_INTERACTIONS} from '../twin-interactions.js';

// Identity is a projection of the canonical book. Expedition balance lives here;
// action-game and duel balance are never mutated by this adapter.
export const XP_THRESHOLDS=Object.freeze([0,20,50,95,160,250,360,500,680,900]);
export const LAW_DNA=Object.freeze({
 burst:{role:'파괴자',verb:'파괴',family:'attack',hp:95,power:22,defense:4,speed:8},
 pierce:{role:'저격수',verb:'저격',family:'attack',hp:92,power:21,defense:4,speed:10},
 split:{role:'증식사',verb:'증식',family:'attack',hp:98,power:18,defense:5,speed:9},
 gravity:{role:'조율사',verb:'집결',family:'control',hp:102,power:16,defense:6,speed:7},
 chain:{role:'전도술사',verb:'전도',family:'control',hp:96,power:18,defense:4,speed:10},
 frost:{role:'봉쇄자',verb:'봉쇄',family:'control',hp:100,power:16,defense:5,speed:9},
 orbit:{role:'호위자',verb:'호위',family:'guard',hp:120,power:14,defense:8,speed:7},
 reflect:{role:'반격수호자',verb:'반격',family:'guard',hp:115,power:15,defense:7,speed:8},
 recall:{role:'유격수',verb:'순환',family:'guard',hp:102,power:17,defense:5,speed:11}
});
const op=(type,target='single',ratio=0,extra={})=>({type,target,ratio,...extra});
const damage=(target='single',ratio=1,extra={})=>op('damage',target,ratio,extra);
const mark=()=>op('vulnerable');
const cold=(target='single',stacks=1)=>op('chill',target,0,{stacks});
const shield=(target='self',ratio=.8)=>op('protection',target,ratio);
const delayed=(target='single',ratio=.7)=>op('return',target,ratio,{rounds:1});
const conducting=(target='single')=>op('conductive',target);
const counter=(ratio=.7)=>op('counter','self',ratio,{charges:1});
const pull=(target='single')=>op('pull',target);
const BASE_SKILLS=Object.freeze({
 burst:[delayed('adjacent',.75)],pierce:[damage('column',1.1)],
 split:[op('split','adjacent',.65,{maxTargets:3})],
 gravity:[pull(),mark()],chain:[conducting(),damage('adjacent',.6,{when:'conductive'})],
 frost:[cold('single',2),damage('single',.7)],
 orbit:[shield('ally',1.4)],reflect:[shield('self',.7),counter(1)],
 recall:[damage('single',.6),delayed('single',.6)]
});
// Canonical SOLO_FORMS supply IDs/name/ancestry; these are law adapters, not
// a second species catalog. P2 has no walls, projectile range or bullet class:
// mirror bounces become earned guarded-receipt echoes, penetration an earned
// second pass through the same column, and orbit contact a bounded protection
// plus nearby cut. General P2 protection cannot claim the action-game's
// ordinary-bullet-only interception. Temporal paths retain exact target bodies.
const SOLO_SKILLS=Object.freeze({
 reflect:{skill1:[counter(.75),damage('column',.55,{when:'guarded',maxTargets:2})],skill2:[counter(.8),op('return','column',.8,{when:'guarded',rounds:1,maxTargets:2})]},
 split:{skill1:[damage('single',.65),op('split','adjacent',.45,{when:'crowded',maxTargets:3}),op('split','adjacent',.3,{when:'crowded',maxTargets:3})],skill2:[damage('single',.75),op('split','adjacent',.55,{when:'crowded',maxTargets:3}),op('split','adjacent',.35,{when:'crowded',maxTargets:3})]},
 chain:{skill1:[op('conductive','all',0,{maxTargets:3}),damage('adjacent',.55,{when:'conductive',maxTargets:3})],skill2:[op('conductive','all',0,{maxTargets:5}),damage('column',.7,{when:'conductive',maxTargets:2}),damage('adjacent',.35,{when:'conductive',maxTargets:3})]},
 orbit:{skill1:[shield('self',.7),damage('adjacent',.5,{when:'protected',maxTargets:3}),shield('ally',.6)],skill2:[shield('self',.9),damage('column',.8,{when:'protected',maxTargets:2}),shield('ally',.8)]},
 pierce:{skill1:[damage('column',.8,{maxTargets:2}),damage('column',.4,{when:'hit',maxTargets:2})],skill2:[damage('column',.9,{maxTargets:2}),damage('column',.65,{when:'hit',maxTargets:2})]},
 burst:{skill1:[op('return','adjacent',.8,{rounds:1,maxTargets:3}),op('return','adjacent',.35,{rounds:2,maxTargets:3})],skill2:[op('return','adjacent',1,{rounds:1,maxTargets:3}),op('return','adjacent',.45,{rounds:2,maxTargets:3})]},
 recall:{skill1:[damage('column',.45,{maxTargets:2}),op('return','column',.5,{rounds:1,maxTargets:2}),op('return','column',.45,{rounds:2,maxTargets:2})],skill2:[op('return','column',.7,{rounds:1,maxTargets:2}),op('return','column',.6,{rounds:2,maxTargets:2}),op('return','column',.5,{rounds:3,maxTargets:2})]},
 gravity:{skill1:[pull('adjacent'),damage('adjacent',.25,{when:'crowded',maxTargets:3}),op('return','adjacent',.45,{rounds:1,maxTargets:3}),op('return','adjacent',.35,{rounds:2,maxTargets:3})],skill2:[pull('column'),op('vulnerable','column'),op('return','column',.8,{rounds:1,maxTargets:2}),op('return','column',.6,{rounds:2,maxTargets:2})]},
 frost:{skill1:[damage('adjacent',.4,{when:'chilled',maxTargets:3}),damage('adjacent',.5,{maxTargets:3}),cold('adjacent',1)],skill2:[damage('adjacent',.7,{when:'chilled',maxTargets:3}),cold('adjacent',2),damage('adjacent',.5,{maxTargets:3})]}
});
// Authored coupled attacks. Conditions make the second parent's law depend on
// the first's action rather than placing two unrelated skills beside each other.
const FUSION_ATTACKS=Object.freeze({
 collapse:{trigger:'끌어당겨 전열에 모은 뒤 지연 붕괴',ops:[pull('adjacent'),delayed('adjacent',1.05)]},
 frostguard:{trigger:'보호받는 동료의 열에 서리 궤도를 유지',ops:[shield('ally',1.1),cold('column',1)]},
 returnblade:{trigger:'관통한 열을 다음 라운드 되짚기',ops:[damage('column',.7),delayed('column',.7)]},
 prism:{trigger:'반격에 맞은 표적에서 파편 분열',ops:[counter(.65),op('split','adjacent',.6,{when:'guarded'})]},
 thunderlance:{trigger:'꿰뚫린 열에 전도 표식을 만들기',ops:[damage('column',.8),conducting('column')]},
 frostbloom:{trigger:'냉기를 쌓은 적의 봉오리 파열',ops:[cold('adjacent',1),delayed('adjacent',.9)]},
 stormcrown:{trigger:'호위한 전열 주위로 전류를 연결',ops:[shield('ally',.9),conducting('adjacent'),damage('adjacent',.4,{when:'conductive'})]},
 tidepull:{trigger:'적을 앞으로 끌어오고 귀환 경로로 재타격',ops:[pull('column'),delayed('column',1)]},
 seedstorm:{trigger:'갈라진 씨앗이 각각 가까운 무리를 폭파',ops:[op('split','all',.55,{maxTargets:3}),delayed('adjacent',.45)]},
 mirrorguard:{trigger:'동료의 보호를 거울 반격으로 변환',ops:[shield('ally',1.3),counter(.35)]},
 gravitymirror:{trigger:'반격 표적을 끌어와 압축 표식',ops:[counter(.65),pull(),mark()]},
 chainburst:{trigger:'전도 연결 마지막 열에 폭뢰 예약',ops:[conducting('column'),delayed('column',.95)]},
 blastlance:{trigger:'같은 열을 관통한 뒤 내부 폭발',ops:[damage('column',.7),delayed('single',.9)]},
 frostkaleidoscope:{trigger:'반격을 준비하며 냉기 축적, 냉각 적을 파쇄',ops:[counter(.7),cold(),damage('single',.55,{when:'chilled'})]},
 lightningpetal:{trigger:'분열 파편이 각 표적에 전도 가지를 심기',ops:[op('split','all',.5,{maxTargets:3}),conducting('adjacent')]},
 returnflare:{trigger:'첫 폭발 뒤 같은 표적에 되돌아오는 불씨',ops:[damage('adjacent',.65),delayed('single',.9)]},
 comethalo:{trigger:'보호막이 남아 있을 때 혜성 출격',ops:[shield('self',.8),damage('adjacent',1,{when:'protected'})]},
 stormanchor:{trigger:'전도된 적을 열의 중심으로 묶기',ops:[conducting('adjacent'),pull('adjacent'),damage('adjacent',.65,{when:'conductive'})]},
 returningpetals:{trigger:'갈라진 경로별로 다음 라운드 귀환',ops:[op('split','all',.4,{maxTargets:3}),delayed('all',.4)]},
 icicle:{trigger:'이미 냉각된 열을 꿰뚫어 파쇄',ops:[damage('column',1,{when:'chilled'}),cold('column',1)]},
 halobloom:{trigger:'호위막이 남았을 때 꽃잎 고리 만개',ops:[shield('self',.8),op('split','all',.65,{when:'protected',maxTargets:3})]},
 frostnet:{trigger:'전도망을 탄 냉기가 연결 대상을 봉쇄',ops:[conducting('adjacent'),cold('adjacent',1),damage('adjacent',.6,{when:'conductive'})]},
 rewindbolt:{trigger:'전도된 경로에 다음 라운드 번개 재전송',ops:[conducting('column'),damage('column',.5),delayed('column',.8)]},
 refractlance:{trigger:'반격 자세에서 긴 열로 창을 꺾기',ops:[counter(.55),damage('column',1,{when:'guarded'})]},
 thundermirror:{trigger:'전도 표적에게 다음 반격을 되돌리기',ops:[conducting(),counter(1.1)]},
 sunmirror:{trigger:'막은 공격의 위험을 폭발로 돌려주기',ops:[shield('self',.7),counter(1.25)]},
 pierceshower:{trigger:'관통한 열에서 양옆 꽃잎 발아',ops:[damage('column',.8),op('split','adjacent',.45,{maxTargets:2})]},
 ebbring:{trigger:'동료를 호위하고 밀물처럼 다음 턴 재공격',ops:[shield('ally',.7),delayed('column',.8)]},
 pullgarden:{trigger:'갈라진 끌림 꽃밭에 둘 이상 모이면 개화',ops:[pull('adjacent'),op('split','adjacent',.95,{when:'crowded',maxTargets:3})]},
 spearring:{trigger:'호위하는 창을 떼어 전방 열을 관통',ops:[shield('ally',.7),damage('column',.9)]},
 accretiondisk:{trigger:'동료 보호와 흡인으로 위협을 한 열에 수집',ops:[shield('ally',1),pull('column'),damage('single',.6,{when:'crowded'})]},
 rimeback:{trigger:'왕로에서 냉각, 복로에서 냉각 표적 파쇄',ops:[cold('column',1),delayed('column',.95)]},
 coldwell:{trigger:'집결된 열의 냉기를 중첩해 순서 지연',ops:[pull('column'),cold('column',2)]},
 rimepetal:{trigger:'분열 꽃잎이 냉기를 여러 표적에 분배',ops:[op('split','all',.55,{maxTargets:3}),cold('adjacent',1)]},
 echolane:{trigger:'반격 궤적을 같은 표적에게 역순 귀환',ops:[counter(.65),delayed('single',.85)]},
 gravitystake:{trigger:'혼자 있는 표적에 말뚝을 박아 다음 턴 내파',ops:[mark(),delayed('single',1.8),damage('single',.3,{when:'alone'})]}
});
const identities=new Map(identityManifest.entries.map(x=>[x.id,x]));
const deepFreeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(deepFreeze);Object.freeze(x);}return x;};
const kindOf=id=>Object.hasOwn(LAWS,id)?'base':Object.hasOwn(SOLO_FORMS,id)?'solo':Object.hasOwn(TWIN_FORMS,id)?'twin':Object.hasOwn(AWAKEN_FORMS,id)?'final':'fusion';
function branchOps(id,parent,dominant){
 const motion=FINAL_BRANCH_PATTERNS[id]?.motion;
 // The existing authored motion chooses space/time behavior. The exact source
 // variation is retained for the presentation adapter and balance audit.
 if(motion==='return')return [damage('column',.65),delayed('column',1),...BASE_SKILLS[dominant]];
 if(motion==='satellite')return [shield('ally',1.2),...BASE_SKILLS[dominant]];
 if(motion==='field')return [pull('adjacent'),...BASE_SKILLS[dominant],mark()];
 if(motion==='mark')return [mark(),delayed('single',1.1),...BASE_SKILLS[dominant]];
 if(motion==='relay')return [conducting('adjacent'),damage('adjacent',.8,{when:'conductive'}),...BASE_SKILLS[dominant]];
 if(motion==='fan')return [op('split','all',.55,{maxTargets:3}),...BASE_SKILLS[dominant]];
 if(motion==='sweep'||motion==='spiral')return [damage('column',1.05),...BASE_SKILLS[dominant]];
 if(motion==='ricochet')return [counter(.9),...BASE_SKILLS[dominant]];
 if(motion==='mortar')return [delayed('adjacent',1.1),...BASE_SKILLS[dominant]];
 return [...parent,...BASE_SKILLS[dominant]];
}
function makeSpecies(id,f){
 const kind=kindOf(id),laws=kind==='base'?[id]:[...f.requires];
 const identity=identities.get(id),dominantLaw=kind==='final'?(identity?.addedLaw||SOLO_FORMS[f.addedSolo]?.requires[0]):laws[0];
 if(!laws.every(l=>Object.hasOwn(LAW_DNA,l))||!dominantLaw)throw Error(`Invalid expedition laws ${id}`);
 const parents=kind==='base'?[]:kind==='solo'?[laws[0]]:kind==='fusion'?[...laws]:kind==='final'?[f.base,f.addedSolo]:[...f.parts];
 if(kind==='fusion'&&!FUSION_ATTACKS[id])throw Error(`Missing authored expedition fusion ${id}`);
 let skills,trigger;
 if(kind==='base'){skills=BASE_SKILLS[id];trigger=LAW_DNA[id].verb;}
 else if(kind==='solo'){skills=SOLO_SKILLS[laws[0]].skill1;trigger=f.desc;}
 else if(kind==='fusion'){skills=FUSION_ATTACKS[id].ops;trigger=FUSION_ATTACKS[id].trigger;}
 else if(kind==='final'){skills=branchOps(id,FUSION_ATTACKS[f.base].ops,dominantLaw);trigger=identity?.behavior||f.desc;}
 else {skills=[];trigger=TWIN_INTERACTIONS[id]?.rule||f.desc;}
 const stats={};for(const key of ['hp','power','defense','speed'])stats[key]=Math.round(laws.reduce((n,l)=>n+LAW_DNA[l][key],0)/laws.length);
 const attack=laws.includes('pierce')?[damage('column',.75)]:[damage()];
 return deepFreeze({id,name:f.name,kind,laws,parents,dominantLaw,role:identity?.role||laws.map(l=>LAW_DNA[l].role).join('・'),
  trigger,weakness:identity?.tradeoff||f.weakness||LAWS[id]?.hint,behavior:identity?.behavior||f.desc,
  stats,actionPattern:{attack,skill1:skills,skill2:kind==='base'?BASE_SKILLS[id]:kind==='solo'?SOLO_SKILLS[laws[0]].skill2:[mark(),...skills],awaken:kind==='twin'?[]:[...skills,damage('single',1,{when:'marked'})]},
  sourceMotion:FINAL_BRANCH_PATTERNS[id]||null,resonance:kind==='twin'?TWIN_INTERACTIONS[id]||null:null,
  representation:kind==='twin'?'pair':'individual',duelCharacterId:null,validation:'adapter_candidate'});
}
export const EXPEDITION_SPECIES=deepFreeze(Object.fromEntries([
 ...Object.entries(LAWS),...Object.entries(DISCOVERY_FORMS)
].map(([id,f])=>[id,makeSpecies(id,f)])));
export const EXPEDITION_TAXONOMY=deepFreeze(Object.fromEntries(['base','solo','fusion','final','twin'].map(k=>[k,Object.values(EXPEDITION_SPECIES).filter(x=>x.kind===k).length])));
if(JSON.stringify(Object.values(EXPEDITION_TAXONOMY))!==JSON.stringify([9,9,36,72,36]))throw Error('Expedition canonical taxonomy drift');
export function getExpeditionSpecies(id){return Object.hasOwn(EXPEDITION_SPECIES,id)?EXPEDITION_SPECIES[id]:null;}
export function expeditionLevel(xp){return XP_THRESHOLDS.reduce((level,threshold,index)=>xp>=threshold?index+1:level,1);}
export function expeditionStats(id,level=1){const s=getExpeditionSpecies(id);if(!s||s.kind==='twin')return null;const l=Math.max(1,Math.min(10,Math.floor(level)));return {...s.stats,hp:s.stats.hp+12*(l-1),power:s.stats.power+3*(l-1),defense:s.stats.defense+(l-1),speed:s.stats.speed};}

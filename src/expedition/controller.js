import {LAW_DNA,EXPEDITION_SPECIES,getExpeditionSpecies,expeditionStats} from './species.js';
import {createRoster,recruitInstance,setParty,renameInstance,damageInstance,healInstance,expeditionHealReceipt,awardExpeditionXP,grantInstanceXP,recordSurvival,evolveInstance,recordStory,unlockTwin} from './roster.js';
import {validateExpeditionName} from './names.js';
import {EXPEDITION_COMBAT_VERSION,createExpeditionCombat,expeditionCombatTurn,performExpeditionCombatAction,expeditionEnemyCommand} from './combat.js';
import {EXPEDITION_GARDENS,EXPEDITION_RUN_STEPS,newExpeditionRoute,advanceExpeditionRoute,expeditionEncounter,expeditionEnemyProfile} from './world.js';
import {createExpeditionSessionStore} from './session.js';
import {eligibleResonancePairs} from './resonance.js';
import {selectExpeditionStory} from './story.js';
import {emptyExpeditionNursery,canResowExpedition,nurseryGrowthCandidates,NURSERY_GROWTH_XP} from './nursery.js';
import {expeditionBossCommand} from './boss-ai.js';
import {applyExpeditionRelicsToActions} from './relics.js';
import {applyExpeditionMilestonesToActions} from './milestones.js';

const copy=v=>JSON.parse(JSON.stringify(v));
const freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
const randomId=()=>globalThis.crypto.randomUUID().replaceAll('-','').slice(0,16);
const INITIAL=['orbit','reflect','pierce','split','frost','burst','gravity','recall','chain'];
const aliveParty=s=>s.roster.party.filter(id=>s.roster.instances[id]?.status==='alive');
const groups=s=>({activeIds:s.roster.party.slice(0,5).filter(Boolean),reserveIds:s.roster.party.slice(5).filter(Boolean)});
function recordScene(s,context){const result=selectExpeditionStory(context,s.roster.story);if(result?.recordId&&!recordStory(s.roster,result.recordId))throw Error('이야기 기록 오류');}
// Shared pure rule projection. Callers must validate their own channel and
// exact parent before applying it. This does not read/write storage or authorize
// a review-to-account migration. Random identities are injected by the caller.
export function projectExpeditionRuntime(previous,intent,{idFactory=randomId,combatRelics=true,combatVersion=EXPEDITION_COMBAT_VERSION,directEvents=false}={}){
 // Movement changes only route scalars. Keep roster/battle/history references
 // intact instead of cloning every individual at animation-frame frequency.
 if(intent?.type==='move'){
  if(previous.screen!=='explore'||!Number.isFinite(intent.dx)||!Number.isFinite(intent.dt)||intent.dt<=0||intent.dt>.1)return {ok:false,reason:'이동 입력 오류',events:[]};
  const route={...previous.route,position:Math.max(0,Math.min(18,previous.route.position+Math.max(-1,Math.min(1,intent.dx))*4*intent.dt)),elapsedSeconds:Math.min(86400,previous.route.elapsedSeconds+intent.dt)};
  return {ok:true,state:{...previous,route},events:[],message:''};
 }
 function battleStart(s,kind){
  const battleId=`${s.route.runId}:b${s.route.step}`;
  const allies=s.roster.party.flatMap((id,slot)=>{const i=s.roster.instances[id];return i?.status==='alive'?[{id,instanceId:id,speciesId:i.speciesId,slot,hp:i.hp,maxHp:i.maxHp,level:i.level,...expeditionStats(i.speciesId,i.level)}]:[];});
  // Current damaged HP must override the species' full-health stat projection.
  for(const a of allies){a.hp=s.roster.instances[a.id].hp;a.maxHp=s.roster.instances[a.id].maxHp;}
  const resonances=eligibleResonancePairs(s.roster).filter(pair=>pair.memberIds.every(id=>s.roster.party.includes(id)));
  // Apply once at battle creation, never on restore or an already accepted
  // action. Version1 account receipts explicitly retain the old projection.
  for(const a of allies){
   const base=getExpeditionSpecies(a.speciesId).actionPattern;
   const grown=combatVersion>=3?applyExpeditionMilestonesToActions(a.speciesId,base,a.level):base;
   if(combatVersion>=3||combatRelics)a.actions=combatRelics?applyExpeditionRelicsToActions(a.speciesId,grown,s.meta.relics):grown;
  }
  if(combatRelics){
   for(const pair of resonances)pair.actions=applyExpeditionRelicsToActions(pair.speciesId,{resonance:pair.actions},s.meta.relics).resonance;
  }
  s.battle=createExpeditionCombat({version:combatVersion,battleId,allies,enemies:expeditionEncounter(s.route.gardenId,{difficulty:s.route.difficulty,kind,battleId}),resonances,getSpecies:id=>getExpeditionSpecies(id)||expeditionEnemyProfile(id)});
  s.route.status='battle';s.screen='battle';
  if(kind==='boss')recordScene(s,{trigger:'boss-intro',gardenId:s.route.gardenId,bossReady:true});
 }
 function conclude(s,kind){
  const r=s.route,ids=r.partyIds.filter(Boolean),living=ids.filter(id=>s.roster.instances[id]?.status==='alive'),boss=r.completedBattles.some(id=>id.endsWith(':b8'));
  let loot=0;
  if(kind==='return'){
   if(s.meta.committedRuns.includes(r.runId))throw Error('이미 정산한 원정이에요');
   if(s.meta.committedRuns.length>=1000)throw Error('검토 기록 한도에 도달했어요');
   for(const l of r.pendingLoot){if(s.meta.cores[l.lawId]+l.amount>10000||s.meta.awakenMaterials+l.material>10000)throw Error('재료 보관 한도에 도달했어요');s.meta.cores[l.lawId]+=l.amount;s.meta.awakenMaterials+=l.material;loot+=l.amount;}
   const completed=r.completedBattles.length>0;
   for(const find of r.pendingFinds){
    if(s.meta.rewardIds.includes(find.rewardId)||s.meta.rewardIds.length>=2000)throw Error('발견 보상 기록을 확인해 주세요');
    if(find.kind==='egg'){if(s.meta.eggs.length>=128)throw Error('온실의 알 보관함이 가득 찼어요');s.meta.eggs.push({eggId:find.rewardId,speciesId:find.speciesId,sourceRun:r.runId,gardenId:find.gardenId});}
    else {if(s.meta.cores.chain>=10000)throw Error('생명전류 보관 한도에 도달했어요');if(!recruitInstance(s.roster,{instanceId:`found-${idFactory()}`,speciesId:find.speciesId}))throw Error('구조한 새 씨앗을 저장할 수 없어요');s.meta.cores.chain++;}
    s.meta.rewardIds.push(find.rewardId);
   }
   if(r.completedBattles.length>=2){if(s.meta.growthCharges>=1000)throw Error('온실 성장 기록 한도에 도달했어요');s.meta.growthCharges++;}
   if(completed&&living.length&&!awardExpeditionXP(s.roster,{receiptId:`${r.runId}:home`,...groups(s),kind:'return'}))throw Error('생환 경험치를 저장할 수 없어요');
   for(const id of living){if(completed&&!recordSurvival(s.roster,id,{expeditionId:r.runId,boss}))throw Error('생환 기록 오류');const i=s.roster.instances[id];if(i.hp<i.maxHp&&!healInstance(s.roster,id,i.maxHp-i.hp,expeditionHealReceipt(r.runId,id,'rest')))throw Error('귀환 회복 오류');}
   s.meta.returnCount++;if(boss)s.meta.bossWins++;s.meta.committedRuns.push(r.runId);recordStory(s.roster,`${r.gardenId}:return`);
   if(boss){recordScene(s,{trigger:'garden-restore',gardenId:r.gardenId,bossDefeated:true,returned:true});recordScene(s,{trigger:'tree-endgame'});}
   if(boss){s.meta.restoration[r.gardenId]=Math.max(s.meta.restoration[r.gardenId],r.difficulty);if(!s.meta.relics.includes(r.gardenId))s.meta.relics.push(r.gardenId);}
   r.status='returned';
  }else r.status=kind==='wipe'?'wiped':'limit';
  s.lastResult={kind,gardenId:r.gardenId,difficulty:r.difficulty,survivors:living.length,lost:ids.length-living.length,loot,boss};
  r.pendingLoot=[];r.pendingFinds=[];s.battle=null;s.screen='result';
 }
 function battleAction(s,intent){
  const actor=expeditionCombatTurn(s.battle);if(!actor)throw Error('행동 차례가 없어요');
  if((intent.type==='enemy')!==(actor.side==='enemy'))throw Error('현재 행동 차례를 확인해 주세요');
  const kind=intent.type==='resonance'?'resonance':intent.kind;
  const command=intent.type==='enemy'?(expeditionBossCommand(s.battle,`${s.battle.battleId}:a${s.battle.actionCount+1}`)||expeditionEnemyCommand(s.battle,`${s.battle.battleId}:a${s.battle.actionCount+1}`)):{id:`${s.battle.battleId}:a${s.battle.actionCount+1}`,unitId:actor.id,kind,...(['attack','skill1','skill2','awaken','resonance'].includes(kind)&&intent.targetId?{targetId:intent.targetId}:{}),...(kind==='switch'&&intent.reserveId?{reserveId:intent.reserveId}:{}),...(kind==='resonance'?{resonanceId:intent.resonanceId}:{})};
  if(intent.type==='enemy'){
   const profile=expeditionEnemyProfile(actor.speciesId);
   if(!actor.boss&&profile&&(/-normal-2$|-normal-3$|-elite-/.test(actor.speciesId)))command.kind='skill1';
  }
  const result=performExpeditionCombatAction(s.battle,command);if(!result.ok)throw Error(`행동할 수 없어요 · ${result.reason}`);
  for(const e of result.events)if(e.type==='damage'&&e.amount>0&&s.roster.instances[e.targetId]){
   if(!damageInstance(s.roster,e.targetId,e.amount,{receiptId:`${s.battle.battleId}:e${e.seq}`,place:EXPEDITION_GARDENS[s.route.gardenId].name}))throw Error('피해 저장 오류');
  }
  const party=Array(8).fill(null);for(const u of s.battle.units)if(u.side==='ally'&&!u.dead)party[u.slot]=u.instanceId;
  if(!setParty(s.roster,party))throw Error('교대 저장 오류');
  if(s.battle.phase==='victory'){
   const id=s.battle.battleId,kind=s.route.step===8?'boss':s.route.step===6?'elite':'normal';
   if(s.route.completedBattles.includes(id))throw Error('중복 전투 결과');
   if(!awardExpeditionXP(s.roster,{receiptId:id,...groups(s),kind}))throw Error('전투 경험치 저장 오류');
   s.route.completedBattles.push(id);
   const lawId=EXPEDITION_GARDENS[s.route.gardenId].law;s.route.pendingLoot.push({lawId,amount:kind==='boss'?3:kind==='elite'?2:1,material:kind==='boss'?1:0});
   if(kind==='boss')recordScene(s,{trigger:'boss-outro',gardenId:s.route.gardenId,bossDefeated:true});
   // Local candidate high-risk rule: survive a ★3+ boss with low HP. It is
   // recorded per individual and law; it never grants a developer account buff.
   if(kind==='boss'&&s.route.difficulty>=3)for(const u of s.battle.units.filter(u=>u.side==='ally'&&!u.dead&&u.hp/u.maxHp<=.3)){
    const key=`${u.instanceId}:${lawId}`;if(!s.meta.highRisk.includes(key))s.meta.highRisk.push(key);
   }
   s.battle=null;s.route.status='exploring';advanceExpeditionRoute(s.route);s.screen='explore';
  }else if(s.battle.phase==='defeat')conclude(s,'wipe');else if(s.battle.phase==='limit')conclude(s,'limit');
  return result.events;
 }
  const s=copy(previous);let newEvents=[],message='';
  try{
   if(intent.type==='checkpoint'){
    // A quiescent, exact-state commit; no reward or battle command.
   }else if(intent.type==='depart'){
    if(s.screen!=='home'||!aliveParty(s).length||!s.roster.party.slice(0,5).some(Boolean))throw Error('출전할 씨앗을 먼저 배치해 주세요');
    s.route=newExpeditionRoute({runId:`run-${idFactory()}`,gardenId:intent.gardenId,difficulty:intent.difficulty??1,partyIds:s.roster.party});s.route.pendingFinds=[];advanceExpeditionRoute(s.route);s.screen='explore';s.lastResult=null;
   }else if(intent.type==='interact'){
    if(s.screen!=='explore'||!directEvents&&s.route.position<12.6)throw Error('원정 사건을 열 수 없어요');
    const step=EXPEDITION_RUN_STEPS[s.route.step];
    if(['normal1','normal2','elite','boss'].includes(step))battleStart(s,step==='elite'?'elite':step==='boss'?'boss':'normal');
    else if(step==='return')conclude(s,'return');
    else if(step==='rest')throw Error('쉼터에서 회복을 선택해 주세요');
    else if(step==='choice')throw Error('가져갈 법칙핵을 선택해 주세요');
    else if(step==='return_or_boss')throw Error('지금 귀환하거나 보스에게 도전해 주세요');
    else advanceExpeditionRoute(s.route);
   }else if(intent.type==='choice'){
    if(s.screen!=='explore'||EXPEDITION_RUN_STEPS[s.route.step]!=='choice'||!Object.hasOwn(LAW_DNA,intent.lawId)||!directEvents&&s.route.position<12.6)throw Error('법칙핵을 선택할 수 없어요');
    if(intent.mode&&intent.mode!=='core'){
     if(!['egg','rescue'].includes(intent.mode))throw Error('발견 선택이 올바르지 않아요');
     const speciesId=EXPEDITION_GARDENS[s.route.gardenId].law;s.route.pendingFinds.push({rewardId:`${s.route.runId}:find:choice`,kind:intent.mode,speciesId,gardenId:s.route.gardenId});
     if(!s.roster.discoveries.includes(speciesId)){s.roster.discoveries.push(speciesId);s.roster.discoveries.sort();s.roster.revision++;}
     message=intent.mode==='egg'?'씨앗알을 챙겼어요 · 살아 돌아와야 온실에 남아요':'약한 씨앗을 구조했어요 · 살아 돌아와야 함께할 수 있어요';
    }else s.route.pendingLoot.push({lawId:intent.lawId,amount:1,material:0});advanceExpeditionRoute(s.route);
   }else if(intent.type==='rest'){
    if(s.screen!=='explore'||EXPEDITION_RUN_STEPS[s.route.step]!=='rest'||s.route.restUsed||!directEvents&&s.route.position<12.6)throw Error('쉼터를 사용할 수 없어요');
    for(const id of aliveParty(s)){const i=s.roster.instances[id],amount=Math.min(i.maxHp-i.hp,Math.ceil(i.maxHp*.3));if(amount>0&&!healInstance(s.roster,id,amount,expeditionHealReceipt(s.route.runId,id,'camp')))throw Error('쉼터 회복 오류');}
    s.route.restUsed=true;advanceExpeditionRoute(s.route);message='살아 있는 씨앗이 쉼터에서 회복했어요';
   }else if(intent.type==='boss'){
    if(s.screen!=='explore'||EXPEDITION_RUN_STEPS[s.route.step]!=='return_or_boss'||!directEvents&&s.route.position<12.6)throw Error('아직 보스 앞이 아니에요');advanceExpeditionRoute(s.route);
   }else if(intent.type==='return'||intent.type==='skipBoss'){
    if(s.screen!=='explore')throw Error('전투 중에는 귀환할 수 없어요');conclude(s,'return');
   }else if(intent.type==='action'||intent.type==='enemy'||intent.type==='resonance'){
    if(s.screen!=='battle')throw Error('전투 중이 아니에요');newEvents=battleAction(s,intent);
   }else if(intent.type==='home'){
    if(s.screen!=='result')throw Error('먼저 원정을 마쳐 주세요');s.route=null;s.battle=null;s.screen='home';
   }else if(intent.type==='party'){
    if(s.screen!=='home'||!setParty(s.roster,intent.ids))throw Error('HOME에서 살아 있는 씨앗만 배치할 수 있어요');
   }else if(intent.type==='rename'){
    if(s.screen!=='home')throw Error('씨앗 이름은 생명의 나무에서 지어 주세요');
    const checked=validateExpeditionName(intent.name);if(!checked.ok)throw Error(checked.reason);
    if(!renameInstance(s.roster,intent.instanceId,checked.name))throw Error('살아 있는 씨앗의 이름만 바꿀 수 있어요');
    message=checked.name?'씨앗에게 새 이름을 지어줬어요':'조합 이름으로 표시해요';
   }else if(intent.type==='evolve'){
    if(s.screen!=='home')throw Error('진화는 HOME에서 확정해요');
    const i=s.roster.instances[intent.instanceId],from=getExpeditionSpecies(i?.speciesId),to=getExpeditionSpecies(intent.to);if(!from||!to)throw Error('진화 형태가 올바르지 않아요');
    const law=to.kind==='solo'?from.laws[0]:to.kind==='fusion'?to.laws.find(l=>l!==from.laws[0]):to.dominantLaw;
    const cost=to.kind==='final'?2:1;
    if(!Object.hasOwn(LAW_DNA,law)||s.meta.cores[law]<cost||to.kind==='final'&&(!s.meta.awakenMaterials||!s.meta.highRisk.includes(`${i.instanceId}:${law}`)))throw Error('법칙핵·각성 재료·개별 고위험 조건을 확인해 주세요');
    if(!evolveInstance(s.roster,i.instanceId,to.id,{receiptId:`evolve:${idFactory()}`,home:true,validateEvolution:()=>true}))throw Error('개체의 레벨과 부모 진화가 맞지 않아요');
    s.meta.cores[law]-=cost;if(to.kind==='final')s.meta.awakenMaterials--;message=`${to.name}으로 진화했어요 · 되돌릴 수 없어요`;
   }else if(intent.type==='twin'){
    if(s.screen!=='home'||!unlockTwin(s.roster,intent.a,intent.b,intent.speciesId))throw Error('두 개체의 레벨·공동 생환·보스 기록이 아직 부족해요');
    message='두 씨앗이 그대로 남아 공명 형태를 발견했어요';
   }else if(intent.type==='hatch'||intent.type==='resow'){
    if(s.screen!=='home')throw Error('새 씨앗은 온실에서 맞이해요');
    let speciesId='pierce',receipt;
    if(intent.type==='hatch'){
     const egg=s.meta.eggs.find(e=>e.eggId===intent.eggId);if(!egg)throw Error('확정된 씨앗알이 없어요');speciesId=egg.speciesId;receipt=`hatch:${egg.eggId}`;
     if(s.meta.rewardIds.includes(receipt)||s.meta.rewardIds.length>=2000)throw Error('이미 부화한 알이에요');
    }else{if(!canResowExpedition(s.roster,s.meta))throw Error('살아 있는 씨앗이나 부화할 알을 먼저 확인해 주세요');receipt=`resow:${idFactory()}`;if(s.meta.resowIds.length>=256)throw Error('기억 보관 한도에 도달했어요');}
    const instanceId=`born-${idFactory()}`;if(!recruitInstance(s.roster,{instanceId,speciesId}))throw Error('새 개체 보관 한도나 저장을 확인해 주세요');
    if(intent.type==='hatch'){s.meta.eggs=s.meta.eggs.filter(e=>e.eggId!==intent.eggId);s.meta.rewardIds.push(receipt);}else s.meta.resowIds.push(receipt);
    if(!s.roster.party.slice(0,5).some(Boolean)){const slots=[...s.roster.party];slots[0]=instanceId;if(!setParty(s.roster,slots))throw Error('새 씨앗 배치 오류');}
    message='새로운 Lv1 씨앗이 태어났어요 · 떠난 개체의 기억은 그대로 남아요';
   }else if(intent.type==='grow'){
    if(s.screen!=='home'||s.meta.growthCharges<1||!nurseryGrowthCandidates(s.roster).some(i=>i.instanceId===intent.instanceId)||s.meta.growthReceipts.length>=1000)throw Error('온실에 남긴 살아 있는 씨앗과 성장 기회를 확인해 주세요');
    const receipt=`growth:${idFactory()}`;if(!grantInstanceXP(s.roster,intent.instanceId,NURSERY_GROWTH_XP,receipt))throw Error('온실 성장 기록 오류');
    if(s.meta.cores.chain>=10000)throw Error('생명전류 보관 한도에 도달했어요');s.meta.growthCharges--;s.meta.growthReceipts.push(receipt);s.meta.cores.chain++;message='온실의 씨앗이 자라며 연쇄 생명전류 1개가 남았어요';
   }else throw Error('알 수 없는 원정대 명령');
   recordScene(s,{trigger:'prologue'});return {ok:true,state:s,events:copy(newEvents),message};
  }catch(error){return {ok:false,reason:error.message};}
}
export function createExpeditionController({storage,owner,currentOwner=()=>owner,channel='review',idFactory=randomId,combatVersion=EXPEDITION_COMBAT_VERSION}={}){
 const store=createExpeditionSessionStore({storage,owner,currentOwner,channel});
 let current=null,raw=null,notice='',saveState='saved',paused=false,closed=false,events=[],snapshot=null,movesSinceSave=0;
 const loaded=store.load();
 if(!loaded.ok){saveState='error';notice=`저장 원본을 보존했어요 · ${loaded.reason}`;}
 else if(loaded.session){current=loaded.session;raw=loaded.raw;}
 else{
  const roster=createRoster({owner,channel});
  recordScene({roster},{trigger:'prologue'});
  INITIAL.forEach(law=>recruitInstance(roster,{instanceId:`seed-${idFactory()}`,speciesId:law}));
  setParty(roster,Object.keys(roster.instances).slice(0,8));
  const initial={version:2,revision:0,owner,channel,screen:'home',roster,route:null,battle:null,lastResult:null,meta:{cores:Object.fromEntries(Object.keys(LAW_DNA).map(k=>[k,0])),awakenMaterials:0,highRisk:[],returnCount:0,bossWins:0,committedRuns:[],...emptyExpeditionNursery()}};
  const saved=store.save(initial,null);if(saved.ok){current=saved.session;raw=saved.raw;}else{saveState='error';notice=`새 원정대 저장 실패 · ${saved.reason}`;}
 }
 function fail(reason){notice=reason;return {ok:false,reason,events:[],saveState};}
 function commit(next,newEvents=[],message=''){
  recordScene(next,{trigger:'prologue'});
  next.revision++;const saved=store.save(next,raw);
  if(!saved.ok){saveState='error';paused=true;return fail(`저장을 확인하지 못해 멈췄어요 · ${saved.reason}`);}
  current=saved.session;raw=saved.raw;snapshot=null;movesSinceSave=0;saveState='saved';events=copy(newEvents);notice=message;
  return {ok:true,events:copy(events),saveState};
 }
 function dispatch(intent){
  if(closed||!current)return fail('저장 데이터를 사용할 수 없어요');
  if(currentOwner()!==owner){paused=true;saveState='error';return fail('계정이 바뀌어 원정대를 멈췄어요');}
  if(intent?.type==='pause'){paused=!!intent.paused;if(paused)return commit(copy(current),[],'원정이 일시정지됐어요');notice='';return {ok:true,events:[],saveState};}
  if(paused||saveState==='error')return fail('저장과 계정을 확인한 뒤 다시 열어 주세요');
  if(intent?.type==='move'){
   if(current.screen!=='explore'||!Number.isFinite(intent.dx)||!Number.isFinite(intent.dt)||intent.dt<=0||intent.dt>.1)return fail('이동 입력 오류');
   const route={...current.route,position:Math.max(0,Math.min(18,current.route.position+Math.max(-1,Math.min(1,intent.dx))*4*intent.dt)),elapsedSeconds:Math.min(86400,current.route.elapsedSeconds+intent.dt)};
   current={...current,route};if(snapshot)snapshot=Object.freeze({...snapshot,route:freeze({...snapshot.route,position:route.position,elapsedSeconds:route.elapsedSeconds})});
   events=[];notice='';
   // Match the account controller's bounded movement batch. Critical actions,
   // pause and close still commit immediately. No storage work on idle frames,
   // no timer to survive unmount, and no review-to-account migration.
   if(++movesSinceSave>=32)return commit(copy(current));
   return {ok:true,events:[],saveState};
  }
  const projected=projectExpeditionRuntime(current,intent,{idFactory,combatVersion,directEvents:true});
  return projected.ok?commit(projected.state,projected.events,projected.message):fail(projected.reason);
 }
 return Object.freeze({state:()=>{if(!current)return {screen:'home',roster:null,route:null,battle:null,meta:null,lastResult:null,notice,saveState,events:[],paused:true,review:true};snapshot??=freeze(copy(current));return {...snapshot,notice,saveState,events:freeze(copy(events)),paused,review:true};},dispatch,isActive:()=>!closed&&!paused&&saveState==='saved'&&current?.screen!=='home'&&current?.screen!=='result',close(){if(!closed&&current&&currentOwner()===owner&&saveState!=='error')commit(copy(current));closed=true;paused=true;}});
}

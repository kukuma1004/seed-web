// 정원 · 플레이 방식이 식물의 모습으로 남는 개인 기록 공간.
// 식물은 그대로 장식이며, 오스틴 격파로만 아주 작은 영구 성장점이 남는다.
import {LAWS} from './laws.js';
import {ALL_FORMS,SECOND_FORMS} from './forms.js';

export const GARDEN_KEY='seed-garden-v1';
export const PLOTS=6,ACTIVE_SLOTS=3,MAX_ACTIVE_SLOTS=4,FRAGMENTS_PER_SEED=3,MAX_RECORDS=12,GUARDIAN='clocktower',FOUNDER='founder';
export const MASTERY_STEP=.001,MASTERY_STAT_CAP=30,MASTERY_TOTAL_CAP=100;
export const MASTERY=Object.freeze({
 power:{name:'공격력',desc:'모든 공격 피해'},
 move:{name:'이동 속도',desc:'씨앗 이동 속도'},
 critical:{name:'치명타',desc:'치명타 확률'},
 cooldown:{name:'순환',desc:'자동 공격·회피·궁극기 재사용'},
 maxHp:{name:'최대 생명력',desc:'출발 최대 생명력'}
});
export const MASTERY_KEYS=Object.freeze(Object.keys(MASTERY));
export const STAGES=['seed','sprout','mature','bloom'];
export const STAGE_NAMES=Object.freeze({seed:'심은 씨앗',sprout:'새싹',mature:'자란 풀',bloom:'개화'});
// 성장점은 던전을 다녀와야 쌓인다(기다리는 게임이 아니라 하는 게임).
export const STAGE_POINTS=Object.freeze({seed:0,sprout:1,mature:4,bloom:9});
export const BRANCHES=Object.freeze(['flower','tree','vine']);
export const BRANCH_KINDS=Object.freeze({
 flower:{label:'꽃',effect:'rush'},
 tree:{label:'나무',effect:'endure'},
 vine:{label:'덩굴',effect:'agile'}
});
export const PLAY_STYLES=Object.freeze({
 rush:{label:'맹공의 흔적',branch:'flower',hint:'빠르게 적을 몰아붙인 여정'},
 endure:{label:'끈기의 흔적',branch:'tree',hint:'깊이 나아가 끝까지 버틴 여정'},
 agile:{label:'민첩의 흔적',branch:'vine',hint:'회피를 자주 사용하며 움직인 여정'},
 balanced:{label:'고른 흔적',branch:'tree',hint:'한쪽에 치우치지 않은 여정'}
});
// 법칙마다 씨앗 하나. 분기 이름은 같은 법칙의 세 갈래다.
const LAW_SEEDS={
 reflect:{name:'메아리 씨앗',flower:'거울꽃',tree:'공명목',vine:'되울림덩굴'},
 split:{name:'쌍생 씨앗',flower:'파열초',tree:'쌍둥이나무',vine:'흩날림덩굴'},
 chain:{name:'번개 씨앗',flower:'번개꽃',tree:'뇌명목',vine:'전류덩굴'},
 orbit:{name:'맴돌이 씨앗',flower:'위성화',tree:'회전목',vine:'궤도덩굴'},
 pierce:{name:'꿰뚫는 씨앗',flower:'송곳꽃',tree:'관통목',vine:'창날덩굴'},
 burst:{name:'터지는 씨앗',flower:'폭죽꽃',tree:'화약목',vine:'불씨덩굴'},
 recall:{name:'돌아오는 씨앗',flower:'회귀꽃',tree:'귀향목',vine:'되감기덩굴'},
 gravity:{name:'끌어당기는 씨앗',flower:'중력꽃',tree:'심연목',vine:'소용돌이덩굴'},
 frost:{name:'서리 씨앗',flower:'서리꽃',tree:'한설목',vine:'고드름덩굴'},
 portal:{name:'별문 씨앗',flower:'차원꽃',tree:'성문목',vine:'틈새덩굴'}
};
export const SEEDS=Object.freeze(Object.fromEntries([
 ...Object.entries(LAW_SEEDS).filter(([law])=>Object.hasOwn(LAWS,law)).map(([law,v])=>[law,{id:law,law,name:v.name,branchNames:{flower:v.flower,tree:v.tree,vine:v.vine},
  hint:`${LAWS[law].name} 법칙을 가장 깊게 키운 여정에서 남는다`}]),
 [GUARDIAN,{id:GUARDIAN,law:null,name:'시계탑 씨앗',branchNames:{flower:'태엽꽃',tree:'시계탑목',vine:'초침덩굴'},
  hint:'정시파이터 오스틴을 쓰러뜨린 여정에서만 남는다'}],
 [FOUNDER,{id:FOUNDER,law:null,exclusive:true,name:'개척자의 별씨앗',branchNames:{flower:'첫빛꽃',tree:'개척자의 나무',vine:'별길덩굴'},
  hint:'SEED의 첫 비공개 테스트에 함께한 정원에만 남는다'}]
]));
export const SEED_IDS=Object.keys(SEEDS);

export function stageOf(growth){
 let stage='seed';
 for(const s of STAGES)if((growth||0)>=STAGE_POINTS[s])stage=s;
 return stage;
}
export function nextStagePoints(growth){
 for(const s of STAGES)if((growth||0)<STAGE_POINTS[s])return STAGE_POINTS[s]-(growth||0);
 return 0;
}
const validStyle=style=>Object.hasOwn(PLAY_STYLES,style)?style:'balanced';
const plant=p=>{
 if(!p||!SEEDS[p.seed])return null;
 const inferred=p.branch==='flower'?'rush':p.branch==='vine'?'agile':p.branch==='tree'?'endure':'balanced';
 const style=Object.hasOwn(PLAY_STYLES,p.style)?p.style:inferred;
 return {seed:p.seed,growth:Math.max(0,Math.min(999,Math.floor(p.growth)||0)),style,
  branch:BRANCHES.includes(p.branch)?p.branch:PLAY_STYLES[style].branch,active:false};
};
const emptyMastery=()=>Object.fromEntries(MASTERY_KEYS.map(id=>[id,0]));
export const emptyGarden=()=>({version:4,plots:Array(PLOTS).fill(null),seeds:{},traits:{},mastery:emptyMastery(),fragments:0,harvests:0,records:[]});
const runRecord=value=>{
 if(!value||typeof value!=='object')return null;
 const law=Object.hasOwn(LAWS,value.law)?value.law:null;
 const forms=Array.isArray(value.forms)?value.forms.map(entry=>typeof entry==='string'?{id:entry,level:1}:entry).filter(entry=>entry&&Object.hasOwn(ALL_FORMS,entry.id)&&Number.isFinite(entry.level)&&entry.level>0).slice(0,2).map(entry=>({id:entry.id,level:Math.min(999,Math.floor(entry.level))})):[];
 const score=Math.max(0,Math.min(1e9,Math.floor(value.score)||0)),kills=Math.max(0,Math.min(1e7,Math.floor(value.kills)||0)),journey=Math.max(1,Math.min(999,Math.floor(value.journey)||1));
 const elapsed=Math.max(0,Math.min(1e7,Number(value.elapsed)||0)),dashes=Math.max(0,Math.min(1e6,Math.floor(value.dashes)||0)),damageTaken=Math.max(0,Math.min(1e7,Number(value.damageTaken)||0));
 const boss=value.boss==='austin'?'austin':value.boss==='warden'?'warden':null;
 if(!law&&!forms.length&&!score&&!kills)return null;
 return {law,forms,score,kills,journey,boss,elapsed,dashes,damageTaken,style:validStyle(value.style),rare:forms.some(entry=>Object.hasOwn(SECOND_FORMS,entry.id))};
};
export function normalizeGarden(value){
 const g=emptyGarden();
 if(!value||typeof value!=='object')return g;
 if(Array.isArray(value.plots))for(let i=0;i<PLOTS;i++)g.plots[i]=plant(value.plots[i]);
 if(value.seeds&&typeof value.seeds==='object')for(const [id,n] of Object.entries(value.seeds))
  if(SEEDS[id]&&Number.isInteger(n)&&n>0)g.seeds[id]=Math.min(99,n);
 if(value.traits&&typeof value.traits==='object')for(const [id,styles] of Object.entries(value.traits))
  if(SEEDS[id]&&Array.isArray(styles))g.traits[id]=styles.slice(0,g.seeds[id]||0).map(validStyle);
 if(value.mastery&&typeof value.mastery==='object'){
  let remaining=MASTERY_TOTAL_CAP;
  for(const id of MASTERY_KEYS){const points=Math.max(0,Math.min(MASTERY_STAT_CAP,Math.floor(Number(value.mastery[id])||0),remaining));g.mastery[id]=points;remaining-=points;}
 }
 if(Number.isInteger(value.fragments)&&value.fragments>0)g.fragments=Math.min(999,value.fragments);
 if(Number.isInteger(value.harvests)&&value.harvests>0)g.harvests=Math.min(1e6,value.harvests);
 if(Array.isArray(value.records))g.records=value.records.map(runRecord).filter(Boolean).slice(0,MAX_RECORDS);
 return g;
}
export function readGarden(storage){try{return normalizeGarden(JSON.parse(storage?.getItem(GARDEN_KEY)));}catch{return emptyGarden();}}
export function writeGarden(storage,garden){try{storage?.setItem(GARDEN_KEY,JSON.stringify(normalizeGarden(garden)));return true;}catch{return false;}}

// 오스틴 한 번 격파 = 아직 상한에 닿지 않은 능력 하나에 0.1%.
// 정수 포인트로 저장해서 장기간 플레이해도 0.1+0.1의 소수 오차가 쌓이지 않는다.
export function grantAustinMastery(garden,random=Math.random){
 const g=normalizeGarden(garden),total=MASTERY_KEYS.reduce((n,id)=>n+g.mastery[id],0);
 const open=MASTERY_KEYS.filter(id=>g.mastery[id]<MASTERY_STAT_CAP);
 if(total>=MASTERY_TOTAL_CAP||!open.length)return {garden:g,granted:false,id:null,points:0};
 const roll=Math.max(0,Math.min(.999999,Number(random?.())||0)),id=open[Math.floor(roll*open.length)];
 g.mastery[id]++;return {garden:g,granted:true,id,points:g.mastery[id]};
}
export function gardenMastery(garden){
 const points=normalizeGarden(garden).mastery,rate=id=>points[id]*MASTERY_STEP;
 return Object.freeze({points:Object.freeze({...points}),power:1+rate('power'),move:1+rate('move'),critical:rate('critical'),cooldownRate:1+rate('cooldown'),maxHp:100*(1+rate('maxHp')),total:MASTERY_KEYS.reduce((n,id)=>n+points[id],0)});
}
export function masteryLine(result){
 if(!result?.granted||!MASTERY[result.id])return '정원 성장이 최대치에 도달했습니다';
 return `정원 성장 · ${MASTERY[result.id].name} +0.1% (현재 ${(result.points/10).toFixed(1)}%)`;
}

// 어떤 씨앗이 남는가: 가장 깊게 키운 법칙이 결정한다. 오스틴을 이기면 시계탑 씨앗이 함께 남는다.
export function dominantLaw(levels={}){
 let best=null,bestLevel=0;
 for(const [id,level] of Object.entries(levels)){
  if(!SEEDS[id]||!Number.isFinite(level))continue;
  if(level>bestLevel){best=id;bestLevel=level;}
 }
 return best;
}
export function playStyleFromRun({kills=0,elapsed=0,dashes=0,damageTaken=0,wardens=0,austins=0}={}){
 const minutes=Math.max(.5,(Number(elapsed)||0)/60),dashRate=(Number(dashes)||0)/minutes,killRate=(Number(kills)||0)/minutes;
 if(dashes>=8&&dashRate>=4)return 'agile';
 if(austins>0||wardens>=3)return 'endure';
 if(kills>=25&&killRate>=12)return 'rush';
 if(elapsed>=180&&damageTaken<=55)return 'endure';
 return 'balanced';
}
export function harvestFromRun({levels={},forms={},wardens=0,austins=0,score=0,kills=0,journey=1,elapsed=0,dashes=0,damageTaken=0}={}){
 const law=dominantLaw(levels),seeds=[];
 const style=playStyleFromRun({kills,elapsed,dashes,damageTaken,wardens,austins});
 if(austins>0)seeds.push(GUARDIAN);
 // 문지기를 한 번이라도 넘었으면 완성된 씨앗, 못 넘었으면 조각만 남는다.
 if(law&&wardens>0)seeds.push(law);
 const fragments=law&&wardens<=0?1:0;
 const strongest=Object.entries(forms).filter(([id,level])=>Object.hasOwn(ALL_FORMS,id)&&Number.isFinite(level)&&level>0).sort((a,b)=>b[1]-a[1]).slice(0,2).map(([id,level])=>({id,level}));
 const boss=austins>0?'austin':wardens>0?'warden':null;
 return {seeds,fragments,style,growth:1+Math.max(0,wardens)+Math.max(0,austins)*2,record:runRecord({law,forms:strongest,score,kills,journey,boss,elapsed,dashes,damageTaken,style})};
}
export function addHarvest(garden,harvest){
 const g=normalizeGarden(garden);
 for(const id of harvest?.seeds||[])if(SEEDS[id]){
  g.seeds[id]=Math.min(99,(g.seeds[id]||0)+1);
  (g.traits[id]||(g.traits[id]=[])).push(validStyle(harvest?.style||harvest?.record?.style));
  g.traits[id]=g.traits[id].slice(-g.seeds[id]);
 }
 g.fragments=Math.min(999,g.fragments+(harvest?.fragments||0));
 const record=runRecord(harvest?.record);if(record)g.records=[record,...g.records].slice(0,MAX_RECORDS);
 g.harvests++;
 return g;
}
export function gardenRecordLine(record){
 const r=runRecord(record);if(!r)return '';
 const build=r.forms.map(entry=>`${ALL_FORMS[entry.id].name} Lv.${entry.level}`).join(' + ')||(r.law?`${LAWS[r.law].name} 법칙`:'이름 없는 씨앗');
 const boss=r.boss==='austin'?'오스틴 격파':r.boss==='warden'?'문지기 돌파':'도전';
 return `여정 ${r.journey} · ${build} · ${boss} · ${r.kills} 처치 · ${PLAY_STYLES[r.style].label}${r.rare?' · 희귀 재융합':''}`;
}
// 조각 세 개로 원하는 씨앗 하나를 만든다(실패한 여정도 쌓이면 선택이 된다).
export function craftSeed(garden,seedId){
 const g=normalizeGarden(garden);
 if(!SEEDS[seedId]||seedId===GUARDIAN||SEEDS[seedId].exclusive||g.fragments<FRAGMENTS_PER_SEED)return {garden:g,ok:false};
 g.fragments-=FRAGMENTS_PER_SEED;g.seeds[seedId]=Math.min(99,(g.seeds[seedId]||0)+1);
 (g.traits[seedId]||(g.traits[seedId]=[])).push(g.records[0]?.style||'balanced');
 return {garden:g,ok:true};
}
export function plantSeed(garden,seedId,index){
 const g=normalizeGarden(garden);
 if(!SEEDS[seedId]||!(g.seeds[seedId]>0)||!(index>=0&&index<PLOTS)||g.plots[index])return {garden:g,ok:false};
 g.seeds[seedId]--;if(!g.seeds[seedId])delete g.seeds[seedId];
 const style=validStyle(g.traits[seedId]?.shift()||g.records.find(r=>r.law===seedId)?.style);
 if(!g.traits[seedId]?.length)delete g.traits[seedId];
 g.plots[index]={seed:seedId,growth:0,style,branch:PLAY_STYLES[style].branch,active:false};
 return {garden:g,ok:true};
}
export function uproot(garden,index){
 const g=normalizeGarden(garden);
 if(!g.plots[index])return {garden:g,ok:false};
 g.plots[index]=null;
 return {garden:g,ok:true};
}
export function chooseBranch(garden,index,branch){
 const g=normalizeGarden(garden),p=g.plots[index];
 if(!p||!BRANCHES.includes(branch))return {garden:g,ok:false};
 return {garden:g,ok:false,reason:'play-style'};
}
export function setActive(garden,index,on,slots=ACTIVE_SLOTS){
 const g=normalizeGarden(garden),p=g.plots[index];
 if(!p)return {garden:g,ok:false};
 p.active=false;
 return {garden:g,ok:false,reason:'cosmetic-only'};
}
export function growPlants(garden,points){
 const g=normalizeGarden(garden);
 if(!(points>0))return g;
 for(const p of g.plots)if(p)p.growth=Math.min(999,p.growth+points);
 return g;
}
export function activePlants(garden,limit=MAX_ACTIVE_SLOTS){
 return normalizeGarden(garden).plots.map((p,index)=>p?({...p,index}):null).filter(Boolean).slice(0,limit);
}
export function plantName(plant){
 const seed=SEEDS[plant?.seed];
 if(!seed)return '';
 return plant.branch?seed.branchNames[plant.branch]:seed.name;
}
export function plantSummary(plant){
 const seed=SEEDS[plant?.seed];
 if(!seed)return '';
 return branchSummary(plant.seed,plant.branch,stageOf(plant.growth));
}
// '으로/로'를 받침에 맞춰 고른다(ㄹ 받침은 '로').
export function wayJosa(word){
 const last=String(word||'').trim().at(-1)||'',code=last.charCodeAt(0);
 if(!(code>=0xac00&&code<=0xd7a3))return '으로';
 const tail=(code-0xac00)%28;
 return tail===0||tail===8?'로':'으로';
}
export function branchSummary(seedId,branch,stage='mature'){
 const seed=SEEDS[seedId];if(!seed||!BRANCHES.includes(branch))return '';
 const strong=stage==='bloom',kind=branch==='flower'?'맹공':branch==='vine'?'민첩':'끈기';
 const ending=strong?'선명하게 피어났다':'천천히 자라고 있다';
 return `${kind}로 플레이한 여정의 기억이 ${ending} · 식물 자체는 전투 능력에 영향을 주지 않는다`;
}
// 정원 한가운데에 묻힌 것. 여정을 다녀오고 식물을 피울수록 조금씩 드러난다(설계 18~19장).
export const CENTER=Object.freeze([
 {id:'unknown',name:'???',glyph:'◌',need:{},line:'정원 한가운데 무언가가 묻혀 있다.'},
 {id:'sleeping',name:'잠든 씨앗',glyph:'◍',need:{harvests:3},line:'아주 오래된 씨앗이 조용히 숨 쉬고 있다.'},
 {id:'roots',name:'뻗은 뿌리',glyph:'⑂',need:{harvests:8},line:'뿌리가 시계탑 쪽으로 뻗어 있다.'},
 {id:'oldtree',name:'고목',glyph:'⊥',need:{harvests:14,bloomed:1},line:'오스틴은 이 나무를 지키려고 시간을 재기 시작했다고 한다.'},
 {id:'greattree',name:'거대한 나무',glyph:'⨁',need:{harvests:20,bloomed:2},line:'여러 여정의 기억이 모여 정원의 중심 나무를 깨웠다.'},
 {id:'awake',name:'깨어난 나무',glyph:'✺',need:{harvests:28,bloomed:3,austin:true},line:'오스틴이 지켜 온 기억이 정원 한가운데에서 꽃을 피웠다.'}
]);
export function bloomedCount(garden){return normalizeGarden(garden).plots.filter(p=>p&&stageOf(p.growth)==='bloom').length;}
function centerMet(need,{harvests,bloomed,austin}){
 return (need.harvests||0)<=harvests&&(need.bloomed||0)<=bloomed&&(!need.austin||austin);
}
export function centerStage(garden,{austinDefeated=false}={}){
 const g=normalizeGarden(garden),state={harvests:g.harvests,bloomed:bloomedCount(g),austin:austinDefeated};
 let index=0;
 for(let i=0;i<CENTER.length;i++)if(centerMet(CENTER[i].need,state))index=i;
 return index;
}
export function centerInfo(garden,options={}){
 const g=normalizeGarden(garden),index=centerStage(g,options),here=CENTER[index],next=CENTER[index+1];
 const bloomed=bloomedCount(g);
 let hint='';
 if(next){
  const parts=[];
  if((next.need.harvests||0)>g.harvests)parts.push(`여정 ${next.need.harvests-g.harvests}번`);
  if((next.need.bloomed||0)>bloomed)parts.push(`개화한 식물 ${next.need.bloomed-bloomed}개`);
  if(next.need.austin&&!options.austinDefeated)parts.push('오스틴 격파');
  hint=parts.length?`다음까지 ${parts.join(' · ')}`:'곧 무언가 달라진다';
 }else hint='정원이 끝까지 깨어났다';
 return {index,...here,hint,bloomed,harvests:g.harvests};
}
// 예전 호출부 호환용. 정원에는 전투에 가져가는 활성 슬롯이 없다.
export function activeSlots(){return PLOTS;}
// 이전 저장과 호출부를 깨지 않기 위한 모양만 유지한다. 전투 효과는 항상 0이다.
export function gardenEffects(garden){
 const actives=activePlants(garden,PLOTS).map(p=>({index:p.index,name:plantName(p),stage:stageOf(p.growth),summary:branchSummary(p.seed,p.branch,stageOf(p.growth))}));
 return {lawWeights:{},formGuides:[],relicLaws:[],mutationLaws:[],freshBonus:0,guideCount:0,austinEvery:5,actives,slots:PLOTS,mastery:gardenMastery(garden)};
}
// 정원이 아무것도 바꾸지 않을 때와 같은 모양의 빈 효과.
export const NO_EFFECTS=Object.freeze(gardenEffects(emptyGarden()));

// 받침에 맞는 조사(을/를)를 고른다.
export function objectJosa(word){
 const last=String(word||'').trim().at(-1)||'';
 const code=last.charCodeAt(0);
 if(!(code>=0xac00&&code<=0xd7a3))return '을';
 return (code-0xac00)%28?'을':'를';
}
// 여정이 끝난 화면에 넣을 한 줄. 무엇이 남았는지 바로 보이게 한다.
export function harvestLine(harvest){
 if(!harvest)return '';
 const names=(harvest.seeds||[]).map(id=>SEEDS[id]?.name).filter(Boolean);
 const parts=[];
 if(names.length)parts.push(`${names.join(' · ')}${objectJosa(names.at(-1))} 얻었어요`);
 if(harvest.fragments)parts.push(`씨앗 조각 ${harvest.fragments}개를 주웠어요`);
 if(!parts.length)return '이번 여정에서는 씨앗이 남지 않았어요';
 return parts.join(' · ');
}

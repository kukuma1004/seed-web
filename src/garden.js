// 정원 · 런이 끝나면 씨앗이 남고, 심어 키우면 다음 런의 "가능성"이 바뀐다.
// 여기서는 규칙만 다룬다(화면은 garden-ui.js, 저장은 seed-garden-v1).
// 설계 원칙: 공격력 같은 직접 강화가 아니라 무엇이 나타나는가를 바꾼다.
import {LAWS} from './laws.js';

export const GARDEN_KEY='seed-garden-v1';
export const PLOTS=6,ACTIVE_SLOTS=3,MAX_ACTIVE_SLOTS=4,FRAGMENTS_PER_SEED=3,GUARDIAN='clocktower';
export const STAGES=['seed','sprout','mature','bloom'];
export const STAGE_NAMES=Object.freeze({seed:'심은 씨앗',sprout:'새싹',mature:'자란 풀',bloom:'개화'});
// 성장점은 던전을 다녀와야 쌓인다(기다리는 게임이 아니라 하는 게임).
export const STAGE_POINTS=Object.freeze({seed:0,sprout:1,mature:4,bloom:9});
export const BRANCHES=Object.freeze(['flower','tree','vine']);
export const BRANCH_KINDS=Object.freeze({
 flower:{label:'꽃',effect:'lawWeight'},
 tree:{label:'나무',effect:'formGuide'},
 vine:{label:'덩굴',effect:'relicBias'}
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
 ...Object.entries(LAW_SEEDS).map(([law,v])=>[law,{id:law,law,name:v.name,branchNames:{flower:v.flower,tree:v.tree,vine:v.vine},
  hint:`${LAWS[law].name} 법칙을 가장 깊게 키운 여정에서 남는다`}]),
 [GUARDIAN,{id:GUARDIAN,law:null,name:'시계탑 씨앗',branchNames:{flower:'태엽꽃',tree:'시계탑목',vine:'초침덩굴'},
  hint:'정시파이터 오스틴을 쓰러뜨린 여정에서만 남는다'}]
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
const plant=p=>p&&SEEDS[p.seed]?{seed:p.seed,growth:Math.max(0,Math.min(999,Math.floor(p.growth)||0)),
 branch:BRANCHES.includes(p.branch)?p.branch:null,active:p.active===true}:null;
export const emptyGarden=()=>({version:1,plots:Array(PLOTS).fill(null),seeds:{},fragments:0,harvests:0});
export function normalizeGarden(value){
 const g=emptyGarden();
 if(!value||typeof value!=='object')return g;
 if(Array.isArray(value.plots))for(let i=0;i<PLOTS;i++)g.plots[i]=plant(value.plots[i]);
 if(value.seeds&&typeof value.seeds==='object')for(const [id,n] of Object.entries(value.seeds))
  if(SEEDS[id]&&Number.isInteger(n)&&n>0)g.seeds[id]=Math.min(99,n);
 if(Number.isInteger(value.fragments)&&value.fragments>0)g.fragments=Math.min(999,value.fragments);
 if(Number.isInteger(value.harvests)&&value.harvests>0)g.harvests=Math.min(1e6,value.harvests);
 // 활성 식물은 자란 뒤 분기를 고른 것만, 그리고 정해진 칸 수까지만.
 let active=0;
 for(const p of g.plots){
  if(!p)continue;
  const ready=p.branch&&STAGES.indexOf(stageOf(p.growth))>=STAGES.indexOf('mature');
  if(p.active&&ready&&active<MAX_ACTIVE_SLOTS)active++;else p.active=false;
 }
 return g;
}
export function readGarden(storage){try{return normalizeGarden(JSON.parse(storage?.getItem(GARDEN_KEY)));}catch{return emptyGarden();}}
export function writeGarden(storage,garden){try{storage?.setItem(GARDEN_KEY,JSON.stringify(normalizeGarden(garden)));return true;}catch{return false;}}

// 어떤 씨앗이 남는가: 가장 깊게 키운 법칙이 결정한다. 오스틴을 이기면 시계탑 씨앗이 함께 남는다.
export function dominantLaw(levels={}){
 let best=null,bestLevel=0;
 for(const [id,level] of Object.entries(levels)){
  if(!SEEDS[id]||!Number.isFinite(level))continue;
  if(level>bestLevel){best=id;bestLevel=level;}
 }
 return best;
}
export function harvestFromRun({levels={},wardens=0,austins=0}={}){
 const law=dominantLaw(levels),seeds=[];
 if(austins>0)seeds.push(GUARDIAN);
 // 문지기를 한 번이라도 넘었으면 완성된 씨앗, 못 넘었으면 조각만 남는다.
 if(law&&wardens>0)seeds.push(law);
 const fragments=law&&wardens<=0?1:0;
 return {seeds,fragments,growth:1+Math.max(0,wardens)+Math.max(0,austins)*2};
}
export function addHarvest(garden,harvest){
 const g=normalizeGarden(garden);
 for(const id of harvest?.seeds||[])if(SEEDS[id])g.seeds[id]=Math.min(99,(g.seeds[id]||0)+1);
 g.fragments=Math.min(999,g.fragments+(harvest?.fragments||0));
 g.harvests++;
 return g;
}
// 조각 세 개로 원하는 씨앗 하나를 만든다(실패한 여정도 쌓이면 선택이 된다).
export function craftSeed(garden,seedId){
 const g=normalizeGarden(garden);
 if(!SEEDS[seedId]||seedId===GUARDIAN||g.fragments<FRAGMENTS_PER_SEED)return {garden:g,ok:false};
 g.fragments-=FRAGMENTS_PER_SEED;g.seeds[seedId]=Math.min(99,(g.seeds[seedId]||0)+1);
 return {garden:g,ok:true};
}
export function plantSeed(garden,seedId,index){
 const g=normalizeGarden(garden);
 if(!SEEDS[seedId]||!(g.seeds[seedId]>0)||!(index>=0&&index<PLOTS)||g.plots[index])return {garden:g,ok:false};
 g.seeds[seedId]--;if(!g.seeds[seedId])delete g.seeds[seedId];
 g.plots[index]={seed:seedId,growth:0,branch:null,active:false};
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
 if(!p||p.branch||!BRANCHES.includes(branch)||STAGES.indexOf(stageOf(p.growth))<STAGES.indexOf('mature'))return {garden:g,ok:false};
 p.branch=branch;
 return {garden:g,ok:true};
}
export function setActive(garden,index,on,slots=ACTIVE_SLOTS){
 const g=normalizeGarden(garden),p=g.plots[index];
 if(!p)return {garden:g,ok:false};
 if(!on){p.active=false;return {garden:g,ok:true};}
 const ready=p.branch&&STAGES.indexOf(stageOf(p.growth))>=STAGES.indexOf('mature');
 if(!ready||activePlants(g).length>=Math.min(MAX_ACTIVE_SLOTS,slots))return {garden:g,ok:false};
 p.active=true;
 return {garden:g,ok:true};
}
export function growPlants(garden,points){
 const g=normalizeGarden(garden);
 if(!(points>0))return g;
 for(const p of g.plots)if(p)p.growth=Math.min(999,p.growth+points);
 return g;
}
export function activePlants(garden,limit=MAX_ACTIVE_SLOTS){
 return normalizeGarden(garden).plots.map((p,index)=>({...p,index})).filter(p=>p.seed&&p.active).slice(0,limit);
}
export function plantName(plant){
 const seed=SEEDS[plant?.seed];
 if(!seed)return '';
 return plant.branch?seed.branchNames[plant.branch]:seed.name;
}
export function plantSummary(plant){
 const seed=SEEDS[plant?.seed];
 if(!seed)return '';
 if(!plant.branch)return STAGES.indexOf(stageOf(plant.growth))>=STAGES.indexOf('mature')?'갈래를 고를 수 있어요':`${STAGE_NAMES[stageOf(plant.growth)]} · 다음 단계까지 ${nextStagePoints(plant.growth)}`;
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
 const strong=stage==='bloom',lawName=seed.law?LAWS[seed.law].name:null;
 if(seed.id===GUARDIAN){
  if(branch==='flower')return `새 법칙 선택지가 ${strong?'두 번':'한 번'} 더 자주 열린다`;
  if(branch==='tree')return `여정을 시작할 때 조합 목표를 ${strong?'두 개':'한 개'} 알려 준다`;
  return `문지기 ${strong?4:5}번이면 오스틴이 나타난다`;
 }
 if(branch==='flower')return `${lawName} 법칙이 선택지에 ${strong?'훨씬':'더'} 자주 나온다`;
 if(branch==='tree')return `${lawName}${wayJosa(lawName)} 만드는 조합을 목표로 알려 준다`;
 return `${lawName} 유물이 ${strong?'가장 먼저':'더 자주'} 나온다`;
}
// 정원 한가운데에 묻힌 것. 여정을 다녀오고 식물을 피울수록 조금씩 드러난다(설계 18~19장).
export const CENTER=Object.freeze([
 {id:'unknown',name:'???',glyph:'◌',need:{},line:'정원 한가운데 무언가가 묻혀 있다.'},
 {id:'sleeping',name:'잠든 씨앗',glyph:'◍',need:{harvests:3},line:'아주 오래된 씨앗이 조용히 숨 쉬고 있다.'},
 {id:'roots',name:'뻗은 뿌리',glyph:'⑂',need:{harvests:8},line:'뿌리가 시계탑 쪽으로 뻗어 있다.'},
 {id:'oldtree',name:'고목',glyph:'⊥',need:{harvests:14,bloomed:1},line:'오스틴은 이 나무를 지키려고 시간을 재기 시작했다고 한다.'},
 {id:'greattree',name:'거대한 나무',glyph:'⨁',need:{harvests:20,bloomed:2},line:'나무가 깨어나 정원을 넓혔다. 데려갈 수 있는 식물이 한 칸 늘었다.',slots:1},
 {id:'awake',name:'깨어난 나무',glyph:'✺',need:{harvests:28,bloomed:3,austin:true},line:'오스틴이 기다린 것은 이 순간이었다. 시계탑 너머에 또 다른 세계가 있다.',slots:1}
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
// 거대한 나무가 자라면 데려갈 수 있는 칸이 늘어난다.
export function activeSlots(garden,options={}){
 let slots=ACTIVE_SLOTS;
 for(let i=0;i<=centerStage(garden,options);i++)slots+=CENTER[i].slots||0;
 return Math.min(MAX_ACTIVE_SLOTS,slots);
}
// 다음 런에 넘길 효과. 힘을 더하지 않고 무엇이 나타날지를 바꾼다.
export function gardenEffects(garden,slots=ACTIVE_SLOTS){
 const effects={lawWeights:{},formGuides:[],relicLaws:[],mutationLaws:[],freshBonus:0,guideCount:0,austinEvery:5,actives:[],slots};
 for(const p of activePlants(garden,slots)){
  const seed=SEEDS[p.seed],stage=stageOf(p.growth),strong=stage==='bloom';
  effects.actives.push({index:p.index,name:plantName(p),stage,summary:branchSummary(p.seed,p.branch,stage)});
  if(seed.id===GUARDIAN){
   if(p.branch==='flower')effects.freshBonus+=strong?2:1;
   else if(p.branch==='tree')effects.guideCount+=strong?2:1;
   else effects.austinEvery=Math.min(effects.austinEvery,strong?4:5);
   continue;
  }
  if(p.branch==='flower'){
   effects.lawWeights[seed.law]=(effects.lawWeights[seed.law]||1)+(strong?4:2);
   // 꽃이 자란 법칙은 여정 중에 변이 선택지가 열린다(mutations.js).
   if(!effects.mutationLaws.includes(seed.law))effects.mutationLaws.push(seed.law);
  }
  else if(p.branch==='tree'){if(!effects.formGuides.includes(seed.law))effects.formGuides.push(seed.law);}
  else if(!effects.relicLaws.includes(seed.law))effects.relicLaws.push(seed.law);
 }
 return effects;
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

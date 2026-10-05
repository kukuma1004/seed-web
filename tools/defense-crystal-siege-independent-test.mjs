import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import * as rules from '../src/seed-defense-rules.js';
import * as siege from '../src/defense-crystal-siege.js';
import {createDefenseCombat} from '../src/seed-defense-combat.js';
import {defenseRankEntry,defenseExpansionRankProgress} from '../src/defense-ranking.js';
import {createDefenseAccountStore,defenseAccountKey} from '../src/defense-account-save.js';
import {readDefensePreparation,defensePreparationKey} from '../src/defense-save-route.js';
const copy=x=>JSON.parse(JSON.stringify(x)),passed=[],measurements=[];
const started=performance.now(),sourceHashes=Object.fromEntries(['defense-crystal-siege.js','defense-siege-review-fixture.json','seed-defense-rules.js','seed-defense-view.js','seed-defense.css','defense-ranking.js'].map(file=>[file,createHash('sha256').update(readFileSync(new URL('../src/'+file,import.meta.url))).digest('hex')]));
const group=(name,fn)=>{fn();passed.push(name);console.log('PASS',name);};
const owner='owner-A',view=readFileSync(new URL('../src/seed-defense-view.js',import.meta.url),'utf8');
const memory=()=>{const map=new Map();return{map,getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};};

// The unchanged authored course strategy uses only original economic actions.
function prepare(s){
 for(let round=0;round<30;round++){
  for(let pad=0;pad<16;pad++)rules.plantDefense(s,pad);
  let best=null;for(const a of s.towers)for(const b of s.towers){if(a===b)continue;const r=rules.defenseMergeResult(s,a.id,b.id);if(!r.ok)continue;const score=(r.promote?100:0)+r.tier*10+(r.gained||0)*5+b.level-a.level;if(!best||score>best.score)best={a,b,score};}
  if(best){assert(rules.mergeDefense(s,best.a.id,best.b.id));continue;}
  const lonely=s.towers.find(t=>(t.tier||1)===1&&!t.merit&&!s.towers.some(o=>o!==t&&o.line===t.line&&(o.tier||1)===1));
  if(lonely&&s.currency>=60&&rules.rerollDefense(s,lonely.id))continue;break;
 }
 for(const t of [...s.towers].sort((a,b)=>(b.tier||1)-(a.tier||1)||a.level-b.level))rules.upgradeDefense(s,t.id);
}

function originalEarnedFixture(){
 const s=rules.createDefense(2,{actCount:5}),combat=createDefenseCombat(s);let ticks=0;
 try{while(s.phase!=='lost'&&(s.wave<48||s.phase==='wave')){
  assert(++ticks<65000);if(s.phase!=='wave'){combat.reset();prepare(s);assert(rules.startDefenseWave(s));}
  rules.stepDefense(s,.1,combat);for(const t of s.towers)if(t.ultimateCharge>=30)combat.surge(t.id);
  assert(s.shots.length<=180&&s.enemies.length<=120&&s.effects.length<=100);
 }assert.equal(s.phase,'build');assert.equal(s.wave,48);assert.equal(s.migratedWaves,0);assert(!s.siegeReview);for(const id of ['austin','alwaysbeginner','tempestcarrier','crosswindKeeper'])assert.equal(s.bossWins[id],1);assert.equal(s.bossWins.crystalGardener,0);const raw=rules.checkpointDefense(s);assert(raw&&rules.restoreDefense(raw));return raw;
 }finally{combat.dispose();}
}
if(process.argv.includes('--generate-fixture')){
 const fixture=originalEarnedFixture();writeFileSync(new URL('../src/defense-siege-review-fixture.json',import.meta.url),JSON.stringify(fixture,null,2)+'\n');console.log('Generated original authored48-wave Node fixture',JSON.stringify({wave:fixture.wave,hp:fixture.coreHp,kills:fixture.kills,currency:fixture.currency,towers:fixture.towers.length,bossWins:fixture.bossWins}));process.exit(0);
}

const authoredFixture=JSON.parse(readFileSync(new URL('../src/defense-siege-review-fixture.json',import.meta.url),'utf8'));
group('Supplied Node-earned inspection fixture exactly reproduces original48-wave combat; never human account progress',()=>{
 const replay=originalEarnedFixture();assert.deepEqual({...replay,runId:'normalized'},{...authoredFixture,runId:'normalized'});assert(!authoredFixture.siegeReview&&authoredFixture.migratedWaves===0);assert(rules.restoreDefense(authoredFixture));
 const s=siege.createDefenseSiegeInspection();assert.equal(s.wave,48);assert.equal(s.migratedWaves,0);assert.equal(s.kills,1956);assert.equal(s.currency,231);assert.equal(s.towers.length,13);assert(s.towers.some(t=>t.formId));assert.equal(rules.defenseSeedCap(s),16);assert(s.inspectionPreview&&s.siegeReview);
 const before=s.currency;for(let i=0;i<6;i++){assert(siege.harvestDefenseSiege(s,i));assert(!siege.harvestDefenseSiege(s,i));}assert.equal(s.currency,before+48);
 const money=s.currency,count=s.towers.length,pad=s.pads.findIndex((_p,i)=>!s.towers.some(t=>t.pad===i));assert(rules.plantDefense(s,pad));assert.equal(s.currency,money-rules.DEFENSE.plantCost);assert.equal(s.towers.length,count+1);assert(s.towers.at(-1).level===1&&s.towers.at(-1).formId===null,'Collected sunlight buys a normal randomized seed, not a supplied evolved turret');
 assert.equal(rules.checkpointDefense(s),null);assert.equal(siege.checkpointDefenseSiege({...s,phase:'wave'},owner),null);
});

group('Ledger restores currency and spent seed; same-group harvest cannot repeat after reload',()=>{
 let s=siege.createDefenseSiegeInspection();const pad=s.pads.findIndex((_p,i)=>!s.towers.some(t=>t.pad===i)),expected=s.currency+16-rules.DEFENSE.plantCost;assert(siege.harvestDefenseSiege(s,1));assert(siege.harvestDefenseSiege(s,3));assert(rules.plantDefense(s,pad));const raw=siege.checkpointDefenseSiege(s,owner);assert(raw);assert.equal(raw.state.currency,expected);assert(raw.state.siegeReview);const keep=copy(raw);
 for(let n=0;n<4;n++){s=siege.restoreDefenseSiege(JSON.stringify(raw),owner);assert(s);assert.equal(s.currency,expected);assert(s.towers.some(t=>t.pad===pad&&t.level===1));assert(!siege.harvestDefenseSiege(s,1));assert(!siege.harvestDefenseSiege(s,3));assert.equal(s.currency,expected);assert.deepEqual(siege.checkpointDefenseSiege(s,owner),keep);}
 for(const id of [-1,6,.5,NaN,'1'])assert(!siege.harvestDefenseSiege(s,id));assert.equal(s.currency,expected);
});

group('Owner, marker and structural mutations are rejected without mutating original bytes',()=>{
 const raw=siege.checkpointDefenseSiege(siege.createDefenseSiegeInspection(),owner),bytes=JSON.stringify(raw);
 for(const uid of ['',null,undefined,7,'owner-B'])assert.equal(siege.restoreDefenseSiege(raw,uid),null);
 for(const mutate of [r=>delete r.owner,r=>r.owner='',r=>r.kind='normal',r=>r.version=2,r=>r.extra=1,r=>delete r.state.siegeReview,r=>r.state.siegeReview=false,r=>r.state.phase='wave',r=>r.state.currency=-1,r=>r.state.towers[0].level=6,r=>r.state.actCount=3,r=>r.gather.mask=64,r=>r.gather.mask=-1,r=>r.gather.mask=.5,r=>r.gather.lap++,r=>r.gather.group++,r=>r.gather.extra=1,r=>r.gather=null]){const r=copy(raw);mutate(r);assert.equal(siege.restoreDefenseSiege(r,owner),null);}
 assert.equal(JSON.stringify(raw),bytes);assert.equal(siege.restoreDefenseSiege({...raw,owner:undefined},undefined),null);
});

group('Normal preparations/account saves/rankings cannot promote envelope or inner marker',()=>{
 const s=siege.createDefenseSiegeInspection(),raw=siege.checkpointDefenseSiege(s,owner),storage=memory(),key=defensePreparationKey(owner,5);
 assert.equal(rules.restoreDefense(raw),null);assert.equal(rules.restoreDefense(raw.state),null);storage.setItem(key,JSON.stringify(raw.state));assert.equal(readDefensePreparation(storage,key,{owner,actCount:5}),null);storage.removeItem(key);
 const account=createDefenseAccountStore({storage,owner,circuit:5,currentOwner:()=>owner,lease:{ok:true,key:defenseAccountKey(owner,5),active:()=>true}});assert.deepEqual(account.write(null,s),{ok:false,reason:'phase'});assert.equal(storage.getItem(account.key),null);
 assert.equal(defenseRankEntry({...s,phase:'lost'},{uid:owner,name:'테스터'}),null);assert.equal(defenseExpansionRankProgress(s).eligible,false);
 assert.notEqual(siege.defenseSiegeReviewKey(owner),defensePreparationKey(owner,5));assert.notEqual(siege.defenseSiegeReviewKey('a/b'),siege.defenseSiegeReviewKey('a%2Fb'));
});

group('Actual local view save/clear writes only its isolated review key',()=>{
 const start=view.indexOf(' function save(){'),end=view.indexOf('\n function sound(',start);assert(start>=0&&end>start);const storage=memory(),normalKey=defensePreparationKey(owner,5),key=siege.defenseSiegeReviewKey(owner);storage.setItem(normalKey,'KEEP-ORIGINAL');
 const ctx={state:siege.createDefenseSiegeInspection(),owner,localSiege:true,siegeKey:key,storage,checkpointDefenseSiege:siege.checkpointDefenseSiege,saveNote:'',preparation:{write(){assert.fail('review must not call account write');},end(){assert.fail('review must not terminate account save');}},isolated:()=>true};vm.createContext(ctx);vm.runInContext(view.slice(start,end),ctx);
 assert(siege.harvestDefenseSiege(ctx.state,2));ctx.save();const stored=storage.getItem(key);assert(stored);assert(siege.restoreDefenseSiege(stored,owner));assert.equal(storage.getItem(normalKey),'KEEP-ORIGINAL');ctx.state.phase='wave';ctx.save();assert.equal(storage.getItem(key),stored,'Combat cannot overwrite last preparation');ctx.clearSave();assert.equal(storage.getItem(key),null);assert.equal(storage.getItem(normalKey),'KEEP-ORIGINAL');
 // Execute the actual manual-start handler with an observable first call.
 const marker="$('#td-start').onclick=",a=view.indexOf(marker),b=view.indexOf('\n',a);const handler=view.slice(a+marker.length,b).replace(/;\s*$/,'');assert(handler.includes("siegeActive()&&state.phase==='build')save()"));let saved=false;
 const startCtx={paused:false,localSiege:true,state:siege.createDefenseSiegeInspection(),save(){saved=true;},startDefenseWave(s){assert(saved,'Preparation must be saved before manual start');return rules.startDefenseWave(s);},closeSelection(){},hint(){},sound(){},updateUI(){},dirty:false,moving:false,uiKey:''};vm.createContext(startCtx);startCtx.publicSiegeAllowed=()=>false;vm.runInContext(view.match(/const siegeActive=([^;]+);/)[0],startCtx);vm.runInContext('('+handler+')()',startCtx);assert.equal(startCtx.state.phase,'wave');
});

group('Actual fresh viewer skips stored checkpoint; explicit resume alone restores the owner ledger',()=>{
 const a=view.indexOf(' function read(){'),b=view.indexOf('\n',a);assert(a>=0&&b>a);const raw=siege.checkpointDefenseSiege(siege.createDefenseSiegeInspection(),owner),storage=memory(),key=siege.defenseSiegeReviewKey(owner);storage.setItem(key,JSON.stringify(raw));
 const ctx={localSiege:true,siegeReview:'fresh',owner,siegeKey:key,restoreDefenseSiege:siege.restoreDefenseSiege,storage:{getItem(){assert.fail('Fresh demonstration must skip old saved checkpoint');}}};vm.createContext(ctx);vm.runInContext(view.slice(a,b),ctx);assert.equal(ctx.read(),null);
 ctx.siegeReview='resume';ctx.storage=storage;const resumed=ctx.read();assert(resumed&&resumed.siegeReview);assert.deepEqual(siege.checkpointDefenseSiege(resumed,owner),raw);assert.equal(storage.getItem(key),JSON.stringify(raw));ctx.owner='owner-B';assert.equal(ctx.read(),null);
 assert.equal(siege.DEFENSE_SIEGE_NODES[4].x,94);assert.equal(siege.DEFENSE_SIEGE_NODES[4].y,6,'Fifth crystal moved away from bottom-center quick start; actual pixels belong to browser QA');
});

group('Actual resize/position seam keeps48×60px crystals in landscape/portrait bounds and off bottom note band',()=>{
 const a=view.indexOf(' function positionSiegeNodes(){'),b=view.indexOf('\n function placeButtons(',a);assert(a>=0&&b>a);const css=readFileSync(new URL('../src/seed-defense.css',import.meta.url),'utf8'),style=css.match(/#seed-defense \.td-siege-crystal\{([^}]+)\}/)?.[1];assert(style);const bw=Number(style.match(/(?:^|;)width:(\d+)px/)?.[1]),bh=Number(style.match(/(?:^|;)height:(\d+)px/)?.[1]);assert(bw>=44&&bh>=44);
 for(const [w,h] of [[1280,720],[844,390],[390,844],[390,772]]){
  const nodes=siege.DEFENSE_SIEGE_NODES.map(n=>({dataset:{node:String(n.id)},style:{}})),ctx={state:siege.createDefenseSiegeInspection(),resourceRoot:{children:nodes},DEFENSE_SIEGE_NODES:siege.DEFENSE_SIEGE_NODES,defenseWaveInfo:rules.defenseWaveInfo,$:()=>({getBoundingClientRect:()=>({width:w,height:h})}),window:{devicePixelRatio:3},canvas:{},back:{},ctx:{setTransform(){}},bg:{setTransform(){}},width:1,height:1,scale:1,ox:0,oy:0,dirty:false,placeButtons(){}};
  vm.createContext(ctx);vm.runInContext(view.slice(a,b),ctx);ctx.resize();assert.equal(ctx.canvas.width,Math.round(w*1.5));assert.equal(ctx.canvas.height,Math.round(h*1.5));
  const positions=[];for(const n of nodes){const x=Number.parseFloat(n.style.left),y=Number.parseFloat(n.style.top);assert(Number.isFinite(x)&&Number.isFinite(y));assert(x-bw/2>=0&&x+bw/2<=w,'Full crystal hit target remains horizontally visible');assert(y-bh/2>=0&&y+bh/2<=h-42,'Full crystal and its +8 label clear bottom42px note band');positions.push([+x.toFixed(2),+y.toFixed(2)]);}measurements.push({boardSize:[w,h],button:[bw,bh],positions});
 }
});

group('Actual local pause/book timer retains20 seconds, harvest stays locked outside preparation',()=>{
 const a=view.indexOf('if(waiting){autoWait-='),b=view.indexOf('if(!paused&&!confirming)',a);assert(a>=0&&b>a);const timer=view.slice(a,b),ctx={waiting:false,autoWait:20,inspecting:false,localSiege:true,state:siege.createDefenseSiegeInspection(),prepareDefenseSiege:siege.prepareDefenseSiege,DEFENSE_AUTO_START:3,DEFENSE_AUTO_INSPECT:8,raw:.05,$:()=>({click(){assert.fail('Paused/book preparation cannot auto start');}})};vm.createContext(ctx);ctx.publicSiegeAllowed=()=>false;vm.runInContext(view.match(/const siegeActive=([^;]+);/)[0],ctx);for(let n=0;n<40;n++)vm.runInContext(timer,ctx);assert.equal(ctx.autoWait,20);ctx.waiting=true;vm.runInContext(timer,ctx);assert.equal(ctx.autoWait,19.95);
 assert(rules.startDefenseWave(ctx.state));assert(!siege.harvestDefenseSiege(ctx.state,0));assert.equal(siege.prepareDefenseSiege(ctx.state),null);assert.equal(siege.checkpointDefenseSiege(ctx.state,owner),null);
 const plain=rules.createDefense(2);assert.equal(siege.enableDefenseSiegeReview(plain),false);assert.equal(siege.prepareDefenseSiege(plain),null);assert(!siege.harvestDefenseSiege(plain,0));
});

group('Actual mount gate requires localhost, inspect, isolated mode, five acts and explicit review opt-in',()=>{
 const a=view.indexOf('const localSiege=Boolean('),b=view.indexOf(',siegeKey=',a);assert(a>=0&&b>a);const gate=view.slice(a,b)+'; localSiege';
 for(const [host,search,isolate,acts,review,expected] of [['127.0.0.1','?inspect=1',true,5,true,true],['localhost','?inspect=1',true,5,true,true],['example.org','?inspect=1',true,5,true,false],['127.0.0.1','',true,5,true,false],['127.0.0.1','?inspect=1',false,5,true,false],['127.0.0.1','?inspect=1',true,3,true,false],['127.0.0.1','?inspect=1',true,5,false,false]]){
  const ctx={siegeReview:review,actCount:acts,location:{hostname:host,search},URLSearchParams,isolated:()=>isolate};assert.equal(vm.runInNewContext(gate,ctx),expected);
 }
 const marker='for(const b of resourceRoot.children)b.onclick=',from=view.indexOf(marker),to=view.indexOf('\n',from),tap=view.slice(from+marker.length,to).replace(/;\s*$/,'');assert(from>=0&&to>from);
 const s=siege.createDefenseSiegeInspection(),ctx={state:s,b:{dataset:{node:'0'}},paused:true,bookOpen:false,confirming:false,harvestDefenseSiege:siege.harvestDefenseSiege,sound(){},hint(){},save(){},autoWait:20,uiKey:'',updateUI(){},localSiege:true,publicSiegeAllowed:()=>false};vm.createContext(ctx);vm.runInContext(view.match(/const siegeActive=([^;]+);/)[0],ctx);
 const before=s.currency;for(const blocked of ['paused','bookOpen','confirming']){ctx.paused=ctx.bookOpen=ctx.confirming=false;ctx[blocked]=true;vm.runInContext('('+tap+')()',ctx);assert.equal(s.currency,before);}ctx.paused=ctx.bookOpen=ctx.confirming=false;vm.runInContext('('+tap+')()',ctx);assert.equal(s.currency,before+8);vm.runInContext('('+tap+')()',ctx);assert.equal(s.currency,before+8);
});

group('Supplied earned fixture actually clears49th wave with original attacks; next same-group preparation retains harvest mask',()=>{
 const s=siege.createDefenseSiegeInspection();for(let i=0;i<6;i++)assert(siege.harvestDefenseSiege(s,i));const kills=s.kills,core=s.coreHp,c=createDefenseCombat(s);let ticks=0;
 try{assert(rules.startDefenseWave(s));while(s.phase==='wave'){assert(++ticks<4000);rules.stepDefense(s,.1,c);for(const t of s.towers)if(t.ultimateCharge>=30)c.surge(t.id);assert(s.enemies.length<=120&&s.shots.length<=180);}assert.equal(s.phase,'build');assert.equal(s.wave,49);assert.equal(s.kills-kills,44);assert.equal(s.coreHp,core);assert.equal(siege.prepareDefenseSiege(s).mask,63);assert(!siege.harvestDefenseSiege(s,0));assert(siege.restoreDefenseSiege(siege.checkpointDefenseSiege(s,owner),owner));measurements.push({inspectionFixture:true,wave:s.wave,actualWaveKills:s.kills-kills,hp:s.coreHp,ticks});
 }finally{c.dispose();}
});

function authoredReview(reload){
 let s=rules.createDefense(2,{actCount:5});assert(siege.enableDefenseSiegeReview(s));let combat=createDefenseCombat(s),ticks=0,peakShots=0,peakLive=0,gathered=0,spends=0;const groups=[],routes=[];
 try{while(s.phase!=='lost'&&(s.wave<61||s.phase==='wave')){
  assert(++ticks<65000,'Bounded actual authored course must not stall');
  if(s.phase!=='wave'){
   combat.reset();if(reload){const raw=siege.checkpointDefenseSiege(s,owner);assert(raw);combat.dispose();s=siege.restoreDefenseSiege(JSON.stringify(raw),owner);assert(s);combat=createDefenseCombat(s);}
   const ledger=siege.prepareDefenseSiege(s);if(ledger){let receipt=0;for(let id=0;id<6;id++){const money=s.currency;if(siege.harvestDefenseSiege(s,id)){assert.equal(s.currency,money+8);receipt+=8;}else assert.equal(s.currency,money);assert(!siege.harvestDefenseSiege(s,id));}if(receipt){groups.push([s.wave,ledger.lap,ledger.group,receipt]);gathered+=receipt;}}
   const before=s.currency;prepare(s);assert(s.currency<=before);spends+=before-s.currency;assert(rules.startDefenseWave(s));if((s.wave-1)%12===0){const w=rules.defenseWaveInfo(s.wave,s);routes.push([w.act,w.lap]);}
  }
  rules.stepDefense(s,.1,combat);for(const t of s.towers)if(t.ultimateCharge>=30)combat.surge(t.id);peakShots=Math.max(peakShots,s.shots.length);peakLive=Math.max(peakLive,s.enemies.length);assert(s.shots.length<=180&&s.enemies.length<=120&&s.effects.length<=100);
 }return{reload,wave:s.wave,phase:s.phase,hp:s.coreHp,kills:s.kills,currency:s.currency,rng:s.rng,time:s.time,bossWins:s.bossWins,groups,gathered,spends,routes,peakShots,peakLive};
 }finally{combat.dispose();}
}
group('Earned original combat/economy reaches Act5 gathering and5→1; every-wave review reload agrees',()=>{
 const live=authoredReview(false),resumed=authoredReview(true);for(const key of ['wave','phase','hp','kills','currency','rng','time','bossWins','groups','gathered','spends','routes'])assert.deepEqual(resumed[key],live[key],key);assert(live.wave>=61&&live.phase!=='lost');assert.deepEqual(live.groups,[[48,0,0,48],[51,0,1,48],[54,0,2,48],[57,0,3,48]]);assert.equal(live.gathered,192);assert(live.spends>live.gathered&&live.kills>0);assert.deepEqual(live.routes,[[0,0],[1,0],[2,0],[3,0],[4,0],[0,1]]);for(const id of ['austin','alwaysbeginner','tempestcarrier','crosswindKeeper','crystalGardener'])assert.equal(live.bossWins[id],1);measurements.push(live,resumed);
});
console.log(JSON.stringify({passed,measurements,sourceHashes,durationSeconds:+((performance.now()-started)/1000).toFixed(3)},null,2));
console.log('Actual Node original authored combat/economy and view-source VM boundaries. No browser pixels, touch/device/battery, account/server or public promotion evidence. Inspection supplies the independently Node-earned48-wave checkpoint; never human account progress. Local save validation is structural; unsigned storage is not cryptographic tamper-proof.');

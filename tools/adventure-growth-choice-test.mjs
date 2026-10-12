import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {adventureGrowthPreview,adventureGrowthPath} from '../src/adventure-growth-preview.js';
import {createAdventure,startAdventure,chooseAdventure,adventureOffers,adventureFormHit,stepAdventure,adventureBossReceipt,adventureEvolutions,adventureShopStatus,buyAdventure,ADVENTURE_BOSS_HEAL,ADVENTURE_FORMS} from '../src/seed-adventure-rules.js';
const begin=()=>{const s=createAdventure(11);startAdventure(s,'slash','recall');return s;};
{
 const s=begin();s.phase='choice';s.choiceKind='law';s.offerLaws=['pierce'];const before=JSON.stringify(s),preview=adventureGrowthPreview(s,'law','pierce');assert.ok(preview.startsWith('바로 융합'));assert.equal(JSON.stringify(s),before);
 chooseAdventure(s,'law','pierce');assert.ok(preview.endsWith(ADVENTURE_FORMS[s.formId].name),'immediate fusion preview equals the actual learned recipe');
}
{
 const s=begin();s.ranks.recall=2;s.phase='choice';s.choiceKind='law';s.offerLaws=[];
 const preview=adventureGrowthPreview(s,'upgrade','recall');assert.ok(preview.startsWith('단독 진화 준비'));
 assert.ok(chooseAdventure(s,'upgrade','recall'));assert.equal(s.formId,null,'prepared evolution is a separate choice');assert.ok(preview.includes(adventureEvolutions(s)[0].name));
 s.formId='rewind';s.phase='choice';s.choiceKind='law';s.offerLaws=['pierce'];assert.ok(adventureGrowthPreview(s,'law','pierce').startsWith('단독 진화 유지'));chooseAdventure(s,'law','pierce');assert.equal(s.formId,'rewind');
 s.ranks.pierce=2;s.phase='choice';s.choiceKind='law';const twin=adventureGrowthPreview(s,'upgrade','pierce');assert.ok(twin.startsWith('쌍둥이 각성 준비'));chooseAdventure(s,'upgrade','pierce');assert.ok(twin.includes(adventureEvolutions(s)[0].name));
}
{
 const s=begin();s.phase='shop';s.laws=['recall','pierce'];s.ranks={recall:1,pierce:2};s.coins=100;s.shop=[{id:'upgrade',price:70,sold:false}];
 const seed=s.seed;assert.deepEqual(adventureShopStatus(s,0).upgrades,['recall','pierce']);assert.equal(buyAdventure(s,0,'frost'),false);assert.equal(s.coins,100);assert.equal(s.seed,seed);
 assert.equal(buyAdventure(s,0,'pierce'),true);assert.deepEqual(s.ranks,{recall:1,pierce:3});assert.equal(s.coins,30);assert.equal(s.seed,seed,'explicit target does not draw a random law');assert.equal(s.shop[0].sold,true);assert.equal(buyAdventure(s,0,'recall'),false);
}
{
 const s=begin();s.phase='shop';s.coins=200;s.potions=3;s.buffs.guard=1;s.ranks.recall=3;s.shop=['potion','guard','upgrade'].map(id=>({id,price:25,sold:false}));
 for(let i=0;i<3;i++){assert.equal(adventureShopStatus(s,i).available,false);assert.ok(adventureShopStatus(s,i).reason);assert.equal(buyAdventure(s,i),false);}
 assert.equal(s.coins,200,'full/redundant purchases never spend money');
}
{
 const s=begin();s.room=3;s.phase='choice';s.choiceKind='boss';s.offerLaws=[];s.player.hp=10;
 assert.equal(chooseAdventure(s,'upgrade','recall'),true);assert.equal(s.player.hp,10+100*ADVENTURE_BOSS_HEAL);assert.equal(ADVENTURE_BOSS_HEAL,.4,'displayed boss recovery follows unchanged40percent mechanic');
}
console.log('PASS Adventure preview matches real recipe branches without mutation, targeted shop upgrade, unavailable purchase and exact boss recovery');

{
 const s=begin();s.phase='choice';s.choiceKind='law';s.offerLaws=[];const ranks={...s.ranks};
 assert.equal(adventureOffers(s).canGrow,true);assert.ok(adventureGrowthPath(s).includes('귀환 1/3'));
 assert.ok(chooseAdventure(s,'grow'));assert.equal(s.level,2);assert.equal(s.player.maxHp,110);assert.deepEqual(s.ranks,ranks);
 const first=createAdventure(12);startAdventure(first);first.phase='choice';first.choiceKind='law';first.offerLaws=['recall','split','orbit'];
 assert.equal(adventureOffers(first).canGrow,false,'the first law lesson cannot be bypassed');assert.equal(chooseAdventure(first,'grow'),false);
}
for(let act=0;act<3;act++){
 const s=begin();s.room=act*4+3;s.region=null;s.roomType='boss';s.roomReward='boss';s.wave=2;s.bossesDefeated=act;s.props=[];
 const boss={id:91,type:'boss',role:'boss',act,bossId:['austin','alwaysbeginner','tempestcarrier'][act],x:12,y:6,hp:1,maxHp:100,r:1.1,speed:0,cd:1000,tell:0,slow:0,frost:0,flash:0,pattern:0,power:1};
 const add={id:92,type:'hound',role:'melee',x:2,y:2,hp:200,maxHp:200,r:.5,speed:0,cd:1000,tell:0,slow:0,frost:0,flash:0,pattern:0,power:1};s.enemies=[boss,add];
 stepAdventure(s,1/60,{});assert.ok(s.enemies.includes(boss)&&s.enemies.includes(add),'an alive boss never dismisses its adds');
 assert.ok(adventureFormHit(s,boss,100));const kills=s.kills,earned=s.earned,count=s.bossesDefeated,receipt=adventureBossReceipt(s,act);
 s.shots.push({x:2,y:2,px:2,py:2,dx:1,dy:0,speed:0,life:3,hostile:true,damage:20});
 for(let i=0;i<12;i++)stepAdventure(s,1/60,{});assert.equal(s.enemies.length,0);assert.equal(s.shots.length,0);assert.ok(s.player.inv>=1.1);assert.equal(s.kills,kills);assert.equal(s.earned,earned);
 for(let i=0;i<80;i++)stepAdventure(s,1/60,{});assert.equal(s.phase,'choice');assert.equal(s.choiceKind,'boss');assert.equal(s.bossesDefeated,count);assert.deepEqual(adventureBossReceipt(s,act),receipt);assert.equal(s.kills,kills,'cleanup does not count summons as defeated enemies');
}
console.log('PASS earned law growth tradeoff, compulsory first-law lesson and three real boss death cleanup paths preserve kill/receipt accounting');

// Execute the real modal transition: a fatal hit between HUD ticks must still
// show zero health and stop the loop. A synchronous result sink failure is caught.
{
 const source=readFileSync(new URL('../src/seed-adventure-view.js',import.meta.url),'utf8');
 const fn=source.slice(source.indexOf(' function syncModal(){'),source.indexOf(' function circle('));
 const s=begin();s.phase='lost';s.player.hp=0;let health=36,stops=0,resultCalls=0;
 const modal={hidden:false,innerHTML:'',querySelector:()=>null,querySelectorAll:()=>[]};
 const no=()=>{};const ctx=vm.createContext({s,paused:false,modalKey:'playing',shopUpgradeIndex:-1,syncAccount:no,syncHud:()=>health=s.player.hp,credit:no,clearSave:no,$:()=>modal,stop:()=>stops++,audio:{setPaused:no},resetInput:no,isolated:()=>true,ATTACK_SHAPES:{slash:{name:'베기'}},ROOMS:new Array(12),LAWS:{recall:{name:'귀환'}},ADVENTURE_FORMS,creditNote:'',rankNote:'',onResult:()=>{resultCalls++;throw Error('offline result sink');},Promise});
 vm.runInContext(fn,ctx);ctx.syncModal();assert.equal(health,0);assert.equal(stops,1);assert.ok(modal.innerHTML.includes('다시 싹틀 수 있어요'));
 await new Promise(resolve=>setImmediate(resolve));assert.equal(resultCalls,1);ctx.syncModal();assert.equal(stops,1,'same outcome does not restart result loop');
}
console.log('PASS actual Adventure result modal updates terminal HP and tolerates result callback failure');

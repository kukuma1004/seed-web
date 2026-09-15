import assert from 'node:assert/strict';
import {buildRecord,parseBuild,validBuild,buildText,bossText,BUILD_TEXT_MAX} from '../src/ranking-build.js';
import {RANKING_KEY,killPoints,roomPoints,cleanName,readRanking,submitScore,lastName,rankingTable,RANKING_SIZE,KILL_POINTS} from '../src/score.js';
import {ITEMS,emptyInventory,normalizeInventory,validInventory,addItem,drinkPotion} from '../src/inventory.js';
import {validCheckpoint,difficulty} from '../src/run-save.js';

const memory=()=>{const data=new Map();return {getItem:k=>data.has(k)?data.get(k):null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k),data};};

// Points: bosses dominate, later journeys are worth more, elites sit between.
assert.equal(killPoints({type:'swarm'},0),KILL_POINTS.swarm);
assert.ok(killPoints({type:'warden',elite:true},0)<killPoints({type:'warden'},0));
assert.ok(killPoints({type:'austin'},4)>killPoints({type:'warden'},4));
assert.ok(killPoints({type:'hound'},2)>killPoints({type:'hound'},0));
assert.ok(roomPoints(4,1)>roomPoints(0,1)&&roomPoints(0,3)>roomPoints(0,0));

// Names: trimmed, single spaced, at most eight characters, no markup characters.
assert.equal(cleanName('  씨앗   대장  '),'씨앗 대장');assert.equal(cleanName('<b>abc</b>'),'babc/b');
assert.equal([...cleanName('가나다라마바사아자차')].length,8);assert.equal(cleanName(null),'');

// Ranking: sorted, capped, highlights the new entry, survives bad storage data, and remembers the last name.
{
 const s=memory();
 assert.deepEqual(readRanking(s),[]);
 const base={cycle:0,stage:2,kills:30,time:100};
 const a=submitScore(s,{...base,name:'하나',score:500},1);assert.equal(a.rank,1);assert.ok(a.saved);
 const b=submitScore(s,{...base,name:'둘',score:900},2);assert.equal(b.rank,1);
 const c=submitScore(s,{...base,name:'셋',score:700},3);assert.equal(c.rank,2);
 assert.deepEqual(readRanking(s).map(e=>e.name),['둘','셋','하나']);
 assert.equal(lastName(s),'셋');
 assert.equal(submitScore(s,{...base,name:'   ',score:10}).saved,false,'an empty name is refused');
 for(let i=0;i<RANKING_SIZE+5;i++)submitScore(s,{...base,name:'n'+i,score:1000+i},10+i);
 const board=readRanking(s);assert.equal(board.length,RANKING_SIZE);assert.equal(board.at(-1).score,1005);
 const low=submitScore(s,{...base,name:'낮음',score:1},99);assert.equal(low.rank,0,'a score below the board is not ranked');
 s.setItem(RANKING_KEY,JSON.stringify({version:1,entries:[{name:'<x>',score:5},{name:'ok',score:-1},'junk']}));
 assert.deepEqual(readRanking(s),[]);s.setItem(RANKING_KEY,'{bad json');assert.deepEqual(readRanking(s),[]);
 const html=rankingTable([{name:'a&b',score:1234,cycle:1,stage:4,kills:9,time:1,at:1}]);
 assert.ok(html.includes('a&amp;b')&&html.includes('1,234')&&html.includes('여정 2'));
 assert.ok(rankingTable([{name:'내기록',score:100,cycle:0,stage:0,kills:1,time:1,at:1}],null,1,null,37).includes('<b>37</b>'),'A separate personal row keeps its real overall place.');
 const broken={getItem(){throw new Error('blocked');},setItem(){throw new Error('blocked');}};
 assert.deepEqual(readRanking(broken),[]);assert.equal(submitScore(broken,{...base,name:'x',score:1}).saved,false);
}

// Inventory: stacks to the cap, refuses to waste a potion at full health, heals up to 100.
{
 const inv=emptyInventory();assert.equal(addItem(inv,'potion',2),2);assert.equal(addItem(inv,'potion',20),ITEMS.potion.max-2);
 assert.equal(inv.potion,ITEMS.potion.max);
 assert.deepEqual(drinkPotion(inv,100),{ok:false,reason:'full',hp:100});assert.equal(inv.potion,ITEMS.potion.max);
 const drink=drinkPotion(inv,70);assert.ok(drink.ok);assert.equal(drink.hp,100);assert.equal(drink.healed,30);assert.equal(inv.potion,ITEMS.potion.max-1);
 const empty=emptyInventory();assert.equal(drinkPotion(empty,10).reason,'empty');
 assert.deepEqual(normalizeInventory({potion:99,junk:3}),{...emptyInventory(),potion:ITEMS.potion.max});assert.deepEqual(normalizeInventory('x'),emptyInventory());
 assert.ok(validInventory(undefined)&&validInventory({potion:3}));assert.ok(!validInventory({potion:-1})&&!validInventory({elixir:1})&&!validInventory([]));
}

// Saves carry score, boss counts and potions, and accept the real boss room.
{
 const base={version:1,cycle:4,stage:4,mode:'entry',region:'garden',hp:80,rules:['split'],mutated:[],kills:300,elapsed:900};
 assert.ok(validCheckpoint({...base,score:12345,wardens:5,austins:0,inventory:{potion:2}}));
 assert.ok(validCheckpoint({...base,mode:'austin',wardens:5,austins:0}));
 assert.ok(!validCheckpoint({...base,mode:'austin',stage:3}),'the real boss lives in the boss room');
 assert.ok(!validCheckpoint({...base,score:-5}));assert.ok(!validCheckpoint({...base,wardens:1.5}));
 assert.ok(!validCheckpoint({...base,inventory:{potion:100}}));
 assert.ok(!validCheckpoint({...base,wardens:4,austins:1}),'cannot have beaten more real bosses than wardens allow');
 assert.ok(validCheckpoint({...base,mode:'crossroads'}),'old saves that stopped at the region choice still load');
}

// Every journey is faster than the one before, without a region choice.
for(let c=0;c<8;c++)assert.ok(difficulty(c+1).speed>difficulty(c).speed);

// Build records: short, validated, unknown ids skipped, shown under a ranking line through a callback.
{
 const b=buildRecord({levels:new Map([['split',3],['bogus',9]]),forms:new Map([['prism',2],['blackhole',7]]),relic:'coil',wardens:10,austins:2});
 assert.deepEqual(b,{laws:'split:3',forms:'blackhole:7,prism:2',relic:'coil',wardens:10,austins:2});
 assert.ok(validBuild(b));assert.ok(!validBuild({...b,laws:'x'.repeat(BUILD_TEXT_MAX+1)}));assert.ok(!validBuild({...b,austins:-1}));assert.equal(parseBuild(null),null);
 assert.deepEqual(parseBuild({...b,forms:'blackhole:7,future:3,prism:x'}).forms,[['blackhole',7]]);
 assert.equal(buildRecord({relic:'nope'}).relic,'');
 assert.equal(bossText(b),'문지기 10 · 오스틴 2회 격파');assert.equal(bossText({...b,austins:0}),'문지기 10');
 assert.ok(buildText(b).includes('작은 블랙홀 Lv.7')&&buildText(b).includes('유물 전도 코일'));
 const s=memory();submitScore(s,{name:'조합',score:10,cycle:0,stage:1,kills:5,time:9,build:b});
 assert.deepEqual(readRanking(s)[0].build,b,'this device keeps the build too');
 const html=rankingTable(readRanking(s),null,10,(e,place)=>`<i data-place="${place}">${bossText(e.build)}</i>`);
 assert.ok(html.includes('data-place="1"')&&html.includes('오스틴 2회'));
 assert.ok(!rankingTable(readRanking(s)).includes('data-place'),'no callback, no extra line');
}
// Potions: Q drinks, so no item claims a number key (1·2·3 choose cards).
for(const it of Object.values(ITEMS))assert.ok(it.key===''||it.key==='Q',it.id);
console.log('Score, ranking board, names, potions and save fields passed.');

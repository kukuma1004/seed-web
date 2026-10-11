import assert from 'node:assert/strict';
import {createDuel,stepDuel,DUEL_RELEASE_CHARACTERS} from '../src/seed-duel-rules.js';
import {createRelayDuel,stepRelayDuel,DUEL_RELAY_SECONDS} from '../src/seed-duel-relay.js';
const players=['pierce','frost','orbit'],enemies=['burst','gravity','recall'];
const make=()=>createRelayDuel({players,enemies,unlocked:players,seed:7});
assert.throws(()=>createRelayDuel({players:['pierce','pierce','orbit'],enemies}),RangeError);
assert.throws(()=>createRelayDuel({players,enemies,unlocked:['pierce']}),RangeError);
const r=make();r.duel.phase='fight';
Object.assign(r.duel.fighters[0],{hp:71,guard:32,meter:44,cd:[3,4],dodgeCd:.7});
const beforeRunner=r.duel.fighters[0];
function defeatEnemy(match){const old=match.duel;old.phase='fight';old.freeze=0;old.fighters[1].hp=1;old.fighters[1].x=old.fighters[0].x+1.5;old.fighters[1].y=old.fighters[0].y;old.fighters[0].fx=1;old.fighters[0].fy=0;for(let i=0;i<120&&match.duel===old&&match.phase!=='over';i++)stepRelayDuel(match,1/60,{attack:i%30===0},{});}
defeatEnemy(r);
assert.deepEqual(r.seats,[0,1]);assert.equal(r.duel.fighters[1].char,'gravity');
const survivor=r.duel.fighters[0];assert.equal(survivor.hp,71);assert.equal(survivor.meter,beforeRunner.meter);assert.deepEqual(survivor.cd,beforeRunner.cd);assert.equal(survivor.guard,beforeRunner.guard);assert.equal(r.duel.shots.length,0);
// A genuine engine timeout eliminates only one runner; future fights retain HP.
r.duel.phase='fight';r.duel.roundTime=.001;r.duel.fighters[0].hp=5;r.duel.fighters[1].hp=r.duel.fighters[1].maxHp;
stepRelayDuel(r,.02,{},{});assert.deepEqual(r.seats,[1,1]);assert.equal(r.duel.fighters[0].char,'frost');
while(r.phase!=='over')defeatEnemy(r);
assert.equal(r.winner,0);assert.equal(r.seats[1],3);const frozen=JSON.stringify(r);stepRelayDuel(r,.05,{attack:true},{});assert.equal(JSON.stringify(r),frozen);
const timed=make();for(let i=0;i<3601&&timed.phase!=='over';i++)stepRelayDuel(timed,.001,{},{},{clockDt:.05});
assert.equal(timed.phase,'over');assert.ok(timed.elapsed<=DUEL_RELAY_SECONDS+.05);assert.equal(timed.winner,-1,'equal teams draw rather than gift a win');
const idle=make();for(let i=0;i<3601&&idle.phase!=='over';i++)stepRelayDuel(idle,.05,{},{});
assert.equal(idle.winner,-1);assert.equal(idle.bouts,0);assert.deepEqual(idle.seats,[0,0],'equal bout timeout cannot award free player KOs');
// Source arrays and ordinary 2-win matches remain independent.
assert.deepEqual(players,['pierce','frost','orbit']);const ordinary=createDuel();ordinary.phase='fight';ordinary.roundTime=.001;stepDuel(ordinary,1/60,{},{});assert.equal(ordinary.phase,'roundEnd');assert.equal(ordinary.relay,undefined);
// Every original fighter remains valid without multiplying its combat rules.
for(const id of Object.keys(DUEL_RELEASE_CHARACTERS)){const ids=[id,...players.filter(x=>x!==id)].slice(0,3);assert.equal(createRelayDuel({players:ids,enemies}).duel.fighters[0].char,id);}
console.log('Relay: unique unlocked squads, genuine KO/timeout substitution, survivor resources, cleanup, 180s limit/draw, all 175 fighters and ordinary match isolation passed.');

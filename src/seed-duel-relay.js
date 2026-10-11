import {createDuel,stepDuel,DUEL_RELEASE_CHARACTERS,DUEL_INSPECTION_CHARACTERS} from './seed-duel-rules.js';

// A disposable match, deliberately outside story/account/ranking schemas.
// Every attack still goes through the ordinary duel engine. Only a defeated
// seat changes; a surviving seed never receives a free heal or cooldown reset.
export const DUEL_RELAY_SECONDS=180;
export const DUEL_RELAY_BOUT_SECONDS=55;
function team(ids,characters,allowed){
 if(!Array.isArray(ids)||ids.length!==3||new Set(ids).size!==3||ids.some(id=>!Object.hasOwn(characters,id)||allowed&&!allowed.includes(id)))throw new RangeError('Choose three distinct unlocked duel seeds');
 return [...ids];
}
export function createRelayDuel({players,enemies,unlocked,difficulty='normal',seed=1,inspection=false}={}){
 const characters=inspection?DUEL_INSPECTION_CHARACTERS:DUEL_RELEASE_CHARACTERS;
 const r={teams:[team(players,characters,unlocked),team(enemies,characters)],seats:[0,0],remaining:DUEL_RELAY_SECONDS,elapsed:0,phase:'fight',winner:-1,bouts:0,inspection:Boolean(inspection),difficulty,seed:seed>>>0,duel:null};
 r.duel=nextBout(r);return r;
}
function nextBout(r,survivor=null){
 const s=createDuel({player:r.teams[0][r.seats[0]],enemy:r.teams[1][r.seats[1]],released:true,inspection:r.inspection,difficulty:r.difficulty,seed:r.seed});
 s.relay=true;s.roundTime=Math.min(DUEL_RELAY_BOUT_SECONDS,r.remaining);s.ready=.9;s.message='다음 씨앗 · 준비';
 if(survivor){const f=s.fighters[survivor.team];f.hp=survivor.hp;f.guard=survivor.guard;f.meter=survivor.meter;f.cd=[...survivor.cd];f.dodgeCd=survivor.dodgeCd;}
 return s;
}
function finish(r,winner,message){r.phase='over';r.winner=winner;r.duel.phase='over';r.duel.winner=winner;r.duel.message=message;}
function health(r,seat){return 2-r.seats[seat]+Math.max(0,r.duel.fighters[seat].hp/r.duel.fighters[seat].maxHp);}
export function stepRelayDuel(r,dt,playerInput={},enemyInput=null,{clockDt=dt}={}){
 if(r.phase==='over'||!Number.isFinite(dt)||dt<=0||!Number.isFinite(clockDt)||clockDt<=0)return r.duel;
 const elapsed=Math.min(.05,clockDt);r.elapsed+=elapsed;r.remaining=Math.max(0,DUEL_RELAY_SECONDS-r.elapsed);
 if(r.remaining<=0){const a=health(r,0),b=health(r,1);finish(r,a===b?-1:a>b?0:1,'시간 종료 · 남은 씨앗과 체력 판정');return r.duel;}
 const s=r.duel;stepDuel(s,dt,playerInput,enemyInput);r.seed=s.seed;
 if(s.phase!=='roundEnd'&&s.phase!=='over')return s;
 // Ordinary 1:1 ties favor the player. A relay must not turn standing still
 // into three free KOs; an equal-health bout continues toward the global draw.
 const [a,b]=s.fighters;
 if(s.roundTime<=0&&a.hp>0&&b.hp>0&&Math.abs(a.hp/a.maxHp-b.hp/b.maxHp)<1e-9){
  s.phase='fight';s.wins=[0,0];s.ready=0;s.roundTime=Math.min(DUEL_RELAY_BOUT_SECONDS,r.remaining);s.message='';s.events=s.events.filter(e=>e!=='win'&&e!=='lose');return s;
 }
 const winner=s.wins[0]>s.wins[1]?0:1,loser=1-winner;const survivor=s.fighters[winner];
 r.seats[loser]++;r.bouts++;
 if(r.seats[loser]===3){finish(r,winner,winner===0?'릴레이 승리!':'릴레이 패배');return s;}
 const events=[...s.events];r.duel=nextBout(r,survivor);r.duel.events=events;return r.duel;
}
export function relayRemainingSeeds(r,seat){return Math.max(0,3-r.seats[seat]);}

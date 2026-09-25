// Run score and the ranking board kept in this browser.
// Points grow with the journey, so reaching further always beats farming an early room.
// v2: the board on this device started over with season 2 (the v1 board is left in storage, unread).
import {isBadName,shownName} from './name-filter.js';
import {MAX_RUN_CYCLE} from './journey.js';
export const RANKING_KEY='seed-ranking-v2',NAME_KEY='seed-player-name';
export const RANKING_SIZE=20,NAME_MAX=8;
export const KILL_POINTS=Object.freeze({swarm:10,hound:25,caster:25,shield:40,turret:40,relaymachine:35,relaymitt:30,catcher:40,pitcher:30,runner:25,batter:40,'sky-scout':32,'sky-diver':38,'sky-bomber':46,'sky-carrier':90,elite:400,warden:1000,act2warden:1400,act3warden:1800,austin:6000,alwaysbeginner:9000,tempestcarrier:12000});
const journey=cycle=>1+Math.max(0,cycle)*.5;
export function killPoints(e,cycle=0){
 const key=e?.type==='warden'&&e.elite?'elite':e?.type;
 return Math.round((KILL_POINTS[key]??20)*journey(cycle));
}
export function roomPoints(stage,cycle=0){return Math.round(100*(stage+1)*journey(cycle));}
// 15여정 완주의 시간 보너스. 50여정용 90분 보너스는 짧은 판의 점수를
// 시즌 1 서버 검증 한도 밖으로 밀어낼 수 있으므로 적용하지 않는다.
export const CLEAR_BONUS=Object.freeze({baseSeconds:1800,perSecond:35});
export function clearBonus(seconds){const s=Math.max(0,Number(seconds)||0);return Math.max(0,Math.round((CLEAR_BONUS.baseSeconds-s)*CLEAR_BONUS.perSecond));}
// Names are short, single-line and free of markup-breaking control characters.
export function cleanName(name){
 return [...String(name??'').replace(/[\x00-\x1f\x7f<>]/g,'').replace(/\s+/g,' ').trim()].slice(0,NAME_MAX).join('');
}
const validEntry=e=>e&&typeof e.name==='string'&&cleanName(e.name)===e.name&&e.name.length>0&&Number.isInteger(e.score)&&e.score>=0&&e.score<1e12&&Number.isInteger(e.cycle)&&e.cycle>=0&&Number.isInteger(e.stage)&&e.stage>=0&&e.stage<=4&&Number.isInteger(e.kills)&&e.kills>=0&&Number.isFinite(e.time)&&e.time>=0&&Number.isFinite(e.at)&&(e.done===undefined||typeof e.done==='boolean');
// 점수가 높은 순, 같은 점수면 더 빨리 끝낸 쪽이 위(2026-09-21).
export const rankOrder=(a,b)=>b.score-a.score||a.time-b.time||a.at-b.at;
const order=rankOrder;
export function readRanking(storage){
 try{const data=JSON.parse(storage.getItem(RANKING_KEY));return Array.isArray(data?.entries)?data.entries.filter(validEntry).sort(order).slice(0,RANKING_SIZE):[];}catch{return [];}
}
// Returns the board after the entry, the entry's 1-based rank (0 when it did not make the board) and whether it was stored.
export function submitScore(storage,{name,score,cycle,stage,kills,time,done=false,build=null,region=null},now=Date.now()){
 const entry={name:cleanName(name),score:Math.max(0,Math.floor(score)),cycle,stage,kills,time:Math.floor(time),at:now,...(done?{done:true}:{}),...(build?{build}:{}),...(region==='skyway'?{region}:{})};
 if(!validEntry(entry))return {ranking:readRanking(storage),rank:0,saved:false,entry:null};
 const ranking=[...readRanking(storage),entry].sort(order).slice(0,RANKING_SIZE);
 const rank=ranking.indexOf(entry)+1;
 try{storage.setItem(RANKING_KEY,JSON.stringify({version:1,entries:ranking}));storage.setItem(NAME_KEY,entry.name);return {ranking,rank,saved:true,entry};}
 catch{return {ranking,rank,saved:false,entry};}
}
// 거른 별명(name-filter.js)은 저장하지 않고, 예전에 저장된 것은 없는 것으로 읽어 다시 고르게 한다.
export function lastName(storage){try{const name=cleanName(storage.getItem(NAME_KEY));return isBadName(name)?'':name;}catch{return '';}}
export function saveName(storage,name){const clean=cleanName(name);if(isBadName(clean))return '';try{storage.setItem(NAME_KEY,clean);return clean;}catch{return clean;}}
export function formatScore(score){return Math.floor(score).toLocaleString('ko-KR');}
// 걸린 시간: 12분 04초 · 1시간 03분처럼 읽기 쉽게.
export function formatTime(seconds){
 const s=Math.max(0,Math.floor(Number(seconds)||0)),h=Math.floor(s/3600),m=Math.floor(s%3600/60),r=s%60;
 return h?`${h}시간 ${String(m).padStart(2,'0')}분`:m?`${m}분 ${String(r).padStart(2,'0')}초`:`${r}초`;
}
export const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// buildHtml(entry, place): optional extra line under a row (the game shows the build of the top three).
export function rankingTable(ranking,highlight=null,limit=10,buildHtml=null,startPlace=1){
 if(!ranking.length)return '<p class="ranking-empty">아직 등록된 기록이 없어요 · 첫 번째 이름을 남겨 보세요</p>';
 return `<ol class="ranking">${ranking.slice(0,limit).map((e,i)=>{const place=typeof startPlace==='number'?startPlace+i:startPlace;return `<li class="${e===highlight?'mine':''}"><b>${place}</b><span>${escapeHtml(shownName(e.name))}</span><em>${formatScore(e.score)}</em><small>${e.done?(e.cycle<=MAX_RUN_CYCLE?'3회 격파 · 완주 · ':'완주 · '):''}여정 ${e.cycle+1} · ${e.done?'':`${e.stage+1}번째 방 · `}${e.kills} 처치 · ${formatTime(e.time)}</small>${buildHtml?buildHtml(e,place)||'':''}</li>`;}).join('')}</ol>`;
}

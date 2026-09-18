// Titles the seed keeps between runs, and the small lasting merit each one gives (2026-09-15).
// Pure data and rules only (no DOM or CSS), so tests and the pause sheet share one source.
import {FIRST_GARDEN_BADGE} from './account-profile.js';
export const AUSTIN_TITLE='정시를 깨운 자';
export const CODEX_TITLE='정원의 기록자';
export const FIRST_GARDEN_TITLE='첫 정원의 선구자';
export const AUSTIN_MOVE_SPEED=.05;
// The codex title arrives at 20 discovered evolutions; every further 10 discoveries add 0.5% basic shot speed.
// The codex keeps growing with new evolutions, so the bonus keeps a reason to come back.
export const CODEX=Object.freeze({titleAt:20,step:10,shotSpeedPerStep:.005,maxShotSpeed:.03});

const percent=v=>`${Math.round(v*1000)/10}%`;
export function codexSteps(discovered=0){return discovered>=CODEX.titleAt?Math.floor((discovered-CODEX.titleAt)/CODEX.step):0;}

export function titleState({austin=false,discovered=0,total=Infinity,badges=[],equipped=''}={}){
 const n=Math.max(0,Math.floor(Number(discovered)||0)),codex=n>=CODEX.titleAt,codexSpeed=Math.min(CODEX.maxShotSpeed,codexSteps(n)*CODEX.shotSpeedPerStep);
 const titles=[];
 if(Array.isArray(badges)&&badges.includes(FIRST_GARDEN_BADGE))titles.push({id:FIRST_GARDEN_BADGE,name:FIRST_GARDEN_TITLE,perk:'초대 명예의 전당 TOP 10',shotSpeed:0,moveSpeed:0});
 if(austin)titles.push({id:'austin',name:AUSTIN_TITLE,perk:`이동 속도 +${percent(AUSTIN_MOVE_SPEED)}`,shotSpeed:0,moveSpeed:AUSTIN_MOVE_SPEED});
 if(codex)titles.push({id:'codex',name:CODEX_TITLE,perk:codexSpeed>0?`도감 ${n}개 · 기본 탄환 속도 +${percent(codexSpeed)}`:`도감 ${n}개 발견`,shotSpeed:codexSpeed,moveSpeed:0});
 const selected=titles.find(title=>title.id===equipped)||titles[0]||null;
 const goal=!codex?CODEX.titleAt:codexSpeed<CODEX.maxShotSpeed?CODEX.titleAt+(codexSteps(n)+1)*CODEX.step:null;
 const next=goal!==null&&goal<=total?{at:goal,need:goal-n,reward:codex?`기본 탄환 속도 +${percent(CODEX.shotSpeedPerStep)}`:`칭호 '${CODEX_TITLE}'`}:null;
 const sources=titles.filter(title=>title.shotSpeed>0).map(({id,name,shotSpeed})=>({id,name,shotSpeed}));
 const moveSpeedBonus=austin?AUSTIN_MOVE_SPEED:0,shotSpeedBonus=codexSpeed;
 return {titles,equipped:selected?.id||null,shown:selected?.name||null,moveSpeed:1+moveSpeedBonus,moveSpeedBonus,shotSpeed:1+shotSpeedBonus,shotSpeedBonus,shotSpeedSources:sources,next};
}

// What changed when the discovery count went from `before` to `after`, as one line for the toast (null if nothing).
export function codexNews(before,after){
 if(before<CODEX.titleAt&&after>=CODEX.titleAt)return `도감 ${CODEX.titleAt}개 달성 · 칭호 '${CODEX_TITLE}'`;
 const previous=Math.min(CODEX.maxShotSpeed,codexSteps(before)*CODEX.shotSpeedPerStep),next=Math.min(CODEX.maxShotSpeed,codexSteps(after)*CODEX.shotSpeedPerStep);
 if(next>previous)return `도감 ${after}개 달성 · 기본 탄환 속도 +${percent(next)}`;
 return null;
}

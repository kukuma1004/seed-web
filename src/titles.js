// Titles the seed keeps between runs, and the small lasting merit each one gives (2026-09-15).
// Pure data and rules only (no DOM or CSS), so tests and the pause sheet share one source.
import {FIRST_GARDEN_BADGE} from './account-profile.js';
export const AUSTIN_TITLE='정시를 깨운 자';
export const CODEX_TITLE='정원의 기록자';
export const FIRST_GARDEN_TITLE='첫 정원의 선구자';
export const AUSTIN_SHOT_SPEED=.02;
// The codex title arrives at 20 discovered evolutions; every further 10 discoveries add 0.5% basic shot speed.
// The codex keeps growing with new evolutions, so the bonus keeps a reason to come back.
export const CODEX=Object.freeze({titleAt:20,step:10,shotSpeedPerStep:.005});

const percent=v=>`${Math.round(v*1000)/10}%`;
export function codexSteps(discovered=0){return discovered>=CODEX.titleAt?Math.floor((discovered-CODEX.titleAt)/CODEX.step):0;}

export function titleState({austin=false,discovered=0,total=Infinity,badges=[]}={}){
 const n=Math.max(0,Math.floor(Number(discovered)||0)),codex=n>=CODEX.titleAt,codexSpeed=codexSteps(n)*CODEX.shotSpeedPerStep;
 const titles=[];
 if(Array.isArray(badges)&&badges.includes(FIRST_GARDEN_BADGE))titles.push({id:FIRST_GARDEN_BADGE,name:FIRST_GARDEN_TITLE,perk:'초대 명예의 전당 TOP 10'});
 if(austin)titles.push({id:'austin',name:AUSTIN_TITLE,perk:`기본 탄환 속도 +${percent(AUSTIN_SHOT_SPEED)}`});
 if(codex)titles.push({id:'codex',name:CODEX_TITLE,perk:codexSpeed>0?`도감 ${n}개 · 기본 탄환 속도 +${percent(codexSpeed)}`:`도감 ${n}개 발견`});
 const goal=codex?CODEX.titleAt+(codexSteps(n)+1)*CODEX.step:CODEX.titleAt;
 const next=goal<=total?{at:goal,need:goal-n,reward:codex?`기본 탄환 속도 +${percent(CODEX.shotSpeedPerStep)}`:`칭호 '${CODEX_TITLE}'`}:null;
 return {titles,shown:titles[0]?.name||null,shotSpeed:1+(austin?AUSTIN_SHOT_SPEED:0)+codexSpeed,next};
}

// What changed when the discovery count went from `before` to `after`, as one line for the toast (null if nothing).
export function codexNews(before,after){
 if(before<CODEX.titleAt&&after>=CODEX.titleAt)return `도감 ${CODEX.titleAt}개 달성 · 칭호 '${CODEX_TITLE}'`;
 if(codexSteps(after)>codexSteps(before))return `도감 ${after}개 달성 · 기본 탄환 속도 +${percent(codexSteps(after)*CODEX.shotSpeedPerStep)}`;
 return null;
}

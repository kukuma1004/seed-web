// Titles the seed keeps between runs, and the small lasting merit each one gives (2026-09-15).
// Pure data and rules only (no DOM or CSS), so tests and the pause sheet share one source.
import {FIRST_GARDEN_BADGE} from './account-profile.js';
export const AUSTIN_TITLE='정시를 깨운 자';
// 오스틴을 한 판에서 세 번 이겨 1막을 완주한 씨앗. 이동 속도 +10%이고 '정시를 깨운 자'의 +5%와 더해지지 않는다.
export const AUSTIN_CLEAR_TITLE='정시를 정복한 자';
export const AUSTIN_CLEAR_MOVE_SPEED=.1;
export const AUSTIN_VETERAN_TITLE='정시의 연대기';
export const AUSTIN_VETERAN_CADENCE=.02;
export const ALWAYS_BEGINNER_TITLE='초심을 지킨 자';
export const CODEX_TITLE='정원의 기록자';
export const CODEX_COMPLETE_TITLE='정원의 완성자';
export const FIRST_GARDEN_TITLE='첫 정원의 선구자';
export const AUSTIN_MOVE_SPEED=.05;
export const ALWAYS_BEGINNER_MAX_HP=10;
// 항상초심을 한 판에서 세 번 이겨 2막을 완주한 씨앗. 최대 생명력 +20이고 '초심을 지킨 자'의 +10과 더해지지 않는다.
export const ALWAYS_CLEAR_TITLE='초심을 완성한 자';
export const ALWAYS_CLEAR_MAX_HP=20;
// 현재 도감은 153종이다. 10종마다 +0.5%에 30종마다 +0.5%를 더해
// 150종에서 다섯 능력 모두 +10%에 닿는다. 정원 성장과는 따로 더한다.
export const CODEX=Object.freeze({titleAt:10,step:10,statPerStep:.005,milestoneStep:30,milestoneBonus:.005,maxStat:.1,completeAt:153});

const percent=v=>`${Math.round(v*1000)/10}%`;
export function codexSteps(discovered=0){return discovered>=CODEX.titleAt?Math.floor(discovered/CODEX.step):0;}
export function codexBonus(discovered=0){return Math.min(CODEX.maxStat,codexSteps(discovered)*CODEX.statPerStep+Math.floor(Math.max(0,Number(discovered)||0)/CODEX.milestoneStep)*CODEX.milestoneBonus);}

export function titleState({austin=false,austinClear=false,austinVeteran=false,alwaysBeginner=false,alwaysClear=false,discovered=0,total=Infinity,badges=[],equipped=''}={}){
 const n=Math.max(0,Math.floor(Number(discovered)||0)),codex=n>=CODEX.titleAt,codexStat=codexBonus(n);
 const titles=[];
 if(Array.isArray(badges)&&badges.includes(FIRST_GARDEN_BADGE))titles.push({id:FIRST_GARDEN_BADGE,name:FIRST_GARDEN_TITLE,perk:'초대 명예의 전당 TOP 10',shotSpeed:0,moveSpeed:0,maxHp:0});
 if(austinClear)titles.push({id:'austinclear',name:AUSTIN_CLEAR_TITLE,perk:`오스틴 한 판 3회 완주 · 이동 속도 +${percent(AUSTIN_CLEAR_MOVE_SPEED)}${austin?` ('${AUSTIN_TITLE}'와 겹치지 않음)`:''}`,shotSpeed:0,moveSpeed:AUSTIN_CLEAR_MOVE_SPEED,maxHp:0});
 if(austinVeteran)titles.push({id:'austinveteran',name:AUSTIN_VETERAN_TITLE,perk:`오스틴 누적 10회 격파 · 공격 빈도 +${percent(AUSTIN_VETERAN_CADENCE)}`,shotSpeed:0,moveSpeed:0,maxHp:0});
 if(austin)titles.push({id:'austin',name:AUSTIN_TITLE,perk:`이동 속도 +${percent(AUSTIN_MOVE_SPEED)}${austinClear?` ('${AUSTIN_CLEAR_TITLE}'에 포함)`:''}`,shotSpeed:0,moveSpeed:AUSTIN_MOVE_SPEED,maxHp:0});
 if(alwaysClear)titles.push({id:'alwaysclear',name:ALWAYS_CLEAR_TITLE,perk:`항상초심 한 판 3회 완주 · 최대 생명력 +${ALWAYS_CLEAR_MAX_HP}${alwaysBeginner?` ('${ALWAYS_BEGINNER_TITLE}'와 겹치지 않음)`:''}`,shotSpeed:0,moveSpeed:0,maxHp:ALWAYS_CLEAR_MAX_HP});
 if(alwaysBeginner)titles.push({id:'alwaysbeginner',name:ALWAYS_BEGINNER_TITLE,perk:`최대 생명력 +${ALWAYS_BEGINNER_MAX_HP}${alwaysClear?` ('${ALWAYS_CLEAR_TITLE}'에 포함)`:''}`,shotSpeed:0,moveSpeed:0,maxHp:ALWAYS_BEGINNER_MAX_HP});
 if(codex)titles.push({id:'codex',name:CODEX_TITLE,perk:`도감 ${n}개 · 공격력·이속·치명타·순환·최대 생명력 +${percent(codexStat)}`,shotSpeed:0,moveSpeed:0,maxHp:0,codexBonus:codexStat});
 if(n>=CODEX.completeAt)titles.push({id:'codexcomplete',name:CODEX_COMPLETE_TITLE,perk:`도감 ${CODEX.completeAt}종 완성 · 기념 칭호`,shotSpeed:0,moveSpeed:0,maxHp:0});
 const selected=titles.find(title=>title.id===equipped)||titles[0]||null;
 const goal=!codex?CODEX.titleAt:codexStat<CODEX.maxStat?(codexSteps(n)+1)*CODEX.step:n<CODEX.completeAt?CODEX.completeAt:null;
 const next=goal!==null&&goal<=total?{at:goal,need:goal-n,reward:!codex?`칭호 '${CODEX_TITLE}'`:goal===CODEX.completeAt?`칭호 '${CODEX_COMPLETE_TITLE}'`:`모든 능력 +${percent(codexBonus(goal)-codexBonus(n))}`}:null;
 const sources=titles.filter(title=>title.shotSpeed>0).map(({id,name,shotSpeed})=>({id,name,shotSpeed}));
 // 오스틴 두 칭호의 이동 속도는 더하지 않고 큰 쪽 하나만 쓴다.
 const moveSpeedBonus=Math.max(austin?AUSTIN_MOVE_SPEED:0,austinClear?AUSTIN_CLEAR_MOVE_SPEED:0),shotSpeedBonus=0,maxHpBonus=Math.max(alwaysBeginner?ALWAYS_BEGINNER_MAX_HP:0,alwaysClear?ALWAYS_CLEAR_MAX_HP:0);
 return {titles,equipped:selected?.id||null,shown:selected?.name||null,moveSpeed:1+moveSpeedBonus,moveSpeedBonus,shotSpeed:1,shotSpeedBonus,shotSpeedSources:sources,attackCadence:1+(austinVeteran?AUSTIN_VETERAN_CADENCE:0),attackCadenceBonus:austinVeteran?AUSTIN_VETERAN_CADENCE:0,maxHp:100+maxHpBonus,maxHpBonus,codexBonus:codex?codexStat:0,next};
}

// What changed when the discovery count went from `before` to `after`, as one line for the toast (null if nothing).
export function codexNews(before,after){
 if(before<CODEX.titleAt&&after>=CODEX.titleAt)return `도감 ${CODEX.titleAt}개 달성 · 칭호 '${CODEX_TITLE}' · 모든 능력 +${percent(codexBonus(after))}`;
 if(before<CODEX.completeAt&&after>=CODEX.completeAt)return `도감 ${CODEX.completeAt}종 완성 · 칭호 '${CODEX_COMPLETE_TITLE}' 획득${codexBonus(after)>codexBonus(before)?` · 모든 능력 +${percent(codexBonus(after))}`:''}`;
 const previous=codexBonus(before),next=codexBonus(after);
 if(next>previous)return `도감 ${after}개 달성 · 모든 능력 +${percent(next)}`;
 return null;
}

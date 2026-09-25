import {LAWS,offerLaws} from './laws.js';
import {isStarRoom} from './room-rotation.js';
import {STADIUM_ROOMS,isAct2} from './act2.js';
import {SKYWAY_ROOMS,isAct3} from './act3.js';
const wall=(x,z,w,d,h=1.4)=>({x,z,w,d,h});
// 한 판의 찐보스를 세 번 이기면 완주한다. 다섯 여정마다 한 번이므로 15번째 여정에서 끝난다.
export const FINAL_BOSS_CAP=3,FINAL_BOSS_EVERY=5;
export const MAX_RUN_CYCLE=FINAL_BOSS_CAP*FINAL_BOSS_EVERY-1;
export const bossCapReached=bosses=>Number.isInteger(bosses)&&bosses>=FINAL_BOSS_CAP;
export const ROOMS=[
 {name:'잠든 정원의 입구',hint:'첫 법칙을 깨우세요',covers:[wall(-3,1,2,1.2,1.7),wall(5.8,4,2.4,.9)],enemies:[['hound',-4,-3],['caster',5,-3]]},
 {name:'메아리 회랑',hint:'긴 벽을 돌아 사선을 만드세요',covers:[wall(-3,0,1.1,5),wall(3,-1,1.1,4)],enemies:[['hound',-6,-4],['caster',6,-4],['hound',0,-3]]},
 {name:'달의 원형 정원',hint:'둥근 벽을 따라 돌며 네 기둥 사이로 사선을 만드세요',covers:[wall(-3.1,-2,1.3,1.3),wall(3.1,-2,1.3,1.3),wall(-3.1,2,1.3,1.3),wall(3.1,2,1.3,1.3)],enemies:[['caster',-4.8,-3.4],['caster',4.8,-3.4],['hound',0,-4.7],['hound',4.8,2.8]]},
 {name:'발아의 제단',hint:'마지막 법칙을 변이시키세요',covers:[wall(-5,0,3,.9),wall(5,0,3,.9),wall(0,-2,1.6,1.5)],enemies:[['caster',-7,-4],['caster',7,-4],['hound',-6,3],['hound',6,3]]},
 {name:'기억의 문지기',hint:'문지기는 당신의 첫 두 법칙을 배웁니다',covers:[wall(-5,1,2,1),wall(5,1,2,1)],enemies:[['warden',0,-3]]}
];
export const EXIT={x:0,z:-6.6,radius:1.65};
// The star garden replaces one room per journey (see room-rotation.js). Its own cover and first enemies
// fit inside the star; two short pillars beside the middle give the bent walls something to bounce around.
export const STAR_ROOM=Object.freeze({id:'star',name:'별빛 정원',hint:'별 끝은 막다른 길 · 가운데로 빠져나오며 꺾인 벽으로 탄을 튕기세요',
 covers:[wall(-3.8,.5,1.1,1.1),wall(3.8,.5,1.1,1.1)],
 enemies:[['hound',7.6,-2],['caster',0,-6.9],['hound',-4.6,-2.6]],
 shield:{x:0,z:-.6}});
export function roomFor(stage,cycle=0,region='garden'){if(isAct3(region))return SKYWAY_ROOMS[stage];if(isAct2(region))return STADIUM_ROOMS[stage];return isStarRoom(stage,cycle)?STAR_ROOM:ROOMS[stage];}
export const LAW_NAMES=Object.fromEntries(Object.entries(LAWS).map(([id,v])=>[id,v.name]));
export function rewardOptions(room,laws,mutated=[],options={}){
 const random=options.random||Math.random;
 const offered=offerLaws(laws,mutated,{mutation:room===3,...options});
 if(laws.length>=5){
  const replacements=Object.keys(LAWS).filter(id=>!laws.includes(id));
  for(let i=replacements.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[replacements[i],replacements[j]]=[replacements[j],replacements[i]];}
  if(!(options.mutation??(room===3))&&offered.length===3)offered[2]=replacements.shift();
  for(const id of replacements){if(offered.length===3)break;offered.push(id);}
 }
 return offered;
}
export function learnedLaws(hp,maxHp,laws){return laws.slice(0,hp/maxHp<=.34?2:hp/maxHp<=.67?1:0);}
export function canUseExit({open,mode,paused,x,z,exit=EXIT}){return open&&mode==='playing'&&!paused&&Math.hypot(x-exit.x,z-exit.z)<(exit.radius??EXIT.radius);}

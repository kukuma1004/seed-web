const wall=(x,z,w,d,h=1.4)=>({x,z,w,d,h});
export const ROOMS=[
 {name:'잠든 정원의 입구',hint:'첫 법칙을 깨우세요',covers:[wall(-3,1,2,1.2,1.7),wall(5.8,4,2.4,.9)],enemies:[['hound',-4,-3],['caster',5,-3]]},
 {name:'메아리 회랑',hint:'긴 벽을 돌아 사선을 만드세요',covers:[wall(-3,0,1.1,5),wall(3,-1,1.1,4)],enemies:[['hound',-6,-4],['caster',6,-4],['hound',0,-3]]},
 {name:'가시의 안뜰',hint:'네 기둥 사이로 공격을 흘리세요',covers:[wall(-4,-2,1.5,1.5),wall(4,-2,1.5,1.5),wall(-4,3,1.5,1.5),wall(4,3,1.5,1.5)],enemies:[['caster',-7,-4],['caster',7,-4],['hound',0,-4],['hound',7,2]]},
 {name:'발아의 제단',hint:'마지막 법칙을 변이시키세요',covers:[wall(-5,0,3,.9),wall(5,0,3,.9),wall(0,-2,1.6,1.5)],enemies:[['caster',-7,-4],['caster',7,-4],['hound',-6,3],['hound',6,3]]},
 {name:'기억의 문지기',hint:'문지기는 당신의 첫 두 법칙을 배웁니다',covers:[wall(-5,1,2,1),wall(5,1,2,1)],enemies:[['warden',0,-3]]}
];
export const EXIT={x:0,z:-6.6,radius:1.65};
export const LAW_NAMES={reflect:'반사',split:'분열',chain:'연쇄'};
export function rewardOptions(room,laws){return room===3?[...laws]:Object.keys(LAW_NAMES).filter(id=>!laws.includes(id));}
export function learnedLaws(hp,maxHp,laws){return laws.slice(0,hp/maxHp<=.34?2:hp/maxHp<=.67?1:0);}
export function canUseExit({open,mode,paused,x,z}){return open&&mode==='playing'&&!paused&&Math.hypot(x-EXIT.x,z-EXIT.z)<EXIT.radius;}

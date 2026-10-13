import {duelContact} from './duel-contacts.js';
// Learning presentation only. Combat, story unlocks and trial eligibility remain
// owned by their existing modules. The three lessons use actual contact proof.
export const DUEL_INTRO_STYLES=Object.freeze(['pierce','burst','gravity']);
const LESSONS=Object.freeze({
 pierce:Object.freeze({name:'창끝 거리 익히기',keys:Object.freeze(['거리 유지','공격']),tip:'너무 붙지 말고 창끝 거리에서 첫 찌르기를 맞혀 보세요.',approach:'창끝으로 찌르고, 상대가 다가오면 거리를 다시 벌리세요.',dummy:'idle',distance:2.7,on:'style'}),
 burst:Object.freeze({name:'막는 상대 무너뜨리기',keys:Object.freeze(['다가가기','공격+방어']),tip:'가까이 가서 강공격을 맞혀 상대의 파란 막기 게이지를 깨세요.',approach:'가까이 들어가 강공격으로 막기를 깨고, 느린 회수는 회피로 넘기세요.',dummy:'block',distance:2,on:'style'}),
 gravity:Object.freeze({name:'막기를 넘는 끌어당기기',keys:Object.freeze(['앞을 향하기','공격+회피']),tip:'막는 상대를 정면에 두고 기술1로 끌어당겨 실제 피해를 주세요.',approach:'정면의 막는 상대를 끌어온 뒤, 가까운 거리에서 공격하세요.',dummy:'block',distance:4,on:'style'})
});
export const duelStyleLesson=id=>LESSONS[id]||null;
export function duelLearningGuide(character){
 if(!character)return null;
 const lesson=duelStyleLesson(character.id);
 return {name:character.name,role:character.role,approach:lesson?.approach||character.blurb,
  caution:character.blurb,skills:character.skills,ultimate:character.ult};
}
// Reuse one numeric snapshot per mounted view. No per-frame arrays/objects.
export function captureDuelStyleFrame(s,out){
 const p=s.fighters[0],e=s.fighters[1];
 out.hp=e.hp;out.guard=e.guard;out.blocking=e.blocking;
 out.distance=Math.hypot(p.x-e.x,p.y-e.y);out.skillCd=p.cd[0];out.meter=p.meter;
 return out;
}
export function duelStyleLessonSucceeded(s,before,character){
 if(!s?.practice||s.phase!=='fight'||!character||!duelStyleLesson(character.id))return false;
 const p=s.fighters[0],e=s.fighters[1];
 if(p.char!==character.id)return false;
 const events=s.events;
 if(character.id==='pierce')return events.includes('practiceMelee0')&&e.hp<before.hp&&before.distance>=character.reach*.8;
 // Guard regeneration starts in the same engine step as a break; the broken
 // state is the contact proof, rather than an exact post-frame zero value.
 if(character.id==='burst')return events.includes('guardBreak')&&duelContact(s,'guardBreak',0)&&before.guard>0&&e.state==='broken';
 return before.blocking&&events.includes('skill')&&p.cd[0]>before.skillCd&&e.hp<before.hp&&
  Math.hypot(p.x-e.x,p.y-e.y)<before.distance-.5&&s.effects.some(f=>f.type==='pull'&&f.life===f.max);
}

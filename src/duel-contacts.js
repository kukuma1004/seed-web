// Presentation/practice provenance on existing bounded contact effects.
// No combat imports, simulated hits, extra effects or persistent state.
const TYPES=Object.freeze({hit:'hit',heavyHit:'heavy',block:'block',parry:'parry',guardBreak:'guardBreak'});
const TIP_SOUND=Object.freeze(['pierceHit',Object.freeze({pitch:1.05})]);
const PULL_SOUND=Object.freeze(['gravityHit',Object.freeze({pitch:.95})]);
const BURST_SOUND=Object.freeze(['hit',Object.freeze({pitch:.75,intensity:1.35})]);

export function duelContact(s,event,actorTeam=null){
 for(const e of s?.effects||[]){
  if(e.life!==e.max||actorTeam!==null&&e.actorTeam!==actorTeam)continue;
  if(e.contactSignal){
   if(event==='hit'?e.type==='hit':e.contactSignal===event)return e;
  }else if(actorTeam===null&&TYPES[event]&&e.type===TYPES[event])return e;
 }
 return null;
}
export function duelContactSound(contact){
 if(contact?.contactSignal==='pierceTip')return TIP_SOUND;
 if(contact?.contactSignal==='gravityPull')return PULL_SOUND;
 if(contact?.contactSignal==='heavyHit'&&contact.source==='burst')return BURST_SOUND;
 return null;
}
export function applyDuelIdentityContacts(feel,s,apply){
 for(const e of s?.effects||[]){
  if(e.life!==e.max)continue;
  if(e.contactSignal==='pierceTip'||e.contactSignal==='gravityPull'||e.type==='hit'&&e.contactSignal==='heavyHit')apply(feel,e.contactSignal,e.x,e.y,{contact:true,engineFreeze:s.freeze||0});
 }
}

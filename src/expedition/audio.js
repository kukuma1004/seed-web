import {getExpeditionSpecies} from './species.js';

const SHOTS=Object.freeze({burst:'shotBurst',orbit:'shotOrbit',reflect:'reflect',pierce:'shotPierce',gravity:'shotGravity',chain:'shotArc',frost:'shotFrost',split:'shotPetal',recall:'shotReturn'});
const HITS=Object.freeze({burst:'burstHit',pierce:'pierceHit',gravity:'gravityHit',chain:'chain',frost:'frostHit',split:'split',reflect:'reflect'});
const EVENTS=Object.freeze({guard:'reflect',switch:'dash',resonance:'fusion',permadeath:'hurt',enemyDeath:'burstHit',bossWarning:'bossWarning',victory:'bossDefeat',defeat:'hurt',protection:'reflect',chill:'frostHit',chain:'chain',returnWarning:'shotReturn'});

// Reuse the shared audio palette and voice limiter. Presentation never owns
// another AudioContext, and an idle round creates no periodic sound effect.
export function expeditionAudioEvent(event,units=[]){
 if(!event)return null;
 const actor=units.find(u=>u.id===event.unitId);
 const law=getExpeditionSpecies(actor?.speciesId)?.dominantLaw;
 if(event.type==='action'){
  if(['guard','switch','resonance'].includes(event.kind))return null;
  if(event.kind==='awaken')return 'ultimate';
  return actor?.side==='enemy'?(actor.boss?'bossAttack':'shotCrystal'):(SHOTS[law]||'shot');
 }
 if(event.type==='damage')return HITS[law]||'hit';
 if(event.type==='victory')return units.some(u=>u.boss)?'bossDefeat':'pickup';
 return EVENTS[event.type]||null;
}

export function expeditionIntentAudio(intent){
 return {return:'pickup',hatch:'pickup',resow:'pickup',grow:'pickup',evolve:'evolve',twin:'fusion'}[intent?.type]||null;
}

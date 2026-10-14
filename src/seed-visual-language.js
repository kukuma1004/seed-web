// SEED's shared painterly visual contract. Presentation only; no simulation state.
// Approved painterly treatment is shipped in all modes. Local review remains isolated.
export const SEED_VISUAL_LANGUAGE=Object.freeze({
 version:'garden-depth-v1',
 depthScale:.76,
 lightDirection:Object.freeze({x:-.6,y:-.8}),
 colors:Object.freeze({ivory:'#f2edce',jade:'#b4dbc2',ink:'#142a24',stone:'#c7cbb0',moss:'#526951',gold:'#edd18a',danger:'#ef927e',dangerCore:'#ffe0bc'}),
 laws:Object.freeze({burst:'#ffc07c',orbit:'#c6c4ff',reflect:'#9cecff',pierce:'#e4ffc1',gravity:'#cea9ed',chain:'#ffe5a0',frost:'#b5eeff',split:'#ffbea5',recall:'#bcebdc'}),
 motion:Object.freeze({idleLift:.025,walkLift:.08,recoil:.07,contactFlashSeconds:.11,impactSeconds:.18,trailSeconds:.16}),
 limits:Object.freeze({contactLayers:2,lightStampSize:256,particleCap:24,dpr:1.5})
});
// Normal web/Capacitor clients receive the approved treatment. The only opt-out
// is a loopback inspection comparison; public query strings cannot disable it.
export function seedVisualEnabled(location){
 if(!location)return false;
 const q=new URLSearchParams(location.search||'');
 const local=['localhost','127.0.0.1','[::1]','::1'].includes(location.hostname);
 return !(local&&q.get('inspect')==='1'&&q.get('visual25d')==='0');
}
export function seedVisualReviewEnabled(location){
 if(!location)return false;
 const q=new URLSearchParams(location.search||'');
 return ['localhost','127.0.0.1','[::1]','::1'].includes(location.hostname)&&q.get('inspect')==='1'&&q.get('visual25d')==='1';
}
export function paintSeedContact(ctx,x,y,size,{alpha=1,lift=0}={}){
 if(!(size>0)||!Number.isFinite(x+y+size)||alpha<=0)return;
 const settle=Math.max(.65,1-Math.max(0,lift)*.3);
 ctx.save();ctx.globalAlpha*=Math.min(1,alpha);ctx.fillStyle='#10201430';
 ctx.beginPath();ctx.ellipse(x+size*.12,y+size*.025,size*.46*settle,size*.16*settle,.15,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#101d1960';ctx.beginPath();ctx.ellipse(x,y+size*.015,size*.24*settle,size*.075*settle,0,0,Math.PI*2);ctx.fill();ctx.restore();
}
export const projectSeedDirection=(x,y,depth=SEED_VISUAL_LANGUAGE.depthScale)=>Math.atan2(y*depth,x);
// A short presentation pulse driven by an actual shot, advanced by the game's
// existing dt. It owns no movement, damage, cooldown, random draw or RAF.
export function createSeedShotPresentation({enabled=false,reducedMotion=false}={}){
 let remaining=0,power=0;
 return {
  pulse(strength=1){if(enabled){remaining=SEED_VISUAL_LANGUAGE.motion.trailSeconds;power=Math.max(0,Math.min(1,strength));}},
  step(dt){if(enabled&&Number.isFinite(dt))remaining=Math.max(0,remaining-Math.max(0,dt));},
  value(){const p=remaining/SEED_VISUAL_LANGUAGE.motion.trailSeconds;return p*power*(reducedMotion?.25:1);},
  reset(){remaining=power=0;}
 };
}
// A contact response from an accepted hit, driven by the existing frame dt.
// It only changes the authored sprite's presentation, never the root/collider.
export function createSeedHurtPresentation({enabled=false,reducedMotion=false}={}){
 const duration=SEED_VISUAL_LANGUAGE.motion.impactSeconds;let remaining=0,strength=0;
 return {
  pulse(amount=1){if(enabled&&Number.isFinite(amount)&&amount>0){remaining=duration;strength=Math.max(.3,Math.min(1,amount));}},
  step(dt){if(enabled&&Number.isFinite(dt)&&dt>0)remaining=Math.max(0,remaining-dt);},
  value(){return remaining/duration*strength*(reducedMotion?.3:1);},
  reset(){remaining=strength=0;}
 };
}

// Keep the seed inside the unobstructed part of the screen. Only translate the
// existing camera when its usual follow would put the body under the HUD/rim.
// No zoom, actor scale, arena or collision changes; no per-frame allocations.
// Alpha>=.08 inventory of162 identities/1296frames, including walk/contact
// deformation, both facings and a1-source-pixel filter guard. Fixed envelope
// avoids zoom/follow pumping when an attack frame changes.
export const JOURNEY_SEED_EDGE_ENVELOPE=Object.freeze({head:2.82,foot:.34,halfWidth:2.32});
const TAN_HALF_FOV=Math.tan(39*Math.PI/360);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function frameJourneySeed(pose,player,width,height,cameraHeight,offsetZ,scale=1.25){
 if(!pose||!player||!Number.isFinite(width)||!Number.isFinite(height)||!Number.isFinite(cameraHeight)||!Number.isFinite(offsetZ)||!Number.isFinite(scale)||!Number.isFinite(pose.zoom)||!Number.isFinite(player.x)||!Number.isFinite(player.z)||width<=0||height<=0||pose.zoom<=0)return pose;
 const distance=Math.hypot(cameraHeight,offsetZ),a=-cameraHeight/distance,b=offsetZ/distance,k=pose.zoom/TAN_HALF_FOV;
 const top=Math.min(height*.3,height<=520?92:156),bottom=Math.min(height*.3,height<=520?112:132),side=Math.min(width*.16,width<=700?36:48);
 const upper=1-2*top/height,lower=-1+2*bottom/height;
 // Billboard height is measured in camera space, with room for a grown hat
 // and the short recoil pose. The title already hides if its own space is short.
 const head=JOURNEY_SEED_EDGE_ENVELOPE.head*scale/1.25,foot=-JOURNEY_SEED_EDGE_ENVELOPE.foot*scale/1.25;
 const minD=(upper*distance-k*head)/(k*a+upper*b),maxD=(lower*distance-k*foot)/(k*a+lower*b);
 const originalD=player.z-pose.z,d=clamp(originalD,minD,maxD);
 if(d!==originalD)pose.z=player.z-d;
 const depth=distance-b*d,halfVisible=depth*TAN_HALF_FOV/pose.zoom*width/height;
 const xMargin=Math.max(0,halfVisible*(1-2*side/width)-JOURNEY_SEED_EDGE_ENVELOPE.halfWidth*scale/1.25);
 pose.x=clamp(pose.x,player.x-xMargin,player.x+xMargin);
 return pose;
}

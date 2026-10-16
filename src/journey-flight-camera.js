import {ACT3_ARENA} from './act3.js';

// Native Journey 3 only. The arena, input plane and boss AI retain their world
// coordinates. A resize fit gives the whole flight corridor a stable screen.
const cache=new Map(),HEIGHT=22,OFFSET_Z=15.5,FOV=39;
const distance=Math.hypot(HEIGHT,OFFSET_Z),cos=HEIGHT/distance,sin=OFFSET_Z/distance,tan=Math.tan(FOV*Math.PI/360);
// Flight paintings rotate around their authored .08 baseline. Include their
// full rotated corners, rather than assuming a centred unrotated square.
const minionRadius=2.48*Math.hypot(.5,.92),wardenRadius=3.55*Math.hypot(.5,.92),bossRadius=4.35*Math.hypot(.5,.92);
const finiteSize=value=>Number.isFinite(Number(value))?Math.max(1,Number(value)):1;

export function journeyFlightCamera(width,height){
 const w=finiteSize(width),h=finiteSize(height),key=w+'x'+h;
 if(cache.has(key))return cache.get(key);
 const top=h<=520?60:80,bottom=h<=520?70:92,side=w<=700?20:36;
 const upper=Math.max(.12,1-2*top/h),lower=Math.max(.12,1-2*bottom/h),horizontal=Math.max(.3,1-2*side/w),aspect=w/h;
 let bestZoom=0,bestLook=.7;
 // Run on resize, never per actor or per frame. One pose includes both the
 // close formations and Johan's sweep, so boss entry does not jerk the scene.
 for(let step=0;step<=160;step++){
  const lookZ=-1.5+step*.025;let zoom=1.2;
  for(const[x,z]of ACT3_ARENA.points){
   const q=z-lookZ,depth=distance-q*sin,y=-q*cos;
   zoom=Math.min(zoom,horizontal*depth*tan*aspect/Math.abs(x),(y>=0?upper:lower)*depth*tan/Math.abs(y));
  }
  // The farthest authored formation entry and the actual z=-1.8 boss lane.
  for(const[z,radius]of[[-6.15,minionRadius],[5.7,minionRadius],[-5.2,wardenRadius],[-1.8,bossRadius]]){
   const q=z-lookZ,depth=distance-q*sin,y=-q*cos;
   zoom=Math.min(zoom,upper*depth*tan/Math.max(.001,y+radius),lower*depth*tan/Math.max(.001,radius-y));
  }
  // The boss can sweep to x=+-6.3. Reserve its full painted wing tips too.
  const bossDepth=distance-(-1.8-lookZ)*sin;
  zoom=Math.min(zoom,horizontal*bossDepth*tan*aspect/(6.3+bossRadius));
  const frontDepth=distance-(5.7-lookZ)*sin;
  zoom=Math.min(zoom,horizontal*frontDepth*tan*aspect/(8+minionRadius));
  if(zoom>bestZoom){bestZoom=zoom;bestLook=lookZ;}
 }
 const result=Object.freeze({height:HEIGHT,offsetZ:OFFSET_Z,lookZ:bestLook,x:0,zoom:Math.max(.01,bestZoom*.995),top,bottom,side});
 if(cache.size>=8)cache.clear();cache.set(key,result);return result;
}

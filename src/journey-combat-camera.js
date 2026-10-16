import {responsiveView} from './responsive-view.js';

// Explore a wide world by moving, never by shrinking its entire map into one
// frame. Use the same angle and responsive zoom as Act1.
const cache=new Map();
export function journeyCombatCamera(width,height,act='skyway',viewLayout=null){
 const w=Number.isFinite(Number(width))?Math.max(1,Number(width)):1,h=Number.isFinite(Number(height))?Math.max(1,Number(height)):1;
 const reference=viewLayout||responsiveView(w,h,h<=520),base=Number.isFinite(reference.zoom)&&reference.zoom>0?reference.zoom:1;
 const key=w+'x'+h+'x'+act+'x'+base;if(cache.has(key))return cache.get(key);
 const pose=Object.freeze({height:19,offsetZ:19,lookZ:0,zoom:base,maxZoom:base*1.038,
  followX:1,followZ:1,leadScale:.35,snapDistance:4.5,biasX:0,biasZ:0,
  top:h<=520?60:80,bottom:h<=520?70:92,side:w<=700?20:36});
 if(cache.size>=12)cache.clear();cache.set(key,pose);return pose;
}

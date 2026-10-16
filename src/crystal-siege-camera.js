// Perspective fit for the real Journey5 movement bounds, not the decorative
// panorama. Run on resize only. Combat, targeting and the touch plane stay put.
const cache=new Map();
export function crystalSiegeCamera(width,height){
 const w=Math.max(1,Number(width)||1),h=Math.max(1,Number(height)||1),key=w+'x'+h;
 if(cache.has(key))return cache.get(key);
 const cameraHeight=22,offsetZ=18,lookZ=.9,distance=Math.hypot(cameraHeight,offsetZ),cos=cameraHeight/distance,sin=offsetZ/distance,tan=Math.tan(39*Math.PI/360),aspect=w/h;
 const top=h<=520?60:80,bottom=h<=520?62:92,side=w<=700?20:36;
 const topNdc=Math.max(.25,1-2*top/h),bottomNdc=Math.max(.25,1-2*bottom/h),sideNdc=Math.max(.4,1-2*side/w);
 let zoom=1.6;
 // Include the real entrance/edge floor and the tops of the six harvest props.
 for(const z of [-7.8,7.8])for(const x of [-8.8,8.8]){
  const q=z-lookZ,depth=distance-q*sin,y=-q*cos;
  zoom=Math.min(zoom,sideNdc*depth*tan*aspect/Math.abs(x),(y>0?topNdc:bottomNdc)*depth*tan/Math.abs(y));
 }
 for(const z of [-4.5,4.5]){
  const q=z-lookZ,y=2.5*sin-q*cos,depth=distance-q*sin-2.5*cos;
  if(y>0)zoom=Math.min(zoom,topNdc*depth*tan/y);
 }
 const result=Object.freeze({height:cameraHeight,offsetZ,lookZ,zoom:Math.max(.48,zoom)});
 if(cache.size>8)cache.clear();cache.set(key,result);return result;
}

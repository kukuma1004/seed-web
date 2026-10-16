// Visual fit for the actual Act4 corridor. It follows sideways through the
// existing camera owner, while the two movement edges stay fixed in view.
// Neither the course, collision bounds nor shared camera motion are changed.
const cache=new Map();
export function crosswindJourneyCamera(width,height,halfDepth=5.4){
 const w=Math.max(1,Number(width)||1),h=Math.max(1,Number(height)||1);
 const bound=Number.isFinite(halfDepth)&&halfDepth>0?halfDepth:5.4,key=w+'x'+h+'x'+bound;
 if(cache.has(key))return cache.get(key);
 const cameraHeight=20,offsetZ=18,lookZ=.1,distance=Math.hypot(cameraHeight,offsetZ),cos=cameraHeight/distance,sin=offsetZ/distance,tan=Math.tan(39*Math.PI/360),aspect=w/h;
 const top=h<=520?70:92,bottom=h<=520?58:82,side=w<=700?22:36;
 const topNdc=Math.max(.22,1-2*top/h),bottomNdc=Math.max(.22,1-2*bottom/h),sideNdc=Math.max(.4,1-2*side/w);
 let zoom=1.6;
 // The actual floor plus the outside stone lip, and a local forward/rear
 // firing view. The full decorative panorama is intentionally absent.
 for(const z of [-bound-.62,bound+.62])for(const x of [-8.2,8.2]){
  const q=z-lookZ,depth=distance-q*sin,y=-q*cos;
  zoom=Math.min(zoom,sideNdc*depth*tan*aspect/Math.abs(x),(y>0?topNdc:bottomNdc)*depth*tan/Math.abs(y));
 }
 // Include a seed/enemy silhouette at the real far movement edge. Camera
 // punch is capped by maxZoom at the host so it cannot crop a movement edge.
 for(const z of [-bound+.4,bound-.4]){
  const q=z-lookZ,y=1.95*sin-q*cos,depth=distance-q*sin-1.95*cos;
  zoom=Math.min(zoom,(y>0?topNdc:bottomNdc)*depth*tan/Math.abs(y));
 }
 // The modern road is narrower than the old boss lane. Keep some of the
 // surrounding garden in frame rather than filling the view with paving.
 if(bound<=5.4)zoom*=.72;
 const result=Object.freeze({height:cameraHeight,offsetZ,lookZ,zoom,maxZoom:zoom,followZ:0,leadScale:0,halfDepth:bound});
 if(cache.size>=12)cache.clear();cache.set(key,result);return result;
}

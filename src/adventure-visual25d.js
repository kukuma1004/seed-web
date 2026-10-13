import {SEED_VISUAL_LANGUAGE,seedVisualEnabled,paintSeedContact} from './seed-visual-language.js';

// Local art study only. All geometry is decorative: no collision or save mutation.
export const adventureVisual25dEnabled=seedVisualEnabled;
export function createAdventureVisual25d(ctx,assets){
 let region=null,props=[],lastMs=0,maxMs=0,frames=0,fadedDecor=0,protectedTargets=[],crowded=false;
 const sun=document.createElement('canvas');sun.width=sun.height=SEED_VISUAL_LANGUAGE.limits.lightStampSize;
 const g=sun.getContext('2d'),light=g.createRadialGradient(90,70,0,128,128,150);
 light.addColorStop(0,SEED_VISUAL_LANGUAGE.colors.gold+'72');light.addColorStop(.4,SEED_VISUAL_LANGUAGE.colors.gold+'28');light.addColorStop(1,SEED_VISUAL_LANGUAGE.colors.gold+'00');g.fillStyle=light;g.fillRect(0,0,256,256);
 function entries(R){
  if(R===region)return props;region=R;props=[];if(!R)return props;
  // Existing perimeter foliage becomes a real middle/foreground layer.
  for(const t of (R.trees||[]).slice(0,64))props.push({...t,type:'visual25d',kind:'plant',size:t.size*1.5});
  // Authored architectural anchors flank each court, outside the travelled centre.
  for(const n of R.nodes.slice(0,14))if(['start','gate','altar'].includes(n.role)){
   props.push({x:n.x-4.1,y:n.y-1.9,size:3.9,cell:2,type:'visual25d',kind:'column'});
   props.push({x:n.x-3.1,y:n.y-1.1,size:2.1,cell:7,type:'visual25d',kind:'plant'});
   if(n.role==='start'){
    props.push({x:n.x-4.7,y:n.y+4.8,size:4.2,cell:7,type:'visual25d',kind:'plant'});
    props.push({x:n.x+7.2,y:n.y+6.2,size:4.0,cell:6,type:'visual25d',kind:'plant'});
    props.push({x:n.x-6.3,y:n.y+1.8,size:3.5,cell:6,type:'visual25d',kind:'plant'});
   }
  }
  return props;
 }
 function ground(v,R){if(!R)return;const x=v.ox+(R.start?.x??v.playerX)*v.scale-4*v.scale,y=v.oy+(R.start?.y??v.playerY)*v.scale*v.depthScale-5*v.scale;
  ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=.42;ctx.drawImage(sun,x-6*v.scale,y-6*v.scale,20*v.scale,18*v.scale);ctx.restore();
 }
 // One bounded screen-space protection list per draw, shared by all foliage.
 // Threats and interactables take priority over the decorative silhouette.
 function beginFrame(s,v){
  protectedTargets.length=0;fadedDecor=0;crowded=false;
  const add=(o,w=1.2,h=1.8)=>{if(!o||!Number.isFinite(o.x+o.y))return;
   const x=v.ox+o.x*v.scale,y=v.oy+o.y*v.scale*v.depthScale;
   if(x+w*v.scale<0||x-w*v.scale>v.width||y<0||y-h*v.scale>v.height)return;
   if(protectedTargets.length>=128){crowded=true;return;}
   protectedTargets.push({left:x-w*v.scale/2,right:x+w*v.scale/2,top:y-h*v.scale,bottom:y+v.scale*.18});
  };
  add(s.player,1.5,2.2);
  for(const e of s.enemies)add(e,e.type==='boss'?3.4:1.5,e.type==='boss'?3.9:1.9);
  for(const o of s.props)add(o,1.4,1.7);
  for(const o of s.pickups)add(o,.85,1.1);
  if(s.region){add(s.region.gate,2.8,2.8);for(const e of s.region.events||[])if(e.state!=='done')add(e,2.6,2.7);}
 }
 function paint(e,v){const im=e.kind==='column'?assets.gardenArchitecture:assets.plants;
  if(!im?.complete||!im.naturalWidth)return;
  const sw=im.naturalWidth/4,sh=im.naturalHeight/3,cell=e.kind==='column'?2:([6,7,6,7][e.cell%4]),sx=cell%4*sw,sy=Math.floor(cell/4)*sh;
  const z=e.size*v.scale,h=z*sh/sw,x=v.ox+e.x*v.scale,y=v.oy+e.y*v.scale*v.depthScale;
  if(x+z<0||x-z>v.width||y<0||y-h>v.height)return;
  const left=x-z*.46,right=x+z*.46,top=y-h*.9,bottom=y+h*.04;
  const covers=crowded||protectedTargets.some(t=>left<t.right&&right>t.left&&top<t.bottom&&bottom>t.top);
  if(covers)fadedDecor++;
  ctx.save();ctx.globalAlpha=covers?.10:1;
  paintSeedContact(ctx,x,y,z*.8);
  ctx.drawImage(im,sx,sy,sw,sh,x-z/2,y-h*.91,z,h);ctx.restore();
 }
 function contact(x,y,size,v){paintSeedContact(ctx,v.ox+x*v.scale,v.oy+y*v.scale*v.depthScale,size*v.scale);}
 function finish(start){lastMs=performance.now()-start;maxMs=Math.max(maxMs,lastMs);frames++;}
 return {entries,ground,beginFrame,paint,contact,finish,inspect:()=>({enabled:true,projection:'screen-aligned elevated: x=ox+x*scale, y=oy+y*scale*0.76',depthScale:SEED_VISUAL_LANGUAGE.depthScale,lastRenderMs:lastMs,maxRenderMs:maxMs,frames,decorativeEntries:props.length,fadedDecor,protectedTargets:protectedTargets.length,crowdedProtection:crowded,stampPixels:65536,extraAsset:'garden-decor-props-v1.webp'}),dispose(){props=[];protectedTargets=[];region=null;sun.width=sun.height=1;}};
}

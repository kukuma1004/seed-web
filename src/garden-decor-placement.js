// Optional furniture arrangement on the central terrace only. No ownership or rewards.
import {DECOR,DECOR_BY_ID,normalizeDecor} from './garden-decor.js';
import {DECOR_PROPS,DECOR_PROP_REGIONS} from './garden-decor-art.js';
const BEDS=[[621/1600,331/900],[1003/1600,325/900],[526/1600,488/900],[1076/1600,486/900],[652/1600,618/900],[952/1600,618/900]];
export const GARDEN_DECOR_VIEW=Object.freeze({u0:.1,u1:.9,v0:.1,v1:.99});
export function movableDecor(list){return normalizeDecor(list).map(id=>{const item=DECOR_BY_ID[id].items.find(i=>i.kind==='prop');return item?{...item,id}:null;}).filter(Boolean);}
const position=(item,positions)=>positions?.[item.id]||item;
const ground=item=>{const [w,h]=DECOR_PROPS[item.tile].footprint;return {w:w*item.size,h:h*item.size*.35};};
// Authored walkable rim/entry path measured on garden-sanctuary-v2; forest and
// waterfall corners stay unavailable. Existing legacy anchors are never relocated.
const TERRACE=[[.38,.30],[.66,.30],[.76,.4],[.81,.53],[.80,.65],[.75,.75],[.66,.82],[.61,.88],[.60,.96],[.40,.96],[.40,.88],[.32,.81],[.24,.70],[.21,.55],[.25,.42],[.34,.33]];
function onTerrace(u,v){let inside=false;for(let i=0,j=TERRACE.length-1;i<TERRACE.length;j=i++){const a=TERRACE[i],b=TERRACE[j];if((a[1]>v)!==(b[1]>v)&&u<(b[0]-a[0])*(v-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
function rootAllowed(item,point){
 if(!point||!Number.isFinite(point.u)||!Number.isFinite(point.v))return false;
 const {u,v}=point;if(u<.14||u>.86||v<.22||v>.96)return false;
 if(!onTerrace(u,v)&&(Math.abs(u-item.u)>.00011||Math.abs(v-item.v)>.00011))return false;
 const f=ground(item);
 for(const [bu,bv] of BEDS)if(Math.abs(u-bu)<.053+f.w/2&&Math.abs(v-bv)<.032+f.h/2)return false;
 if(Math.abs(u-.5)<.076+f.w/2&&Math.abs(v-453/900)<.047+f.h/2)return false;
 if(v<.30&&u>.38&&u<.63)return false;
 return true;
}
export function decorPlacementAllowed(list,positions,id,point){
 const items=movableDecor(list),item=items.find(it=>it.id===id);if(!item||!rootAllowed(item,point))return false;
 const {u,v}=point,f=ground(item);
 for(const other of items){if(other.id===id)continue;const at=position(other,positions),o=ground(other);if(Math.abs(u-at.u)<(f.w+o.w)/2+.006&&Math.abs(v-at.v)<(f.h+o.h)/2+.006)return false;}
 return true;
}
export function normalizeDecorPlacements(value,list){
 const result={};if(!value||typeof value!=='object'||Array.isArray(value))return result;
 const items=movableDecor(list);
 for(const item of items){const p=value[item.id];if(!rootAllowed(item,p))continue;const rounded={u:Math.round(p.u*10000)/10000,v:Math.round(p.v*10000)/10000};if(rootAllowed(item,rounded))result[item.id]=rounded;}
 // Validate the final arrangement together (moving into a vacated default spot is legal).
 // Invalid conflicting overrides fall back together; all catalog defaults are disjoint.
 let changed=true;while(changed){changed=false;const invalid=items.filter(it=>result[it.id]&&!decorPlacementAllowed(list,result,it.id,result[it.id]));for(const it of invalid){delete result[it.id];changed=true;}}
 return result;
}
export function moveDecor(list,positions,id,point){
 const saved=normalizeDecorPlacements(positions,list);if(!decorPlacementAllowed(list,saved,id,point))return {ok:false,positions:saved};
 return {ok:true,positions:{...saved,[id]:{u:Math.round(point.u*10000)/10000,v:Math.round(point.v*10000)/10000}}};
}
export function resetDecorPlacements(list){return Object.fromEntries(movableDecor(list).map(it=>[it.id,{u:it.u,v:it.v}]));}
export function mergeDecorPlacements(list,preferred,other){
 const merged=normalizeDecorPlacements(preferred,list),fallback=normalizeDecorPlacements(other,list);
 for(const it of movableDecor(list)){if(Object.hasOwn(merged,it.id)||!fallback[it.id])continue;if(decorPlacementAllowed(list,merged,it.id,fallback[it.id]))merged[it.id]=fallback[it.id];}
 return merged;
}
// The key is cheap per frame; safety normalization runs only when a key changes.
export function decorLayoutKey(list,positions){return normalizeDecor(list).map(id=>{const p=positions?.[id];return id+(p&&Number.isFinite(p.u)&&Number.isFinite(p.v)?`@${p.u},${p.v}`:'');}).join('|');}
export function gardenDecorLayout(rect,iw=1920,ih=1080){
 const V=GARDEN_DECOR_VIEW,k=Math.min(rect.w/((V.u1-V.u0)*iw),rect.h/((V.v1-V.v0)*ih))*1.0001;
 const ox=rect.x+rect.w/2-(V.u0+V.u1)/2*iw*k,oy=rect.y+rect.h/2-(V.v0+V.v1)/2*ih*k;
 return {k,iw,ih,ox,oy,unit:ih*k*.085,at:(u,v)=>[ox+u*iw*k,oy+v*ih*k],from:(x,y)=>({u:(x-ox)/(iw*k),v:(y-oy)/(ih*k)})};
}
export function hitDecor(list,positions,L,x,y,rect){
 if(rect&&(x<rect.x||x>rect.x+rect.w||y<rect.y||y>rect.y+rect.h))return null;
 const items=movableDecor(list).map(it=>({...it,...position(it,positions)})).sort((a,b)=>b.v-a.v);
 for(const it of items){const [px,py]=L.at(it.u,it.v),r=DECOR_PROP_REGIONS[it.tile],h=it.size*L.unit*(.72+.5*it.v),w=h*(r[2]-r[0])/(r[3]-r[1]);
  if(x>=px-w/2&&x<=px+w/2&&y>=py-h&&y<=py)return it;}
 return null;
}
// Drag uses a preview only. A cancelled/hidden/closed gesture never writes a save.
export function createDecorDrag({getGarden,getLayout,getRect,onCommit=()=>{}}){
 let drag=null;
 return {
  start(pointerId,x,y){if(drag)return false;const g=getGarden(),L=getLayout(),it=hitDecor(g.decor,g.decorPositions,L,x,y,getRect());if(!it)return false;const point=L.from(x,y);drag={pointerId,id:it.id,du:it.u-point.u,dv:it.v-point.v,point:{u:it.u,v:it.v},valid:true};return true;},
  move(pointerId,x,y){if(!drag||drag.pointerId!==pointerId)return false;const p=getLayout().from(x,y),g=getGarden();drag.point={u:p.u+drag.du,v:p.v+drag.dv};drag.valid=decorPlacementAllowed(g.decor,g.decorPositions,drag.id,drag.point);return true;},
  finish(pointerId){if(!drag||drag.pointerId!==pointerId)return false;const d=drag;drag=null;const g=getGarden(),m=moveDecor(g.decor,g.decorPositions,d.id,d.point);if(m.ok)onCommit({...g,decorPositions:m.positions});return m.ok;},
  cancel(){drag=null;},get active(){return drag;},
 };
}

// Small 2D spatial hash for the combat hot path. Enemies live in one cell and
// nearby queries only inspect the handful of cells a hit can actually reach.
export function createSpatialIndex(cellSize=2.5){
 const size=Math.max(.25,Number(cellSize)||2.5),cells=new Map(),order=new Map();
 const cell=v=>Math.floor(v/size),key=(x,z)=>`${x},${z}`;
 function rebuild(items=[]){
  cells.clear();order.clear();
  for(let i=0;i<items.length;i++){
   const item=items[i],p=item?.g?.position||item?.position;if(!p)continue;
   const k=key(cell(p.x),cell(p.z));let bucket=cells.get(k);if(!bucket)cells.set(k,bucket=[]);
   bucket.push(item);order.set(item,i);
  }
  return items.length;
 }
 function queryInto(pos,radius,out=[]){
  out.length=0;const r=Math.max(0,Number(radius)||0),minX=cell(pos.x-r),maxX=cell(pos.x+r),minZ=cell(pos.z-r),maxZ=cell(pos.z+r);
  for(let x=minX;x<=maxX;x++)for(let z=minZ;z<=maxZ;z++){
   const bucket=cells.get(key(x,z));if(bucket)for(const item of bucket){const p=item?.g?.position||item?.position,dx=p.x-pos.x,dz=p.z-pos.z;if(dx*dx+dz*dz<=r*r)out.push(item);}
  }
  if(out.length>1)out.sort((a,b)=>(order.get(a)??0)-(order.get(b)??0));
  return out;
 }
 return {rebuild,queryInto,clear(){cells.clear();order.clear();},state:()=>({cellSize:size,cells:cells.size,items:order.size})};
}

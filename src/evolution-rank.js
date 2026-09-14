export function rankedEvolutions(forms=new Map(),known={},limit=Infinity){
 const entries=forms instanceof Map?[...forms]:Object.entries(forms||{});
 const accepts=typeof known==='function'?known:id=>known instanceof Set?known.has(id):Object.hasOwn(known,id);
 return entries.map(([id,level],order)=>({id,level:Number(level)||0,order})).filter(entry=>entry.level>0&&accepts(entry.id)).sort((a,b)=>b.level-a.level||a.order-b.order).slice(0,limit);
}

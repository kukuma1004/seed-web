// Hand-authored garden topology; RNG only nudges planting beds, never connectivity.
// pathWidth is the corridor HALF-width, matching adventureWalkable's distance rule.
const GARDENS = [
 {theme:'moss-courtyard',w:54,h:38,pathWidth:3.4,
  beds:[[8,19,6.5,'start'],[46,19,6.7,'gate'],[18,10,6.4,'camp'],[32,10,6.4,'ruin'],[27,19,7.6,'raid'],[18,28,6.4,'camp'],[32,28,6.4,'altar'],[44,29,5.8,'hoard'],[44,8,5.8,'ruin']],
  edges:[[0,2],[0,5],[0,4],[2,3],[3,8],[8,1],[1,7],[7,6],[6,5],[5,4],[4,2],[4,3],[4,6],[4,1]],
  landmarks:[{x:27,y:4,kind:'glasshouse',size:3.4},{x:27,y:19,kind:'courtyard-inlay',size:3},{x:8,y:32,kind:'fern-bed',size:2.2}]},
 {theme:'blossom-terrace',w:54,h:38,pathWidth:3.7,
  beds:[[8,28,6.5,'start'],[46,10,6.7,'gate'],[20,29,6.1,'camp'],[34,29,6.1,'ruin'],[44,26,7,'raid'],[8,10,6.2,'altar'],[21,9,6.1,'camp'],[34,9,6.1,'hoard'],[17,19,5.8,'ruin']],
  edges:[[0,2],[2,3],[3,4],[4,1],[1,7],[7,6],[6,5],[5,8],[8,0],[8,2],[8,6],[3,7]],
  landmarks:[{x:25,y:19,kind:'pond',size:2.2},{x:5,y:19,kind:'flower-bed',size:2},{x:46,y:36,kind:'cherry-grove',size:2}]},
 {theme:'moonroot-sanctuary',w:54,h:38,pathWidth:3.6,
  beds:[[8,19,6.5,'start'],[46,19,6.7,'gate'],[27,8,6.1,'altar'],[14,9,6.2,'camp'],[40,9,6.2,'ruin'],[14,29,6.2,'camp'],[40,29,6.2,'hoard'],[27,29,7,'raid'],[27,19,7.6,'ruin']],
  edges:[[0,3],[3,2],[2,4],[4,1],[1,6],[6,7],[7,5],[5,0],[0,8],[8,1],[8,2],[8,7]],
  landmarks:[{x:27,y:19,kind:'moon-inlay',size:3.2},{x:27,y:3,kind:'root-arch',size:2.4},{x:5,y:32,kind:'silver-grove',size:2}]}
];

/** A fresh, JSON-safe layout for zero-based Adventure acts 0..2. */
export function makeAdventureGardenLayout(act,rng=Math.random){
 const garden=GARDENS[Math.min(2,Math.max(0,Math.floor(Number(act)||0)))];
 const nodes=garden.beds.map(([x,y,r,role])=>{
  const dx=(rng()-.5)*.9,dy=(rng()-.5)*.9,radius=r+(rng()-.5)*.2;
  return{x:Math.max(radius+1.4,Math.min(garden.w-radius-1.4,x+dx)),
   y:Math.max(radius+2,Math.min(garden.h-radius-1.6,y+dy)),r:radius,role};
 });
 return {w:garden.w,h:garden.h,start:nodes[0],gateNode:nodes[1],nodes,
  edges:garden.edges.map(edge=>edge.slice()),pathWidth:garden.pathWidth,theme:garden.theme,
  landmarks:garden.landmarks.map(landmark=>({...landmark}))};
}

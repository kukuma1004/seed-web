// Authored scenery, not a new obstacle list. The 28x24 arena and four moving
// roots remain exclusively owned by arbor-journey.js.
const freeze=list=>Object.freeze(list.map(item=>Object.freeze(item)));
const bed=(x,z,w,d,angle=0)=>({x,z,w,d,angle});
// Keep the entire authored crown beyond the playable rectangle, not merely
// its trunk. Use the actual atlas crop so the nearest safe tree stays visible.
const plant=(tile,x,z,height)=>({tile,x:x&&z>=-12?Math.sign(x)*Math.max(Math.abs(x),14.18+height*(tile===6?293/350:335/351)/2):x,z,height});
const prop=(tile,x,z,height)=>({tile,x,z,height});
const patch=(x,z,w,d,angle=0)=>({x,z,w,d,angle});
const frameBeds=freeze([
 bed(-10,-12.95,5,1.7),bed(-4.5,-12.95,4.4,1.7),bed(4.5,-12.95,4.4,1.7),bed(10,-12.95,5,1.7),
 bed(-14.95,-8,1.8,5),bed(-14.95,-2,1.8,5),bed(-14.95,4,1.8,5),bed(-14.95,9,1.8,3),
 bed(14.95,-8,1.8,5),bed(14.95,-2,1.8,5),bed(14.95,4,1.8,5),bed(14.95,9,1.8,3),
 bed(-9,12.95,6,1.7),bed(-3.8,12.95,3.7,1.7),bed(3.8,12.95,3.7,1.7),bed(9,12.95,6,1.7)
]);
const court=(id,name,patches,trees,props,flowerTile)=>Object.freeze({
 id,name,beds:frameBeds,patches:freeze(patches),trees:freeze(trees),props:freeze(props),flowerTile,
 // These flat lawn tongues can be walked over. They draw alternate paths
 // around the real root positions without inventing a raised collision wall.
 passableGround:true,collisionOwned:false
});
export const ARBOR_GARDEN_LAYOUTS=Object.freeze([
 court('threshold','꽃아치의 문턱',[
  patch(-10,0,5.7,17),patch(10,0,5.7,17),patch(-6.5,-9.7,5.5,3.8),patch(6.5,-9.7,5.5,3.8)
 ],[plant(7,-16.2,-11,7.2),plant(6,16.2,-9,6.5),plant(6,-16.2,3,5.5),plant(7,16.2,5,6.2)],
 [prop(2,0,-14.1,5.3),prop(0,-11,-14.3,2.5),prop(10,10,-14.4,2.7)],4),
 court('fork','두 갈래 묘목길',[
  patch(-9.4,-5.9,6.5,10,-.15),patch(9.4,5.9,6.5,10,-.15),patch(-1.4,-10,6.2,3.2),patch(1.4,10,6.2,3.2)
 ],[plant(6,-16.2,-6,6.4),plant(7,16.2,-11,7.4),plant(7,-16.2,7,6.8),plant(6,16.2,5,5.8)],
 [prop(2,-6.5,-14.1,4.9),prop(7,9.5,-14.4,2.7),prop(0,-17,1,2.3)],3),
 court('pool','이슬 샘의 뜰',[
  patch(-9,-7.7,7,6),patch(9,-7.7,7,6),patch(-9,7.7,7,6),patch(9,7.7,7,6),patch(0,0,4.5,3.7)
 ],[plant(7,-16.2,-10,7.6),plant(7,16.2,-10,7.2),plant(6,-16.2,5,5.5),plant(6,16.2,6,5.7)],
 [prop(4,0,-14.7,3.2),prop(1,8.8,-14.1,3.1),prop(5,-9,-14.7,2.7)],5),
 court('stair','덩굴 테라스',[
  patch(-10.4,2.7,4.3,17),patch(9.6,-5.4,6.2,7),patch(-4.5,9.8,8.5,3),patch(4,-10,6,3)
 ],[plant(6,-16.2,-11,7),plant(7,16.2,-5,6.5),plant(7,-16.2,6,6.2),plant(6,16.2,8,5.9)],
 [prop(8,-9,-14.3,3.5),prop(0,9.5,-14.3,2.6),prop(6,0,-16.3,5.8)],4),
 court('crown','거목의 안뜰',[
  patch(-9.5,-8,6.1,5),patch(9.5,-8,6.1,5),patch(-10.3,5.6,4.5,10),patch(10.3,5.6,4.5,10)
 ],[plant(7,0,-18.7,9.2),plant(6,-16.2,-10,7),plant(6,16.2,-10,7),plant(7,-16.2,6,5.8),plant(7,16.2,6,5.8)],
 [prop(9,-8,-14.2,3.2),prop(9,8,-14.2,3.2),prop(1,0,-14.6,2.9)],5)
]);
export const ARBOR_GARDEN_LIMITS=Object.freeze({
 grassTiles:144,lawnPatches:24,beds:16,plants:112,props:4,
 geometries:5,materials:4,textures:3,drawCalls:5,lights:0,raf:0
});

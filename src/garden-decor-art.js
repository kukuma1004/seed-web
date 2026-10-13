// One transparent, painterly prop atlas shared by the 3D and puzzle gardens.
// Row-major tiles; feet sit near the bottom centre of each cell.
export const DECOR_PROP_ART='assets/garden-decor-props-v1.webp';
export const DECOR_PROP_COLUMNS=4;
export const DECOR_PROP_ROWS=3;
export const DECOR_PROP_CELLS=DECOR_PROP_COLUMNS*DECOR_PROP_ROWS;
// Measured source rectangles inside each authored cell. Furniture feet are
// normalized by the renderer, not assumed to land at an identical atlas row.
// The chime top extends into the empty gutter above; pond/bridge stop before it.
export const DECOR_PROP_REGIONS=Object.freeze([
 [.097,.331,.981,.984],[.199,.179,.757,.995],[.064,.113,.984,.995],[.185,.168,.855,1],
 [.077,.262,1,.879],[.099,.182,1,.882],[.122,.028,.904,.940],[.088,.052,.940,.937],
 [.190,-.050,.838,.857],[.118,-.012,.879,.869],[.041,.083,.938,.822],[.149,.130,.960,.828]
].map(r=>Object.freeze(r)));
const prop=(id,name,tile,width,height)=>Object.freeze({id,name,tile,footprint:Object.freeze([width,height])});
// Footprints are conservative normalized backdrop bounds at size 1. They keep
// rigid props away from the six interactive beds and the centre tree.
export const DECOR_PROPS=Object.freeze([
 prop('bench','이끼 돌벤치',0,.095,.07),
 prop('birdbath','새들의 샘',1,.065,.09),
 prop('arch','잎사귀 아치',2,.095,.12),
 prop('mushroomLantern','버섯 등불',3,.06,.08),
 prop('pond','수련 연못',4,.105,.07),
 prop('bridge','작은 나무다리',5,.085,.065),
 prop('gazebo','씨앗 쉼터',6,.095,.13),
 prop('planter','온실 화분대',7,.085,.085),
 prop('chimes','바람 종',8,.055,.09),
 prop('statue','씨앗 조각상',9,.065,.10),
 prop('cart','꽃 수레',10,.09,.10),
 prop('picnic','소풍 바구니',11,.075,.07),
]);
export const DECOR_PROP_BY_ID=Object.freeze(Object.fromEntries(DECOR_PROPS.map(p=>[p.id,p])));

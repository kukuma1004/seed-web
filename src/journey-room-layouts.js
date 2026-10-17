// Native Journey scenery only. These static footprints must be shared by
// presentation, movement and projectile collision; decoration never blocks.
// Course lengths, entry saves, encounter packets and paid siege facilities
// remain owned by the existing engines. No random state is consumed here.
export const JOURNEY_ROOM_LAYOUT_LIMITS=Object.freeze({cover:6,decor:16,cache:80});
const LENGTHS=Object.freeze([48,56,60,64,44]);
const aliases=Object.freeze({3:'skyway',4:'crosswind',5:'crystalGorge',skyway:'skyway',crosswind:'crosswind',crystalGorge:'crystalGorge'});
const freeze=o=>{for(const value of Object.values(o))if(value&&typeof value==='object')freeze(value);return Object.freeze(o);};
const wrap=(value,n)=>Number.isFinite(value)?((Math.floor(value)%n)+n)%n:0;
const cache=new Map();
// [x,z,width,depth,kind]. All footprints are axis aligned, keeping the visible
// low stone/planted rim identical to the real reflector and actor footprint.
const SKY=freeze([
 {name:'나란한 구름섬',motif:'offset-islands',tint:0xe7f0e8,cover:[[-4.4,.4,2.6,1.2,'planter'],[3.7,-1.5,2.6,1.2,'planter'],[-10,4.1,2.2,1.4,'ruin'],[10,-4,2.2,1.4,'ruin']],decor:[[-5.5,5.2,'moss'],[6.2,4.5,'flower-bed'],[-10,-7,'stone-ring'],[10,7,'stone-ring'],[0,0,'leaf-trace']]},
 {name:'엇갈린 공중 유적',motif:'broken-ruins',tint:0xe1e8ec,cover:[[-4.5,2.6,1.3,3.2,'ruin'],[3.7,-.6,3.2,1.2,'ruin'],[-10,-4.3,2.4,1.2,'post'],[10.3,4.3,1.3,2.8,'planter']],decor:[[-9,7,'flower-bed'],[8.5,-7,'moss'],[-3,-1.5,'tile-band'],[3,3,'tile-band'],[0,-3,'stone-ring']]},
 {name:'네 갈래 계류장',motif:'corner-piers',tint:0xe5eee3,cover:[[-4.6,-1.1,1.4,2,'post'],[4.6,1.5,1.4,2,'post'],[-10.4,7.3,3.2,1.1,'ruin'],[10.4,-7.5,3.2,1.1,'ruin']],decor:[[-7,-8.7,'moss'],[7.4,8,'flower-bed'],[-11,-1,'stone-ring'],[11,2,'stone-ring'],[0,1,'leaf-trace']]},
 {name:'쌍아치의 정원',motif:'paired-arches',tint:0xe9eadc,cover:[[-3.7,.6,1.3,2.4,'ruin'],[3.7,.6,1.3,2.4,'ruin'],[-9.5,-3.4,2.9,1.1,'planter'],[10.1,5.7,2.9,1.1,'planter']],decor:[[-5.8,7.5,'flower-bed'],[5.8,-8.5,'moss'],[-.7,1.6,'tile-band'],[.7,-2,'tile-band'],[0,-4.3,'stone-ring']]},
 {name:'폭풍의 갈림 화단',motif:'split-gardens',tint:0xdfe9e7,cover:[[-3.7,-.4,3.4,1.2,'planter'],[3.7,2.3,3.4,1.2,'planter'],[-11.2,3.8,1.2,3,'ruin'],[11.2,-4.5,1.2,3,'ruin']],decor:[[-6.5,-8,'moss'],[6.8,7.7,'flower-bed'],[-10,-8,'stone-ring'],[10,8,'stone-ring'],[0,0,'leaf-trace']]}
]);
// X is a fraction of the existing route, not an extra repeated section. A
// centre corridor at least 3.4 units wide and both outer rows stay traversable.
const WIND=freeze([
 {name:'마주 선 바람 부두',motif:'opposite-piers',tint:0xf1e9d7,cover:[[.22,-5.9,2.4,1.5,'ruin'],[.22,5.9,2.4,1.5,'ruin'],[.65,-3.5,1.4,2.2,'post'],[.65,3.5,1.4,2.2,'post']],decor:[[.1,0,'tile-band'],[.39,-6.5,'flower-bed'],[.48,5.8,'moss'],[.82,0,'leaf-trace']]},
 {name:'엇갈린 잎 정박지',motif:'staggered-bays',tint:0xe8ead9,cover:[[.18,-3.6,1.6,2.1,'planter'],[.42,4.8,3.1,1.1,'ruin'],[.68,-5.9,2.5,1.2,'ruin'],[.82,3.8,1.2,2.1,'post']],decor:[[.12,6.6,'flower-bed'],[.3,0,'tile-band'],[.56,6.7,'moss'],[.78,0,'leaf-trace']]},
 {name:'갈래 기둥 숲',motif:'branch-pillars',tint:0xe5e9d8,cover:[[.24,-3.1,1.4,1.6,'post'],[.24,3.1,1.4,1.6,'post'],[.51,-6.2,3,1.1,'ruin'],[.73,5.9,2.8,1.2,'planter']],decor:[[.12,-6.6,'moss'],[.4,0,'stone-ring'],[.62,0,'tile-band'],[.85,-6.5,'flower-bed']]},
 {name:'두 사선의 꽃길',motif:'split-flowerways',tint:0xeee7d4,cover:[[.17,-5.4,2.6,1.3,'planter'],[.34,3.4,1.5,2,'ruin'],[.59,-3.4,1.5,2,'ruin'],[.8,5.4,2.6,1.3,'planter']],decor:[[.12,0,'tile-band'],[.4,-6.5,'flower-bed'],[.64,6.5,'moss'],[.88,0,'leaf-trace']]},
 {name:'매듭 돌문',motif:'open-gates',tint:0xe7e3d5,cover:[[.26,-3.7,1.3,2.1,'ruin'],[.26,3.7,1.3,2.1,'ruin'],[.68,-6,3,1.1,'planter'],[.68,6,3,1.1,'planter']],decor:[[.12,-6.5,'flower-bed'],[.45,0,'stone-ring'],[.55,6.5,'moss'],[.85,0,'tile-band']]}
]);
// Siege threats approach the heart directly, without general path finding.
// Solid cover therefore lives in the expanded outer patrol ring, outside ALL
// authored ingress-to-heart rays. Paid pads, resource nodes and turret sight
// lines are not replaced or hidden by a free indestructible wall.
const SIEGE=freeze([
 {name:'동서의 수정 회랑',motif:'east-west-henges',tint:0xe6ece4,cover:[[-10.2,-3.2,1.2,2.6,'ruin'],[-10.2,3.2,1.2,2.6,'ruin'],[10.2,-3.2,1.2,2.6,'ruin'],[10.2,3.2,1.2,2.6,'ruin']],decor:[[-6.5,0,'flower-bed'],[6.5,0,'flower-bed'],[-7,-7,'moss'],[7,7,'moss'],[0,-7.1,'stone-ring'],[0,7.1,'stone-ring']]},
 {name:'달빛 온실 뜰',motif:'north-south-beds',tint:0xe3e8ef,cover:[[-3,-8.8,2.6,1.1,'planter'],[3,-8.8,2.6,1.1,'planter'],[-3,8.8,2.6,1.1,'planter'],[3,8.8,2.6,1.1,'planter']],decor:[[-7,-6.2,'moss'],[7,6.2,'moss'],[-7.4,1,'stone-ring'],[7.4,-1,'stone-ring'],[0,-3,'leaf-trace'],[0,3,'leaf-trace']]},
 {name:'네 꽃잎의 유적',motif:'petal-corners',tint:0xece5ed,cover:[[-9,-5.5,1.2,1.4,'post'],[9,-5.5,1.2,1.4,'post'],[-9,5.5,1.2,1.4,'post'],[9,5.5,1.2,1.4,'post']],decor:[[-6.6,1.5,'flower-bed'],[6.6,-1.5,'flower-bed'],[-1.6,-6.2,'tile-band'],[1.6,6.2,'tile-band'],[0,-8,'stone-ring'],[0,8,'stone-ring']]},
 {name:'엇갈린 수정 정박지',motif:'alternating-henges',tint:0xe3eee7,cover:[[-10.3,-.8,1.2,3,'ruin'],[10.3,.8,1.2,3,'ruin'],[-3.8,8.6,2.8,1.1,'planter'],[3.8,-8.6,2.8,1.1,'planter']],decor:[[-6.6,-6,'flower-bed'],[6.6,6,'flower-bed'],[-7,3,'moss'],[7,-3,'moss'],[-1.5,1.4,'leaf-trace'],[1.5,-1.4,'leaf-trace']]},
 {name:'심장을 감싼 돌관',motif:'open-stone-crown',tint:0xe7e8df,cover:[[-10.2,2,1.3,2.8,'ruin'],[10.2,-2,1.3,2.8,'ruin'],[-3,-8.9,2.2,1,'post'],[3,8.9,2.2,1,'post']],decor:[[-6.6,0,'flower-bed'],[6.6,0,'flower-bed'],[-6.5,-6.2,'stone-ring'],[6.5,6.2,'stone-ring'],[0,-2.2,'tile-band'],[0,2.2,'tile-band']]}
]);
const tables={skyway:SKY,crosswind:WIND,crystalGorge:SIEGE};

export function journeyRoomLayout(act,room=0,round=0,{gateRoom=false}={}){
 if(!Object.hasOwn(aliases,act))return null;const region=aliases[act];gateRoom=Boolean(gateRoom&&region==='crosswind');
 const stage=wrap(room,5),lap=wrap(round,5),key=`${region}:${stage}:${lap}${gateRoom?':gate':''}`;
 let layout=cache.get(key);if(layout)return layout;
 const index=(stage+lap)%5,source=tables[region][index],length=region==='crosswind'?(gateRoom?28:LENGTHS[stage]):null;
 const convertX=x=>length===null?x:Math.round(x*length*1000)/1000;
 const cover=source.cover.map(([x,z,w,d,kind],i)=>({id:`journey-${region}-${stage}-${lap}-cover-${i}`,x:convertX(x),z,w,d,h:kind==='post'?1.05:kind==='ruin'?.85:.65,kind,solid:true}));
 const decor=source.decor.map(([x,z,kind],i)=>({id:`journey-${region}-${stage}-${lap}-decor-${i}`,x:convertX(x),z,w:kind==='tile-band'?2.2:kind==='leaf-trace'?1.7:1.3,d:kind==='tile-band'?.5:1.3,kind,solid:false}));
 layout=freeze({act:region,room:stage,round:lap,index,name:source.name,motif:source.motif,tint:source.tint,origin:length===null?'world':'course',courseLength:length,cover,decor});
 cache.set(key,layout);return layout;
}

// The host can reject a packet inside a real cover footprint, including its
// actor radius. Call only on room entry/spawn, rather than creating scenery
// objects during frame updates. Course coordinates are relative to its origin.
export function journeyLayoutBlocksPoint(layout,x,z,radius=0){
 if(!layout||!Number.isFinite(x)||!Number.isFinite(z))return false;
 const r=Number.isFinite(radius)?Math.max(0,radius):0;
 return layout.cover.some(c=>Math.abs(x-c.x)<=c.w/2+r&&Math.abs(z-c.z)<=c.d/2+r);
}

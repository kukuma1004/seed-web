// The server and leaderboard use the actual finite encounter budgets, not a
// truncated kill total. Regression tests compare these with the live engines.
export const JOURNEY_ROOM_CIRCUIT_KILLS=Object.freeze({4:846,5:636});
export const ARBOR_ROOM_CIRCUIT_KILLS=Object.freeze([456,952,1488]);
const outlines=[
 [[0,-7],[4,-9],[24,-9],[28,-7],[28,7],[24,9],[4,9],[0,7]],
 [[0,-2],[8,-9],[20,-9],[28,-2],[28,2],[20,9],[8,9],[0,2]],
 [[0,-8],[10,-8],[14,-5],[18,-8],[28,-8],[28,8],[18,8],[14,5],[10,8],[0,8]],
 [[0,-6],[5,-9],[23,-9],[28,-6],[24,0],[28,6],[23,9],[5,9],[0,6],[4,0]],
 [[0,-7],[6,-7],[6,-9],[22,-9],[22,-7],[28,-7],[28,7],[22,7],[22,9],[6,9],[6,7],[0,7]]
];
export const CROSSWIND_GATE_ARENAS=Object.freeze(outlines.map((points,i)=>Object.freeze({
 id:`crosswind-gate-${i}`,shape:'poly',points:Object.freeze(points.map(p=>Object.freeze(p))),halfWidth:28,halfDepth:9,
 start:Object.freeze({x:4,z:3}),exit:Object.freeze({x:22,z:0,radius:2}),
 spawns:Object.freeze([{x:4,z:-3},{x:14,z:-3},{x:24,z:3},{x:14,z:3}].map(Object.freeze))
})));

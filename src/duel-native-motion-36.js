// Original native regions; anchors come from separate visually identified boot ROIs.
// Sampling density changes only. No source pixels resized, redrawn or alpha-cleared.
const P='final-gravitystake-pierce',G='final-gravitystake-gravity';
const freezeFrames=frames=>Object.freeze(frames.map(Object.freeze));
export const DUEL_NATIVE_MOTION36=Object.freeze({
 [P]:Object.freeze({
  previewOnly:true,artReady:false,
  motionDefects:Object.freeze(['small-native-strike-body180px-device-quality-pending','native-edge-and-final-visual-acceptance-pending']),
  files:Object.freeze(['duel/final-gravitystake-pierce-strikes-v1.webp','duel/final-gravitystake-pierce-reactions-v1.webp']),
  width:1254,height:1254,pixelsPerUnit:180/2.15,
  // First contact and second release both face forward; no backswing remap.
  frames:freezeFrames([
   [0,0,0,627,627,348,511],[0,627,0,627,627,221,512],
   [0,0,627,627,627,327,366],[0,627,627,627,627,220,365],
   [1,0,0,627,627,338,512,220/2.15],[1,627,0,627,627,224,512,220/2.15],
   [1,0,627,627,627,336,436,220/2.15],[1,627,627,627,627,304,428,220/2.15],
  ]),
  portrait:Object.freeze({file:0,box:Object.freeze([260,315,220,210])}),
 }),
 [G]:Object.freeze({
  previewOnly:true,artReady:false,
  motionDefects:Object.freeze(['heavy-release-gutter87px-below15percent-ideal','native-edge-and-final-visual-device-acceptance-pending']),
  files:Object.freeze(['duel/final-gravitystake-gravity-strikes-v1.webp','duel/final-gravitystake-gravity-reactions-v1.webp']),
  width:1254,height:1254,pixelsPerUnit:250/2.15,
  // Lower row uses the actual empty separator at x700, not a clipped x627 grid.
  frames:freezeFrames([
   [0,0,0,627,627,358,522],[0,627,0,627,627,264,520],
   [0,0,627,700,627,360,418],[0,700,627,554,627,202,410],
   [1,0,0,627,627,348,512,270/2.15],[1,627,0,627,627,259,516,270/2.15],
   [1,0,627,627,627,336,474,270/2.15],[1,627,627,627,627,288,474,270/2.15],
  ]),
  portrait:Object.freeze({file:0,box:Object.freeze([245,260,300,285])}),
 }),
});

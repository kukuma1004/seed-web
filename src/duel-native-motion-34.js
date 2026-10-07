// Original native sprite pixels; no synthetic recoloring or alpha repairs.
// Actual authored regions and boot pivots. Inspection only; quality/device QA pending.
const R='final-frostkaleidoscope-reflect',F='final-frostkaleidoscope-frost';
const freezeFrames=frames=>Object.freeze(frames.map(Object.freeze));
export const DUEL_NATIVE_MOTION34=Object.freeze({
 [R]:Object.freeze({
  previewOnly:true,artReady:false,
  files:Object.freeze(['duel/final-frostkaleidoscope-reflect-strikes-v1.webp','duel/final-frostkaleidoscope-reflect-reactions-v1.webp']),
  width:1254,height:1254,pixelsPerUnit:300/2.15,
  // Anchor means both boot sole centers, excluding the low blue stamp weapon.
  // Reactions are natively smaller; per-pose source density avoids pixel edits.
  frames:freezeFrames([
   [0,0,0,627,627,346,532],[0,627,0,627,627,275,532],
   [0,0,627,627,627,352,457],[0,627,627,627,627,294,455],
   [1,0,0,627,627,360,508,270/2.15],[1,627,0,627,627,240,505,270/2.15],
   [1,0,627,627,627,356,442,270/2.15],[1,627,627,627,627,368,432,270/2.15],
  ]),
  portrait:Object.freeze({file:0,box:Object.freeze([205,215,300,320])}),
 }),
 [F]:Object.freeze({
  previewOnly:true,artReady:false,
  files:Object.freeze(['duel/final-frostkaleidoscope-frost-strikes-v1.webp','duel/final-frostkaleidoscope-frost-reactions-v1.webp']),
  width:1254,height:1254,pixelsPerUnit:345/2.15,
  // Raised fan is a weapon, not the character's head height or ground anchor.
  frames:freezeFrames([
   [0,0,0,627,627,342,546],[0,627,0,627,627,292,554],
   [0,0,627,627,627,344,462],[0,627,627,627,627,252,462],
   [1,0,0,627,627,340,520,270/2.15],[1,627,0,627,627,269,522,270/2.15],
   [1,0,627,627,627,350,456,270/2.15],[1,627,627,627,627,350,452,270/2.15],
  ]),
  portrait:Object.freeze({file:0,box:Object.freeze([205,190,300,360])}),
 }),
});

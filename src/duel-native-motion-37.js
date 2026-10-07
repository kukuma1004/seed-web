// Eight authored native action poses per original icicle branch. Inspection only.
// Density/regions do not resize, repaint, recolor or clear source pixels.
const P='final-icicle-pierce',F='final-icicle-frost';
const freezeFrames=frames=>Object.freeze(frames.map(Object.freeze));
export const DUEL_NATIVE_MOTION37=Object.freeze({
 [P]:Object.freeze({
  previewOnly:true,artReady:false,
  motionDefects:Object.freeze(['visible-cyan-white-native-edge-fringe','native-gutters35px-min-below15percent-ideal','final-browser-device-acceptance-pending']),
  files:Object.freeze(['duel/final-icicle-pierce-strikes-v1.webp','duel/final-icicle-pierce-reactions-v1.webp']),
  width:1254,height:1254,pixelsPerUnit:380/2.15,
  // Forward contact, open-back-hand release, then deep low thrust; no backswing remap.
  // The lower row follows the actual empty divider at x687.
  frames:freezeFrames([
   [0,0,0,627,627,342,530],[0,627,0,627,627,252,528],
   [0,0,627,687,627,300,490],[0,687,627,567,627,198,488],
   [1,0,0,627,627,328,570,350/2.15],[1,627,0,627,627,246,569,350/2.15],
   [1,0,627,627,627,334,488,350/2.15],[1,627,627,627,627,336,488,350/2.15],
  ]),
  portrait:Object.freeze({file:0,box:Object.freeze([195,130,370,415])}),
 }),
 [F]:Object.freeze({
  previewOnly:true,artReady:false,
  motionDefects:Object.freeze(['visible-white-native-paddle-edge-fringe','native-gutters30px-min-below15percent-ideal','final-browser-device-acceptance-pending']),
  files:Object.freeze(['duel/final-icicle-frost-strikes-v1.webp','duel/final-icicle-frost-reactions-v1.webp']),
  width:1254,height:1254,pixelsPerUnit:370/2.15,
  // Waist push, ground-low sweep and upward sweep are genuinely different poses.
  // Lower row divider x656 retains the entire low-sweep paddle without pixel edits.
  frames:freezeFrames([
   [0,0,0,627,627,318,566],[0,627,0,627,627,238,565],
   [0,0,627,656,627,254,486],[0,656,627,598,627,258,504],
   [1,0,0,627,627,324,578,330/2.15],[1,627,0,627,627,226,580,330/2.15],
   [1,0,627,627,627,324,498,330/2.15],[1,627,627,627,627,282,498,330/2.15],
  ]),
  portrait:Object.freeze({file:0,box:Object.freeze([95,180,470,405])}),
 }),
});

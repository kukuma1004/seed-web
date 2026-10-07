// Authored cold-well Seed sprites; source RGBA untouched, no visual approval.
const G='final-coldwell-gravity',F='final-coldwell-frost';
const freezeFrames=frames=>Object.freeze(frames.map(Object.freeze));
export const DUEL_NATIVE_MOTION41=Object.freeze({
 [G]:Object.freeze({
  previewOnly:true,artReady:false,
  motionDefects:Object.freeze(['native-gutter67px-below110px-target','native-gutter67px-below15percent-ideal','cross-sheet-source-body-density-varies','low-alpha-blue-rgb-rim-compositing-acceptance-pending','final-device-quality-pending']),
  files:Object.freeze(['duel/final-coldwell-gravity-strikes-v1.webp','duel/final-coldwell-gravity-reactions-v1.webp']),
  width:1254,height:1254,pixelsPerUnit:250/2.15,
  // Hook club poses contact forward, upward, then low. The fixed inward zone
  // and centre cooling are real combat effects, not baked graphics.
  // Initial square reactions selected; non-square correction worsened gutter.
  frames:freezeFrames([
   [0,0,0,627,627,340,530],[0,627,0,627,627,266,530],
   [0,0,627,627,627,332,472],[0,627,627,627,627,264,471],
   [1,0,0,627,627,366,554,300/2.15],[1,627,0,627,627,240,558,300/2.15],
   [1,0,627,627,627,346,501,300/2.15],[1,627,627,627,627,261,500,300/2.15],
  ]),
  portrait:Object.freeze({file:0,box:Object.freeze([230,273,205,270])}),
 }),
 [F]:Object.freeze({
  previewOnly:true,artReady:false,
  motionDefects:Object.freeze(['native-gutter85px-below110px-target','native-gutter85px-below15percent-ideal','cross-sheet-source-body-density-varies','natural-rgb-edge-compositing-acceptance-pending','final-device-quality-pending']),
  files:Object.freeze(['duel/final-coldwell-frost-strikes-v1.webp','duel/final-coldwell-frost-reactions-v1.webp']),
  width:1254,height:1254,pixelsPerUnit:260/2.15,
  // Thin billhook + drooping crocus silhouette; no gameplay freeze effect baked.
  // Contact1 forward,2 raised,3 low; heavy charge and release separately drawn.
  frames:freezeFrames([
   [0,0,0,627,627,342,507],[0,627,0,627,627,287,506],
   [0,0,627,627,627,342,468],[0,627,627,627,627,284,468],
   [1,0,0,627,627,396,534,310/2.15],[1,627,0,627,627,248,540,310/2.15],
   [1,0,627,627,627,380,450,310/2.15],[1,627,627,627,627,262,450,310/2.15],
  ]),
  portrait:Object.freeze({file:0,box:Object.freeze([245,235,190,285])}),
 }),
});

// Original frost-net Seed sprites. Source pixels unchanged; final acceptance held.
const C='final-frostnet-chain',F='final-frostnet-frost';
const freezeFrames=frames=>Object.freeze(frames.map(Object.freeze));
export const DUEL_NATIVE_MOTION43=Object.freeze({
 [C]:Object.freeze({
  previewOnly:true,artReady:false,
  motionDefects:Object.freeze(['native-gutter103px-below110px-target','source-body320px-vs175px-cross-sheet-density','low-alpha-rgb-edge-diagnostic-device-acceptance-pending','final-device-quality-pending']),
  files:Object.freeze(['duel/final-frostnet-chain-strikes-v1.webp','duel/final-frostnet-chain-reactions-v1.webp']),
  width:1254,height:1254,pixelsPerUnit:320/2.15,
  // Narrow upright silver-green pine-bud hood + short twig/single-crystal baton.
  // Real terminal-crystal gameplay cues remain separate from authored sprites.
  // Bounded reaction correction shrank too far; original is retained in artifacts.
  frames:freezeFrames([
   [0,0,0,627,627,326,521],[0,627,0,627,627,287,520],
   [0,0,627,627,627,341,464],[0,627,627,627,627,268,458],
   [1,0,0,627,627,371,452,175/2.15],[1,627,0,627,627,292,452,175/2.15],
   [1,0,627,627,627,366,479,175/2.15],[1,627,627,627,627,290,479,175/2.15],
  ]),
  portrait:Object.freeze({file:0,box:Object.freeze([230,195,175,330])}),
 }),
 [F]:Object.freeze({
  previewOnly:true,artReady:false,
  motionDefects:Object.freeze(['native-gutter69px-below110px-target','native-gutter69px-below15percent-ideal','cross-sheet-source-body-density-varies','low-alpha-rgb-edge-diagnostic-device-acceptance-pending','final-device-quality-pending']),
  files:Object.freeze(['duel/final-frostnet-frost-strikes-v1.webp','duel/final-frostnet-frost-reactions-v1.webp']),
  width:1254,height:1254,pixelsPerUnit:295/2.15,
  // Low-wide sideways fern fan, paired yellow buds, broad oval leaf paddle.
  // Delayed same-beat mark/single-real-target effects are not baked in source.
  frames:freezeFrames([
   [0,0,0,627,627,362,534],[0,627,0,627,627,266,536],
   [0,0,627,627,627,362,470],[0,627,627,627,627,269,470],
   [1,0,0,627,627,384,530,275/2.15],[1,627,0,627,627,248,531,275/2.15],
   [1,0,627,627,627,386,456,275/2.15],[1,627,627,627,627,284,458,275/2.15],
  ]),
  portrait:Object.freeze({file:0,box:Object.freeze([205,235,230,305])}),
 }),
});

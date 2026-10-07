// Original storm-anchor Seed sprites; RGBA untouched, visual acceptance held.
const G='final-stormanchor-gravity',C='final-stormanchor-chain';
const freezeFrames=frames=>Object.freeze(frames.map(Object.freeze));
export const DUEL_NATIVE_MOTION42=Object.freeze({
 [G]:Object.freeze({
  previewOnly:true,artReady:false,
  motionDefects:Object.freeze(['native-gutter91px-below110px-target','native-gutter91px-below15percent-ideal','cross-sheet-source-body-density-varies','low-alpha-rgb-edge-diagnostic-device-acceptance-pending','final-device-quality-pending']),
  files:Object.freeze(['duel/final-stormanchor-gravity-strikes-v1.webp','duel/final-stormanchor-gravity-reactions-v1.webp']),
  width:1254,height:1254,pixelsPerUnit:235/2.15,
  // Angular olive/ochre leaf scaffold hood, short twig frame around pale pebble.
  // Real selected-enemy triangle centre comes from combat, not baked beams.
  frames:freezeFrames([
   [0,0,0,627,627,338,504],[0,627,0,627,627,271,505],
   [0,0,627,627,627,335,472],[0,627,627,627,627,280,472],
   [1,0,0,627,627,340,530,265/2.15],[1,627,0,627,627,252,534,265/2.15],
   [1,0,627,627,627,336,486,265/2.15],[1,627,627,627,627,258,488,265/2.15],
  ]),
  portrait:Object.freeze({file:0,box:Object.freeze([250,260,155,250])}),
 }),
 [C]:Object.freeze({
  previewOnly:true,artReady:false,
  motionDefects:Object.freeze(['native-gutter79px-below110px-target','native-gutter79px-below15percent-ideal','cross-sheet-source-body-density-varies','low-alpha-rgb-edge-diagnostic-device-acceptance-pending','final-device-quality-pending']),
  files:Object.freeze(['duel/final-stormanchor-chain-strikes-v1.webp','duel/final-stormanchor-chain-reactions-v1.webp']),
  width:1254,height:1254,pixelsPerUnit:230/2.15,
  // Broad curled teal/ivory lily cup + single reed tassel and narrow leaf baton.
  // Each well exists only on the next real target; no persistent trail baked.
  frames:freezeFrames([
   [0,0,0,627,627,332,440],[0,627,0,627,627,254,438],
   [0,0,627,627,627,334,477],[0,627,627,627,627,262,474],
   [1,0,0,627,627,393,523,235/2.15],[1,627,0,627,627,238,532,235/2.15],
   [1,0,627,627,627,372,474,235/2.15],[1,627,627,627,627,260,475,235/2.15],
  ]),
  portrait:Object.freeze({file:0,box:Object.freeze([230,205,175,245])}),
 }),
});

// Original native62 sheets. Unsafe whole sheets are review-only; no repaired crops.
const freezeFrames=fs=>Object.freeze(fs.map(Object.freeze));
export const DUEL_NATIVE_MOTION62=Object.freeze({
 'twin-tidering':Object.freeze({
  comboId:'tidering',previewOnly:true,artReady:false,runtimeSafe:true,wholeSourceReviewOnly:false,
  motionDefects:Object.freeze(["actual-root-screen-review-pending", "body-choreography-and-cap-identity-review-held", "sole-tool-occlusion-review-held", "back-shoulder partial-back charge request not fully achieved", "hurt has raised kicked boot rather than one-knee forward hunch", "leaf release appears just off hand: animation continuity/hand ownership needs actual runtime review"]),
  files:Object.freeze(['duel/twin-tidering-motions-v1.webp']),
  width:1536,height:1024,pixelsPerUnit:204/2.15,
  // Native scoped crown-to-sole/2.15; one PPU, no per-frame rescale.
  frames:freezeFrames([[0, 0, 0, 384, 512, 200, 406], [0, 384, 0, 384, 512, 206, 410], [0, 768, 0, 384, 512, 183, 410], [0, 1152, 0, 384, 512, 176, 409], [0, 0, 512, 384, 512, 178, 340], [0, 384, 512, 384, 512, 225, 342], [0, 768, 512, 384, 512, 201, 347], [0, 1152, 512, 384, 512, 196, 339]]),
  portrait:Object.freeze({file:0,box:Object.freeze([104, 202, 174, 210])}),
 }),
 'twin-meteorspear':Object.freeze({
  comboId:'meteorspear',previewOnly:true,artReady:false,runtimeSafe:false,wholeSourceReviewOnly:true,
  motionDefects:Object.freeze(["actual-root-screen-review-pending", "body-choreography-and-cap-identity-review-held", "sole-tool-occlusion-review-held", "native-alpha16-cell-crossing-runtime-withheld", "correction still crosses strike2/strike3 native cells; whole-source review only, no cropped runtime", "pole silhouette includes double-ended tip in strike3 though single arrow-head/tail authored", "charge/hurt/side-fold materially differ from spearhalo but full back-shoulder acceptance pending"]),
  files:Object.freeze(['duel/twin-meteorspear-motions-v1.webp']),
  width:1536,height:1024,pixelsPerUnit:209/2.15,
  // Native scoped crown-to-sole/2.15; one PPU, no per-frame rescale.
  frames:freezeFrames([]),
  portrait:Object.freeze({file:0,box:Object.freeze([58, 204, 290, 211])}),
 }),
});

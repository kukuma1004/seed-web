// Separate whole-sheet Gravity56v2 recovery; never rewrites historical v1.
const freezeFrames=fs=>Object.freeze(fs.map(Object.freeze));
export const DUEL_NATIVE_MOTION56_V2=Object.freeze({
 'twin-gravitybloom':Object.freeze({
  comboId:'gravitybloom',version:2,previewOnly:true,recoveryReviewOnly:true,promotionReady:false,artReady:false,
  runtimeSafe:true,wholeSourceReviewOnly:false,
  motionDefects:Object.freeze(["native-gutter51px-below95px-minimum", "native-subject-width259px-exceeds185px-target", "native-subject-height274px-exceeds205px-target", "source-anatomy-estimate210px-above150px-target", "sewn-cream-dot-identity-pending", "whole-body-choreography-browser-acceptance-pending", "shared-anatomy-density-real-screen-pending", "low-alpha-device-acceptance-pending", "final-browser-device-quality-pending"]),
  files:Object.freeze(['duel/twin-gravitybloom-motions-v2.webp']),
  width:1536,height:1024,pixelsPerUnit:212/2.15,
  // A single source PPU for all original cells, no per-pose scale compensation.
  frames:freezeFrames([[0, 0, 0, 384, 512, 209, 418], [0, 384, 0, 384, 512, 214, 416], [0, 768, 0, 384, 512, 186, 420], [0, 1152, 0, 384, 512, 176, 414], [0, 0, 512, 384, 512, 233, 342], [0, 384, 512, 384, 512, 182, 343], [0, 768, 512, 384, 512, 182, 353], [0, 1152, 512, 384, 512, 230, 336]]),
  portrait:Object.freeze({file:0,box:Object.freeze([120, 207, 174, 212])}),
 }),
});

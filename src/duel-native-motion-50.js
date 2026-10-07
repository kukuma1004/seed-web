// Whole native eight-pose atlases; measured size/margin acceptance held.
const freezeFrames=frames=>Object.freeze(frames.map(Object.freeze));
export const DUEL_NATIVE_MOTION50=Object.freeze({
 'twin-lightningmirror':Object.freeze({
  comboId:'lightningmirror',previewOnly:true,artReady:false,
  motionDefects:Object.freeze(["native-gutter59px-below95px-minimum", "native-gutter59px-below110px-aspirational", "source-anatomy-estimate180px-above155px-target", "native-idle-full-pose210px-height", "native-subject-span212px-above185px-correction-request", "same-sheet-anatomical-density-real-screen-pending", "low-alpha-rgb-edge-diagnostic-device-acceptance-pending", "final-device-quality-pending"]),
  files:Object.freeze(['duel/twin-lightningmirror-motions-v1.webp']),
  width:1536,height:1024,pixelsPerUnit:210/2.15,
  // Common physical pixel scale for all8; no per-frame size compensation.
  frames:freezeFrames([[0, 0, 0, 384, 512, 208, 391], [0, 384, 0, 384, 512, 184, 390], [0, 768, 0, 384, 512, 192, 390], [0, 1152, 0, 384, 512, 178, 391], [0, 0, 512, 384, 512, 203, 341], [0, 384, 512, 384, 512, 178, 340], [0, 768, 512, 384, 512, 202, 341], [0, 1152, 512, 384, 512, 222, 342]]),
  portrait:Object.freeze({file:0,box:Object.freeze([130, 184, 150, 210])}),
 }),
 'twin-glassmaze':Object.freeze({
  comboId:'glassmaze',previewOnly:true,artReady:false,
  motionDefects:Object.freeze(["native-gutter31px-below95px-minimum", "native-gutter31px-below110px-aspirational", "source-anatomy-estimate230px-above155px-target", "native-idle-full-pose232px-height", "native-subject-span257px-above185px-correction-request", "same-sheet-anatomical-density-real-screen-pending", "low-alpha-rgb-edge-diagnostic-device-acceptance-pending", "final-device-quality-pending"]),
  files:Object.freeze(['duel/twin-glassmaze-motions-v1.webp']),
  width:1536,height:1024,pixelsPerUnit:232/2.15,
  // Common physical pixel scale for all8; no per-frame size compensation.
  frames:freezeFrames([[0, 0, 0, 384, 512, 190, 434], [0, 384, 0, 384, 512, 190, 432], [0, 768, 0, 384, 512, 180, 432], [0, 1152, 0, 384, 512, 209, 433], [0, 0, 512, 384, 512, 176, 361], [0, 384, 512, 384, 512, 172, 362], [0, 768, 512, 384, 512, 194, 362], [0, 1152, 512, 384, 512, 198, 360]]),
  portrait:Object.freeze({file:0,box:Object.freeze([111, 204, 164, 232])}),
 }),
});

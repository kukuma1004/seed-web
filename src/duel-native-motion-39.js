// Authored conductive-links and straight-two-pass native sprites; no visual approval.
// Original full-sheet pixels remain untouched; frames use measured native boot anchors.
const C='final-thunderlance-chain',R='final-returnblade-pierce';
const freezeFrames=frames=>Object.freeze(frames.map(Object.freeze));
export const DUEL_NATIVE_MOTION39=Object.freeze({
 [C]:Object.freeze({
  previewOnly:true,artReady:false,
  motionDefects:Object.freeze(['native-gutter65px-below15percent-ideal','jointed-rod-segment-count-varies-between-contact-poses','low-alpha-colored-rgb-rim-browser-compositing-acceptance-pending','source-body-density-varies-per-sheet','final-device-quality-pending']),
  files:Object.freeze(['duel/final-thunderlance-chain-strikes-v1.webp','duel/final-thunderlance-chain-reactions-v1.webp']),
  width:1254,height:1254,pixelsPerUnit:380/2.15,
  // Hit1 is a forward planted contact, hit2 upward, hit3 low contact.
  // The real empty strike row separator is y638. Reactions retain initial source.
  frames:freezeFrames([
   [0,0,0,627,638,319,568],[0,627,0,627,638,238,567],
   [0,0,638,627,616,285,482],[0,627,638,627,616,228,506],
   [1,0,0,627,627,349,558,260/2.15],[1,627,0,627,627,209,559,260/2.15],
   [1,0,627,627,627,352,454,260/2.15],[1,627,627,627,627,236,492,260/2.15],
  ]),
  portrait:Object.freeze({file:0,box:Object.freeze([165,180,265,400])}),
 }),
 [R]:Object.freeze({
  previewOnly:true,artReady:false,
  motionDefects:Object.freeze(['native-gutter54px-below15percent-ideal','low-alpha-colored-rgb-rim-browser-compositing-acceptance-pending','source-body-density-varies-per-sheet','final-device-quality-pending']),
  files:Object.freeze(['duel/final-returnblade-pierce-strikes-v1.webp','duel/final-returnblade-pierce-reactions-v1.webp']),
  width:1254,height:1254,pixelsPerUnit:260/2.15,
  // One broad leaf spear; the return behavior is combat logic, never baked beams.
  // Hit1 is direct forward contact, hit2 raised contact, hit3 a low planted thrust.
  frames:freezeFrames([
   [0,0,0,627,627,344,536],[0,627,0,627,627,228,536],
   [0,0,627,627,627,340,442],[0,627,627,627,627,257,439],
   [1,0,0,627,627,396,570,210/2.15],[1,627,0,627,627,219,568,210/2.15],
   [1,0,627,627,627,372,408,210/2.15],[1,627,627,627,627,239,406,210/2.15],
  ]),
  portrait:Object.freeze({file:0,box:Object.freeze([225,270,205,280])}),
 }),
});

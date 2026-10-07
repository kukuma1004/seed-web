// Original native regions and visually identified boot anchors.
// Candidate only: all eight authored actions exist; final quality/device QA pending.
const R='final-echolane-reflect',C='final-echolane-recall';
const freezeFrames=frames=>Object.freeze(frames.map(Object.freeze));
export const DUEL_NATIVE_MOTION35=Object.freeze({
 [R]:Object.freeze({
  previewOnly:true,artReady:false,
  motionDefects:Object.freeze(['throw3-disc-gutter53px-below15percent-ideal','final-visual-device-acceptance-pending']),
  files:Object.freeze(['duel/final-echolane-reflect-strikes-v1.webp','duel/final-echolane-reflect-reactions-v1.webp']),
  width:1254,height:1254,pixelsPerUnit:300/2.15,
  // Copper weapon rim must never be mistaken for brown boot soles.
  // Pose1 is authored forward contact, not a backswing requiring remapping.
  frames:freezeFrames([
   [0,0,0,627,627,348,534],[0,627,0,627,627,268,540],
   [0,0,627,627,627,360,467],[0,627,627,627,627,256,466],
   [1,0,0,627,627,335,536],[1,627,0,627,627,224,542],
   [1,0,627,627,627,344,461],[1,627,627,627,627,345,462],
  ]),
  portrait:Object.freeze({file:0,box:Object.freeze([215,230,300,320])}),
 }),
 [C]:Object.freeze({
  previewOnly:true,artReady:false,
  motionDefects:Object.freeze(['gutter90px-below15percent-ideal','native-edge-and-final-device-acceptance-pending']),
  files:Object.freeze(['duel/final-echolane-recall-strikes-v1.webp','duel/final-echolane-recall-reactions-v1.webp']),
  width:1254,height:1254,pixelsPerUnit:300/2.15,
  // Smaller native reaction figures use sampling density only; pixels unchanged.
  frames:freezeFrames([
   [0,0,0,627,627,357,528],[0,627,0,627,627,299,530],
   [0,0,627,627,627,388,451],[0,627,627,627,627,237,450],
   [1,0,0,627,627,354,522,270/2.15],[1,627,0,627,627,214,524,270/2.15],
   [1,0,627,627,627,356,456,270/2.15],[1,627,627,627,627,361,446,270/2.15],
  ]),
  portrait:Object.freeze({file:0,box:Object.freeze([200,220,350,320])}),
 }),
});

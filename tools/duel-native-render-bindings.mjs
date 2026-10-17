import {createSeedCanvasPaint} from '../src/seed-canvas-presentation.js';
import {DUEL_ORDER} from '../src/seed-duel-rules.js';

// Native-art tests execute the shipping body as a VM slice. Supply its actual
// imported dependencies; review:false must retain exact baseline draw commands.
export function duelNativeRenderBindings(DUEL_NATIVE_MOTION,nativeMotionReady){
 return {DUEL_NATIVE_MOTION,nativeMotionReady,NEW_DUEL:DUEL_ORDER.slice(9,22),released:false,spritePaint:createSeedCanvasPaint({review:false})};
}

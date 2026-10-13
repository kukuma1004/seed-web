import {createSeedCanvasPaint} from '../src/seed-canvas-presentation.js';

// Native-art tests execute the shipping body as a VM slice. Supply its actual
// imported dependencies; review:false must retain exact baseline draw commands.
export function duelNativeRenderBindings(DUEL_NATIVE_MOTION,nativeMotionReady){
 return {DUEL_NATIVE_MOTION,nativeMotionReady,released:false,spritePaint:createSeedCanvasPaint({review:false})};
}

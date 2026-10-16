import {journeyCombatCamera} from './journey-combat-camera.js';
// Keep halfDepth for callers; lane width cannot shrink the player.
export const crosswindJourneyCamera=(width,height,halfDepth=5.4,viewLayout=null)=>journeyCombatCamera(width,height,'crosswind',viewLayout);

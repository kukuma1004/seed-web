import {journeyCombatCamera} from './journey-combat-camera.js';
// Follow the seed; distant wing tips cannot shrink the entire flight corridor.
export const journeyFlightCamera=(width,height,viewLayout=null)=>journeyCombatCamera(width,height,'skyway',viewLayout);

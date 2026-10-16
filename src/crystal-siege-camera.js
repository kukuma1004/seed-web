import {journeyCombatCamera} from './journey-combat-camera.js';
// Follow during harvest, defense and boss combat; reveal the garden by moving.
export const crystalSiegeCamera=(width,height,viewLayout=null)=>journeyCombatCamera(width,height,'crystalGorge',viewLayout);

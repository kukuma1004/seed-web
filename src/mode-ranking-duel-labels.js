// Load only for the duel ranking. Authored combat remains the name authority.
import {DUEL_CHARACTERS} from './seed-duel-rules.js';

export const duelCharacterName=id=>DUEL_CHARACTERS[id]?.name||'씨앗';

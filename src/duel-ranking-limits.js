import {DUEL_STORY_STAGE_COUNT} from './seed-duel-story-progress.js';

// Final recipe IDs can exceed the old20-character field. Preserve stable IDs
// and the existing score/path; adding encounters must not strand their records.
export const DUEL_RANK_LIMITS=Object.freeze({character:48,score:DUEL_STORY_STAGE_COUNT*100_000+23_300});

// Which room slot becomes the star garden on each journey.
// Journey 1 puts it in the second room so it shows up early; after that it alternates
// with the third room. It never replaces the fourth room, where the elite warden fights: a star with an elite was too hard.
// Only stage and cycle decide this, so a saved run reopens the same room without new save fields.
export const STAR_STAGES=Object.freeze([1,2]);
export function starStage(cycle=0){return STAR_STAGES[((cycle%2)+2)%2];}
export function isStarRoom(stage,cycle=0){return stage===starStage(cycle);}

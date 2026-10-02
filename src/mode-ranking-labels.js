// Read names from the same catalogs as combat; do not maintain a second roster.
import {DUEL_CHARACTERS} from './seed-duel-rules.js';
import {ATTACK_SHAPES} from './seed-adventure-attacks.js';
import {DEFENSE_FORMS} from './seed-defense-catalog.js';
import {LAWS} from './laws.js';

export const duelCharacterName=id=>DUEL_CHARACTERS[id]?.name||'씨앗';
export function adventureBuildLabels(entry){
 const laws=String(entry.laws||'').split(',').map(id=>LAWS[id]?.name).filter(Boolean);
 return {weapon:ATTACK_SHAPES[entry.weapon]?.name||'미정',laws:laws.join(' · ')||'법칙 없음',form:DEFENSE_FORMS[entry.form]?.name||'기본형'};
}

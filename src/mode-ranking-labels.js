// Adventure rankings use their own catalogs without loading duel combat.
import {ATTACK_SHAPES} from './seed-adventure-attacks.js';
import {DEFENSE_FORMS} from './seed-defense-catalog.js';
import {LAWS} from './laws.js';

export function adventureBuildLabels(entry){
 const laws=String(entry.laws||'').split(',').map(id=>LAWS[id]?.name).filter(Boolean);
 return {weapon:ATTACK_SHAPES[entry.weapon]?.name||'미정',laws:laws.join(' · ')||'법칙 없음',form:DEFENSE_FORMS[entry.form]?.name||'기본형'};
}

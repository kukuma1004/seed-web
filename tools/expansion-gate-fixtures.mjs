import {EXPANSION_ACTS} from '../src/act-expansion.js';

// Negative/rollback tests must remain closed after the production release is
// promoted. Copy authored act definitions and vary only the deployment gate.
export const closedExpansionActs=Object.fromEntries(Object.entries(EXPANSION_ACTS).map(([id,act])=>[id,{...act,released:false}]));
export const openExpansionActs=Object.fromEntries(Object.entries(EXPANSION_ACTS).map(([id,act])=>[id,{...act,released:true}]));

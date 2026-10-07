import assert from 'node:assert/strict';
import {isDuelCandidateLab} from '../src/duel-inspection-gate.js';
for(const hostname of ['localhost','127.0.0.1']){
 for(const id of ['08','30','31','58','67'])assert.equal(isDuelCandidateLab({hostname,search:`?inspect=1&duelCandidates=${id}`}),true);
 for(const id of ['7','07','68','067','67x','-1',''])assert.equal(isDuelCandidateLab({hostname,search:`?inspect=1&duelCandidates=${id}`}),false);
 assert.equal(isDuelCandidateLab({hostname,search:'?duelCandidates=67'}),false);
}
for(const hostname of ['kukuma1004.github.io','localhost.example.org','192.168.0.1',''])assert.equal(isDuelCandidateLab({hostname,search:'?inspect=1&duelCandidates=67'}),false);
console.log('Private duel labs: batches08–67 reachable locally; malformed requests, nonlocal hosts and missing inspect denied.');

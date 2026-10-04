import {createExpansionCrystalWalls} from './act-expansion-runtime.js';
const finite=(v,min,max)=>Number.isFinite(v)&&v>=min&&v<=max;
export function validSurvivalExpansionCheckpoint(saved,act,lap){
 if(!saved||saved.act!==act||!Array.isArray(saved.walls))return false;
 const walls=act===4?createExpansionCrystalWalls(Math.min(4,lap)):[],ids=new Map(walls.map(w=>[w.id,w.maxHp]));
 if(saved.walls.length!==walls.length||new Set(saved.walls.map(w=>w?.id)).size!==walls.length||saved.walls.some(w=>!w||!ids.has(w.id)||!finite(w.hp,0,ids.get(w.id))))return false;
 const b=saved.boss;if(!b||b.version!==1||b.id!==(act===3?'crosswindKeeper':'crystalGardener')||!['recover','tell','attack'].includes(b.state))return false;
 if(!Number.isInteger(b.seed)||!finite(b.seed,0,4294967295)||!Number.isInteger(b.pattern)||!finite(b.pattern,-1,2)||!Number.isInteger(b.sequence)||!finite(b.sequence,0,1e7))return false;
 if(!Number.isInteger(b.phase)||!finite(b.phase,0,2)||!finite(b.safeLane,-7,7))return false;
 if(!finite(b.timer,0,2)||!finite(b.elapsed,0,5)||!Number.isInteger(b.shotIndex)||!finite(b.shotIndex,0,6)||!finite(b.shotClock,0,.5))return false;
 for(const key of ['aim','anchor','target'])if(!b[key]||!finite(b[key].x,-1000,1000)||!finite(b[key].z,-1000,1000))return false;
 return Array.isArray(b.regrow)&&b.regrow.length<=3&&b.regrow.every(id=>ids.has(id));
}

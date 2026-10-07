import {batch60OriginalShot, batch60SweepCircle, batch60LinePoint} from './seed-duel-batch60.js';
import {batch57SegmentGuards} from './seed-duel-batch57.js';
import {batch58SegmentGuards} from './seed-duel-batch58.js';
import {batch61SegmentGuards} from './seed-duel-batch61.js';
import {batch62SegmentGuards} from './seed-duel-batch62.js';

const lerp=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
const subtract=(a,b)=>({x:a.x-b.x,y:a.y-b.y});
// A query never consumes a guard. Only the earliest genuine collision commits.
export function duelSegmentInterception(s,q,from,to,elapsed,ctx){
  if(!(s.inspection||s.expandedRules)||!Number.isFinite(elapsed)||elapsed<=0||!batch60OriginalShot(s,q,elapsed))return null;
  let earliest=null;
  for(const guard of [...batch57SegmentGuards(s,q),...batch58SegmentGuards(s,q),...batch61SegmentGuards(s,q),...batch62SegmentGuards(s,q)]){
    const offset=Math.max(0,guard.offset||0),duration=Math.min(elapsed-offset,guard.live);
    if(!Number.isFinite(duration)||duration<=0)continue;
    const begin=offset/elapsed,end=(offset+duration)/elapsed;
    const startA=lerp(from.a,to.a,begin),startB=lerp(from.b,to.b,begin),endA=lerp(from.a,to.a,end),endB=lerp(from.b,to.b,end);
    const guardEnd=lerp(guard.from,guard.to,duration/guard.live);
    const local=batch60SweepCircle(subtract(startA,guard.from),subtract(startB,guard.from),subtract(endA,guardEnd),subtract(endB,guardEnd),{x:0,y:0},guard.radius+q.radius);
    if(local===null)continue;
    const t=begin+local*(end-begin),at=lerp(guard.from,guardEnd,local);
    if(ctx.surfaceHit(guard.from,at))continue;
    const contact=batch60LinePoint(lerp(from.a,to.a,t),lerp(from.b,to.b,t),at);
    if(earliest&&earliest.t<=t)continue;
    let spent=false;
    earliest={t,contact,guardian:guard.original,commit:()=>{
      if(spent||!guard.valid())return false;
      spent=true;guard.consume();ctx.event(s,guard.event);return true;
    }};
  }
  return earliest;
}

import {DUEL_BATCH63_KINDS,DUEL_BATCH63_SHOTS} from './seed-duel-batch63.js';
import {DUEL_BATCH64_KINDS,DUEL_BATCH64_SHOTS} from './seed-duel-batch64.js';
import {DUEL_BATCH65_KINDS,DUEL_BATCH65_SHOTS} from './seed-duel-batch65.js';
import {DUEL_BATCH66_KINDS,DUEL_BATCH66_SHOTS} from './seed-duel-batch66.js';
import {DUEL_BATCH67_KINDS,DUEL_BATCH67_SHOTS} from './seed-duel-batch67.js';
const kinds=new Set([...DUEL_BATCH63_KINDS,...DUEL_BATCH64_KINDS,...DUEL_BATCH65_KINDS,...DUEL_BATCH66_KINDS,...DUEL_BATCH67_KINDS]);
const shots=new Set([...DUEL_BATCH63_SHOTS,...DUEL_BATCH64_SHOTS,...DUEL_BATCH65_SHOTS,...DUEL_BATCH66_SHOTS,...DUEL_BATCH67_SHOTS]);
const palette=q=>q.owner===1?['#472a36','#ffc6a1']:/cold|ice|frost|winter|frozen/i.test(q.kind)?['#1c3548','#caf5ff']:/coal|fire|ember|bloom/i.test(q.kind)?['#442722','#ffd294']:/well|gravity|tidal/i.test(q.kind)?['#302946','#dcd2ff']:['#263a35','#d8f2b7'];
function line(c,a,b,w,col){c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.lineWidth=w;c.strokeStyle=col;c.stroke();}
function ring(c,p,r,w,col){c.beginPath();c.arc(p.x,p.y,r,0,Math.PI*2);c.lineWidth=w;c.strokeStyle=col;c.stroke();}
export function drawTwinBundleProjectile(c,q){
 if(!shots.has(q.kind))return false;
 if(![q.x,q.y,q.radius].every(Number.isFinite))return true;
 const [edge,ink]=palette(q),dest=q.path?.[q.node]||q.path?.at(-1)||{x:q.x+(q.dx||1),y:q.y+(q.dy||0)},len=Math.hypot(dest.x-q.x,dest.y-q.y)||1,v={x:(dest.x-q.x)/len,y:(dest.y-q.y)/len},side={x:-v.y,y:v.x};
 c.save();c.globalAlpha=q.stage==='parked'?.52:1;
 // Draw only the real point. Future path/whole C/crossing area is not a hitbox.
 if(/well|seed|coal|fireland/i.test(q.kind)){ring(c,q,Math.max(.12,q.radius),.075,edge);ring(c,q,Math.max(.09,q.radius*.75),.035,ink);}
 else if(/fork|thunder|discharge/i.test(q.kind)){const a={x:q.x-v.x*.18,y:q.y-v.y*.18},b={x:q.x+v.x*.12,y:q.y+v.y*.12};line(c,a,b,.095,edge);line(c,a,{x:q.x+side.x*.08,y:q.y+side.y*.08},.035,ink);line(c,{x:q.x+side.x*.08,y:q.y+side.y*.08},b,.035,ink);}
 else{const a={x:q.x-v.x*.24,y:q.y-v.y*.24},b={x:q.x+v.x*.16,y:q.y+v.y*.16};line(c,a,b,.105,edge);line(c,a,b,.035,ink);if(/leaf|return|rim|side/i.test(q.kind)){line(c,{x:q.x-side.x*.12,y:q.y-side.y*.12},b,.035,ink);line(c,{x:q.x+side.x*.12,y:q.y+side.y*.12},b,.035,ink);}}
 c.restore();return true;
}
export function drawTwinBundleHazard(c,h){
 if(!kinds.has(h.kind))return false;
 if(![h.x,h.y,h.r].every(Number.isFinite))return true;
 const [edge,ink]=palette(h),r=Math.max(.12,h.r);c.save();c.globalAlpha=h.triggered?.5:.82;
 ring(c,h,r,.065,edge);ring(c,h,r,.027,ink);
 // Actual blast radius remains legible; a well's point does not tint the arena.
 if(!h.triggered&&h.arm>0){line(c,{x:h.x-r*.4,y:h.y},{x:h.x+r*.4,y:h.y},.025,ink);line(c,{x:h.x,y:h.y-r*.4},{x:h.x,y:h.y+r*.4},.025,ink);}
 c.restore();return true;
}

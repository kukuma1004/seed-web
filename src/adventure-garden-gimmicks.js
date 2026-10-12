// Environmental aid, separate from laws/loot. Two authored sites, no RNG or
// serial IDs, no damage, no boss influence and no account/checkpoint fields.
export const ROOT_BLOOM=Object.freeze({trigger:1.05,radius:2.8,tell:.65,cooldown:8,root:1.1,slow:2});
export function makeAdventureGimmicks(region){
 return ['camp','raid'].map(role=>region.nodes.find(n=>n.role===role)).filter(Boolean).map(n=>({kind:'rootBloom',x:n.x,y:n.y,phase:'ready',tell:0,cooldown:0,flash:0,armed:true,activations:0,hits:0}));
}
export function stepAdventureGimmicks(s,dt,onBurst=null){
 if(s.phase!=='playing'||!s.region||!Number.isFinite(dt)||dt<=0)return;
 for(const g of s.region.gimmicks||[]){
  g.flash=Math.max(0,g.flash-dt);g.cooldown=Math.max(0,g.cooldown-dt);
  const distance=Math.hypot(s.player.x-g.x,s.player.y-g.y);
  if(distance>ROOT_BLOOM.trigger+.75)g.armed=true;
  if(g.phase==='primed'){
   g.tell=Math.max(0,g.tell-dt);if(g.tell>0)continue;
   g.phase='spent';g.flash=.45;g.cooldown=ROOT_BLOOM.cooldown;g.hits=0;
   for(const e of s.enemies){if(e.hp<=0||e.type==='boss'||e.dormant||Math.hypot(e.x-g.x,e.y-g.y)>ROOT_BLOOM.radius+e.r)continue;
    e.stun=Math.max(e.stun||0,ROOT_BLOOM.root);e.slow=Math.max(e.slow||0,ROOT_BLOOM.slow);e.tell=0;e.dashing=0;e.cd=Math.max(e.cd||0,ROOT_BLOOM.root);g.hits++;
   }
   onBurst?.(s,g);continue;
  }
  if(g.phase==='spent'&&g.cooldown===0)g.phase='ready';
  if(g.phase==='ready'&&g.armed&&distance<ROOT_BLOOM.trigger){g.phase='primed';g.tell=ROOT_BLOOM.tell;g.armed=false;g.activations++;}
 }
}
export function paintAdventureGimmicks(s,ctx,point,circle,itemSprite,label,scale){
 for(const g of s.region?.gimmicks||[]){
  const distance=Math.hypot(s.player.x-g.x,s.player.y-g.y);if(distance>15)continue;
  const primed=g.phase==='primed',spent=g.phase==='spent',q=point(g.x,g.y);
  ctx.save();ctx.globalAlpha=spent?.4:1;itemSprite('sprout',g.x,g.y,.85);ctx.restore();
  circle(g.x,g.y,primed||g.flash>0?ROOT_BLOOM.radius:ROOT_BLOOM.trigger,primed?'#c5f4a3cc':spent?'#91aa8766':'#c5f4a388',primed?3:1.5,false,1);
  if(primed){circle(g.x,g.y,ROOT_BLOOM.radius,'#b7f6d51c',1,true,1);ctx.save();ctx.strokeStyle='#e4f2a3';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(q.x,q.y,ROOT_BLOOM.radius*scale,ROOT_BLOOM.radius*scale*.72,0,-Math.PI/2,-Math.PI/2+2*Math.PI*(1-g.tell/ROOT_BLOOM.tell));ctx.stroke();ctx.restore();}
  if(g.flash>0){ctx.save();ctx.strokeStyle='#caf7ac';ctx.lineWidth=2;for(let i=0;i<6;i++){const a=i*Math.PI/3;ctx.beginPath();ctx.moveTo(q.x,q.y);ctx.quadraticCurveTo(q.x+Math.cos(a+.4)*scale,q.y+Math.sin(a+.4)*scale*.72,q.x+Math.cos(a)*ROOT_BLOOM.radius*scale,q.y+Math.sin(a)*ROOT_BLOOM.radius*scale*.72);ctx.stroke();}ctx.restore();}
  if(distance<6)label(g.x,g.y-ROOT_BLOOM.radius-.7,primed?'덩굴이 펼쳐져요 · 적을 유인하세요':g.flash>0?`덩굴 꽃 · ${g.hits}마리 묶음`:spent?`덩굴 꽃 · ${Math.ceil(g.cooldown)}초`:'덩굴 꽃 · 밟고 빠져나오기');
 }
}

// A twin's two solo attacks must meet on the same enemy before its signature
// interaction fires. These authored follow-ups deliberately reuse the shared
// VFX pool and never create projectile meshes or persistent per-enemy state.
// The earlier generic resonance damage is applied by main.js separately.
const entry=(name,rule,actions)=>Object.freeze({name,rule,actions:Object.freeze(actions.map(a=>Object.freeze(a)))});
const arc=(range=3.5,ratio=.38)=>({type:'arc',range,ratio});
const spray=(range=1.7,ratio=.3,targets=2)=>({type:'spray',range,ratio,targets});
const line=(range=4,ratio=.36,targets=2)=>({type:'line',range,ratio,targets});
const recall=(range=4,ratio=.32)=>({type:'recall',range,ratio});
const pull=(range=2.1,steps=.27)=>({type:'pull',range,steps});
const chill=(range=1.6,seconds=1.2)=>({type:'chill',range,seconds});
const focus=(ratio=.38,condition='any')=>({type:'focus',ratio,condition});
const guard=(range=2.5)=>({type:'guard',range});

// Each of the 36 playable pairs has a different rule and follow-up geometry.
// All ratios are of the already-bounded resonance hit, not of full weapon DPS.
export const TWIN_INTERACTIONS=Object.freeze({
 lightningmirror:entry('굴절 낙뢰','거울 적중을 따라 가장 가까운 적에게 번개가 한 번 더 뜁니다.',[arc(3.5,.38)]),
 glassmaze:entry('겹친 창선','거울 표식 너머 같은 줄의 적을 창날이 벱니다.',[line(4.5,.34,2)]),
 flaremirror:entry('반사 화점','거울 표식 주위에 작은 불꽃이 번집니다.',[spray(1.45,.34,2)]),
 echohall:entry('되돌린 궤적','튕긴 경로를 씨앗 쪽으로 짧게 되짚습니다.',[recall(4.4,.34)]),
 lensinghole:entry('중력 렌즈','표식 주변 적을 모으고 렌즈 뒤 한 줄을 찌릅니다.',[pull(2.3,.24),line(3.4,.24,1)]),
 frostmirror:entry('서리 굴절','표식 주변을 얼리고 반사광으로 고정 표적을 타격합니다.',[chill(1.55,1.25),focus(.3,'slowed')]),
 stormpetals:entry('전도 꽃잎','흩어진 꽃잎에서 두 방향으로 번개가 갈라집니다.',[arc(4,.31),spray(1.35,.2,1)]),
 petalhalo:entry('후광 개화','씨앗 가까이에 닿은 꽃잎이 고리처럼 퍼집니다.',[spray(2,.35,2),focus(.2,'near')]),
 piercingbloom:entry('꿰뚫린 개화','창이 지난 일직선에 꽃잎이 피어납니다.',[line(4.2,.39,2)]),
 returningbloom:entry('왕복 개화','잎이 돌아오는 선에서 꽃잎이 한 번 더 번집니다.',[recall(4.3,.27),spray(1.3,.19,1)]),
 gravitybloom:entry('압축 꽃밭','모인 적을 꽃 중심으로 당긴 뒤 짧게 폭발합니다.',[pull(2.1,.29),spray(1.5,.27,2)]),
 frostpetals:entry('서리 씨가루','꽃잎에 닿은 무리의 발을 묶고 끝 한 명을 찌릅니다.',[chill(1.9,1.15),focus(.24,'slowed')]),
 thunderflare:entry('낙뢰 점화','번개가 옮겨 간 곳에서 작은 불꽃이 번집니다.',[arc(3.5,.25),spray(1.35,.23,1)]),
 returningbolt:entry('왕복 전도','되돌아오는 잎 끝에서 번개가 다른 적에게 건너갑니다.',[recall(4.3,.2),arc(3.3,.31)]),
 stormeye:entry('폭풍 중심','중력에 잡힌 무리를 모아 한 번 더 전도합니다.',[pull(2.4,.22),arc(3.1,.32)]),
 frozenweb:entry('빙뢰 그물','번개 끝의 무리를 짧게 얼립니다.',[arc(3.4,.26),chill(1.55,1.1)]),
 spearhalo:entry('성환 창끝','고리 근처에서 창끝의 직선 피해가 강해집니다.',[line(4.2,.3,1),focus(.29,'near')]),
 sunring:entry('태양륜','가까이 온 적을 작은 불꽃 고리로 쓸어 냅니다.',[spray(2.1,.28,2),focus(.25,'near')]),
 tidering:entry('돌아온 밀물','씨앗 쪽으로 돌아오는 선을 고리가 한 번 더 베어 냅니다.',[recall(4.2,.31),focus(.2,'near')]),
 accretionring:entry('강착 원반','끌려온 적을 고리 가까이에 묶습니다.',[pull(2.25,.25),chill(1.15,.65)]),
 meteorspear:entry('유성 궤적','창 뒤쪽 한 줄에 불꽃 조각이 터집니다.',[line(4.5,.3,2),spray(1.15,.17,1)]),
 gravityspear:entry('특이점 관통','모인 적을 지나 창이 같은 줄의 다음 적을 꿰뚫습니다.',[pull(2.05,.2),line(4.7,.35,2)]),
 iciclespear:entry('빙정 창선','창이 지난 줄의 적을 얼리고 끝을 찌릅니다.',[line(4.1,.29,1),chill(1.35,1.1)]),
 boomerangflare:entry('귀환 발화','돌아오는 길목에서 불꽃이 터집니다.',[recall(4.1,.25),spray(1.4,.22,2)]),
 frostrewind:entry('차가운 재방문','이미 느려진 적을 되감기 잎이 다시 벱니다.',[chill(1.6,1.15),focus(.39,'slowed')]),
 frozenhole:entry('동결 특이점','끌려온 무리를 중심에서 함께 얼립니다.',[pull(2.4,.28),chill(1.75,1.3)]),
 prismsiblings:entry('거울 꽃 반향','튕긴 각도에서 꽃잎이 옆의 적까지 퍼집니다.',[spray(1.8,.27,2),arc(2.5,.17)]),
 mirrorring:entry('회전 반사광','씨앗 가까이 돌아온 빛이 표적 뒤를 찌릅니다.',[guard(2.7),line(3.2,.27,1)]),
 burstpetals:entry('꽃불 낙하','불꽃 착점에서 꽃잎 파편이 퍼집니다.',[spray(2,.36,2)]),
 lightningring:entry('성환 도체','고리에 닿은 적에서 먼 적으로 번개가 건너갑니다.',[guard(2.6),arc(4.3,.32)]),
 spearthunder:entry('창끝 방전','창이 꿰뚫은 적 뒤로 번개가 뛰어갑니다.',[line(4.4,.24,1),arc(3.8,.29)]),
 winterring:entry('동토의 고리','고리 가까이의 적을 짧게 늦추며 밀어냅니다.',[guard(2.6),chill(1.9,1.05)]),
 returningspear:entry('왕복 창흔','창이 만든 선을 귀환 잎이 다시 베어 냅니다.',[line(4.3,.28,1),recall(4.1,.24)]),
 emberhole:entry('불씨 압축','중력에 모인 적 사이에 작은 불씨가 터집니다.',[pull(2.2,.23),spray(1.8,.28,2)]),
 winterflare:entry('서리불꽃','얼어붙은 표적과 주변 무리에 작은 화염이 퍼집니다.',[chill(1.65,1.2),spray(1.45,.28,2)]),
 tidalhole:entry('회귀 특이점','블랙홀 중심을 지나 씨앗으로 돌아오는 길을 벱니다.',[pull(2.1,.2),recall(4.5,.34)])
});

const flatDistanceSquared=(a,b)=>{const x=a.x-b.x,z=a.z-b.z;return x*x+z*z;};
const capped=(n,min,max)=>Math.max(min,Math.min(max,n));

export function createTwinInteractionEngine(){
 let marks=new WeakMap(),lastGlobal=-Infinity;
 function reset(){marks=new WeakMap();lastGlobal=-Infinity;}
 function apply({id,target,enemies,player,now,bonus,damage,fx,isBoss,collide}){
  const rule=TWIN_INTERACTIONS[id];
  if(!rule||!(bonus>0)||!target||target.dead)return false;
  const last=marks.get(target);
  if(last?.id===id&&now>=last.time&&now-last.time<.72)return false;
  if(now-lastGlobal<.09&&now>=lastGlobal)return false;
  marks.set(target,{id,time:now});lastGlobal=now;
  const pos=target.g.position;
  // Scan once, retain at most the nearest eight. No sort of the whole enemy list.
  const near=[];
  for(const enemy of enemies){
   if(enemy===target||enemy.dead)continue;
   const d=flatDistanceSquared(enemy.g.position,pos);
   if(d>25)continue;
   let i=near.length;while(i>0&&near[i-1].d>d)i--;
   if(i<8){near.splice(i,0,{enemy,d});if(near.length>8)near.pop();}
  }
  const dealt=new Set();
  const strike=(enemy,ratio)=>{if(!enemy||enemy.dead||dealt.has(enemy))return false;dealt.add(enemy);damage(enemy,bonus*capped(ratio,0,.48));return true;};
  const bossFallback=()=>{if(isBoss(target))damage(target,bonus*.13);};
  const direction=pos.clone().sub(player).setY(0);
  const length=Math.max(.001,Math.hypot(direction.x,direction.z));direction.multiplyScalar(1/length);
  for(const action of rule.actions){
   if(action.type==='focus'){
    const valid=action.condition==='any'||action.condition==='slowed'&&(target.slow||0)>.05||action.condition==='near'&&flatDistanceSquared(pos,player)<9;
    if(valid)damage(target,bonus*capped(action.ratio,0,.48));
   }else if(action.type==='arc'){
   const other=near.find(o=>o.d<action.range*action.range&&!dealt.has(o.enemy));
   if(other&&strike(other.enemy,action.ratio))fx.arc(pos,other.enemy.g.position);
    else bossFallback();
   }else if(action.type==='spray'){
    let count=0;
    for(const o of near)if(o.d<action.range*action.range&&strike(o.enemy,action.ratio)&&++count>=action.targets)break;
    if(!count)bossFallback();
    fx.burst(pos,'split',6,.45);
   }else if(action.type==='line'||action.type==='recall'){
    let count=0;
    for(const o of near){
     const x=o.enemy.g.position.x-pos.x,z=o.enemy.g.position.z-pos.z;
     const parallel=x*direction.x+z*direction.z;
     const allowed=action.type==='line'?parallel>.25&&parallel<action.range:parallel<-.25&&parallel>-action.range;
     if(allowed&&Math.abs(x*direction.z-z*direction.x)<.85&&strike(o.enemy,action.ratio)&&++count>=(action.targets||1))break;
    }
    if(!count)bossFallback();
    fx.trail(pos.clone().setY(.7),action.type==='recall'?player.clone().setY(.7):pos.clone().addScaledVector(direction,Math.min(action.range,2.5)).setY(.7),'recall',false);
   }else if(action.type==='pull'){
    let count=0;
    for(const o of near)if(o.d<action.range*action.range&&!isBoss(o.enemy)&&o.enemy.type!=='turret'){
     const toward=pos.clone().sub(o.enemy.g.position).setY(0);const n=toward.length();if(n>.01){o.enemy.g.position.addScaledVector(toward,Math.min(action.steps,n*.4)/n);collide(o.enemy.g.position,.4);}
     if(++count>=2)break;
    }
    if(!count)bossFallback();
    fx.pulse(pos,'gravity',.7,.2);
   }else if(action.type==='chill'){
    if(!isBoss(target)&&target.type!=='turret')target.slow=Math.max(target.slow||0,action.seconds);
    else bossFallback();
    let count=0;for(const o of near)if(o.d<action.range*action.range&&!isBoss(o.enemy)&&++count<=2)o.enemy.slow=Math.max(o.enemy.slow||0,action.seconds*.65);
    fx.pulse(pos,'frost',.6,.2);
   }else if(action.type==='guard'){
    if(flatDistanceSquared(pos,player)<action.range*action.range&&!isBoss(target)&&target.type!=='turret'){
     target.g.position.addScaledVector(direction,.2);collide(target.g.position,.4);
    }
    fx.reflect(pos,direction);
   }
  }
  return true;
 }
 return Object.freeze({apply,reset});
}

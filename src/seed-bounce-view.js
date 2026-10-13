import {BOUNCE_LAWS,BOUNCE_CONFIG,createBounce,launchBounce,stepBounce,chooseBounce,bounceAimPath} from './seed-bounce-rules.js';
import './seed-bounce.css';
import {createFramePacer} from './frame-time.js';
import {createBounceFeedback,drawBounceEffect} from './bounce-feedback.js';

const BASE=import.meta.env.BASE_URL;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const law=id=>BOUNCE_LAWS.find(x=>x.id===id);
const tint=id=>'#'+(law(id)?.color??0xd6f29b).toString(16).padStart(6,'0');

function bounceObjectiveHint(run,paused=false){
 if(paused)return '일시정지';
 if(run.phase==='aim'){
  const enemies=run.enemies.filter(e=>e.active);
  if(enemies.some(e=>e.y+e.h/2>BOUNCE_CONFIG.heartLine-1.1))return '심장 가까이에 적이 있어요 · 가장 아래 적부터 노리세요';
  if(run.bossDefeated)return `수호자 격파 · 남은 적 ${enemies.length}마리 · ${BOUNCE_CONFIG.maxTurns-run.turn+1}번 안에 모두 정리하세요`;
  if(run.boss)return `수호자와 남은 적을 모두 정리하세요 · ${BOUNCE_CONFIG.maxTurns-run.turn+1}발 남음`;
  return run.turn>1?'적이 내려왔어요 · 아래쪽 적을 다시 조준하세요':'최대 14발 · 수호자와 남은 적을 모두 정리하세요';
 }
 if(run.phase==='flying')return `연속 타격 ${run.combo} · 씨앗이 돌아오면 적이 다가와요`;
 if(run.phase==='choice')return '새 법칙을 골라 다음 발사를 바꾸세요';
 return run.phase==='won'?'수호자와 남은 적을 모두 막았어요':'아래쪽 적부터 먼저 노려보세요';
}
function bounceEndExplanation(run){
 if(run.phase==='won')return '수호자와 남은 적을 모두 정리해 정원을 지켰어요.';
 const reached=run.enemies.some(e=>e.active&&e.y+e.h/2>=BOUNCE_CONFIG.heartLine);
 if(!reached&&run.turn>=BOUNCE_CONFIG.maxTurns)return `14번의 발사를 모두 썼어요. ${run.bossDefeated?'수호자는 격파했지만 남은 적을 모두 정리하지 못했어요.':'수호자와 남은 적을 모두 정리해야 정원을 지킬 수 있어요.'}`;
 return run.bossDefeated?'수호자는 격파했지만 남은 적이 정원의 심장에 닿았어요. 아래쪽 적부터 정리해 보세요.':'정원의 심장까지 적이 다가왔어요. 아래쪽 적부터 정리하고, 벽을 이용해 여러 번 맞혀 보세요.';
}

// Independent scene; no normal account progress, currencies or story unlock writes.
export function mountSeedBounce({host=document.body,audio,onClose=()=>{}}={}){
 const root=document.createElement('section');root.id='seed-bounce';root.setAttribute('aria-label','씨앗 바운스');
 root.style.setProperty('--bounce-back',`url("${BASE}assets/garden-sanctuary-v2.webp")`);
 root.innerHTML=`<canvas aria-label="각도를 잡아 씨앗을 발사하는 정원" tabindex="0"></canvas><header><div><small>SEED · 짧은 조준 로그라이크</small><strong>씨앗 바운스</strong></div><p class="sb-status"></p><button class="sb-pause" aria-label="일시정지">Ⅱ</button></header><p class="sb-goal" role="status"></p><footer><span class="sb-build"></span><button class="sb-fire">씨앗 발사 <small>Space</small></button></footer><div class="sb-modal"></div>`;
 host.append(root);
 const $=q=>root.querySelector(q),canvas=$('canvas'),g=canvas.getContext('2d',{alpha:false}),modal=$('.sb-modal'),images={},listeners=[];
 let run=null,closed=false,paused=false,resuming=false,raf=0,last=0,width=1,height=1,scale=1,bx=0,by=0,back=null,pointer=null,aim={x:0,y:-1},shown='',hudAt=0,error=false;
 const pacer=createFramePacer(),feedback=createBounceFeedback(audio),returnScene=audio?.state?.().musicScene||'garden';
 const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 const listen=(target,event,fn)=>{target.addEventListener(event,fn);listeners.push(()=>target.removeEventListener(event,fn));};
 const stop=()=>{cancelAnimationFrame(raf);raf=0;last=0;};
 const wake=()=>{if(!closed&&!paused&&!document.hidden&&run?.phase==='flying'&&!raf){raf=requestAnimationFrame(loop);}};
 function load(key,path){const image=new Image();images[key]=image;image.onload=()=>{if(closed)return;back=null;ready();draw();};image.onerror=()=>{if(closed)return;error=true;ready();};image.src=BASE+path;}
 load('garden','assets/garden-sanctuary-v2.webp');load('terrain','assets/adventure/garden-terrain-atlas-v2.webp');load('seed','assets/adventure/seed-combat-v1.webp');load('enemy','assets/cute/enemy-hound-v4.webp');load('boss','assets/duel/gravity-motion-v1.webp');
 function ready(){const start=$('.sb-start');if(!start)return;start.disabled=error||!Object.values(images).every(im=>im.naturalWidth);$('.sb-loading').textContent=error?'그림을 불러오지 못했어요. 돌아가서 다시 열어 주세요.':start.disabled?'정원 그림을 준비하고 있어요…':'한 번의 조준이 다음 전장을 바꿔요';}
 function close(){if(closed)return;closed=true;resuming=false;stop();pointer=null;for(const off of listeners)off();for(const image of Object.values(images))image.onload=image.onerror=null;back=null;root.remove();audio?.setScene?.(returnScene);audio?.setPaused(false);onClose();}
 function menu(){stop();paused=false;run=null;shown='';root.classList.add('sb-overlay');modal.hidden=false;modal.innerHTML=`<article><small>SEED · 새로운 놀이</small><h1>씨앗 바운스</h1><p>각도를 잡아 씨앗을 튕기세요.<br>최대 14번의 발사로 수호자와 남은 적을 모두 정리하세요.</p><div class="sb-promise"><span>↗ 벽을 이용한 연속 타격</span><span>✦ 9속성 · 두 법칙의 융합</span><span>♧ 짧은 성장 선택 · 보스</span></div><p class="sb-loading" role="status"></p><button class="sb-start" disabled>정원 지키기</button><button class="sb-close">씨앗 맞추기로 돌아가기</button><small>끌어 조준하고 놓으면 발사 · ← → 조준 / Space 발사<br>시험 모드 · 계정·랭킹·햇살에 반영되지 않아요.</small></article>`;$('.sb-start').onclick=start;$('.sb-close').onclick=close;ready();hud();draw();}
 function start(){if(error||!Object.values(images).every(im=>im.naturalWidth))return;stop();pointer=null;resuming=false;run=createBounce(Date.now());feedback.reset();const nearest=run.enemies.filter(e=>e.active).sort((a,b)=>Math.hypot(a.x-run.player.x,a.y-run.player.y)-Math.hypot(b.x-run.player.x,b.y-run.player.y))[0];const angle=nearest?Math.atan2(nearest.y-run.player.y,nearest.x-run.player.x):-Math.PI/2;aim={x:Math.cos(angle),y:Math.sin(angle)};paused=false;shown='';modal.hidden=true;root.classList.remove('sb-overlay');audio?.unlock?.();audio?.setScene?.('garden');audio?.setPaused(false);hud();draw();canvas.focus();}
 function shoot(){if(paused||resuming||run?.phase!=='aim'||!launchBounce(run,aim.x,aim.y))return false;pointer=null;audio?.unlock?.();feedback.consume(run);last=0;hud();draw();canvas.focus();wake();return true;}
 function overlay(){if(!run||paused||closed)return;
  if(run.phase==='choice'&&shown!=='choice'){
   shown='choice';stop();pointer=null;root.classList.add('sb-overlay');modal.hidden=false;audio?.setPaused(true);
   modal.innerHTML=`<article class="sb-growth"><small>이번 판의 씨앗을 키우세요</small><h2>다음 발사는 어떻게 바꿀까요?</h2><p>선택한 법칙은 다음 발사부터 실제로 작동해요.</p><div class="sb-offers">${run.offers.map(o=>`<button data-growth="${escape(o.id)}"><i style="color:${tint(o.law)}">${escape(law(o.law)?.icon||'♧')}</i><b>${escape(o.name)}</b><span>${escape(o.description)}</span></button>`).join('')}</div><button class="sb-close">씨앗 맞추기로</button></article>`;
   $('.sb-close').onclick=close;
   root.querySelectorAll('[data-growth]').forEach(button=>button.onclick=async()=>{if(!chooseBounce(run,button.dataset.growth))return;const chosen=run;resuming=true;root.querySelectorAll('[data-growth]').forEach(b=>b.disabled=true);hud();let audioReady=true;try{const resumed=audio?.setPaused(false);if(resumed?.then)await resumed;}catch{audioReady=false;}if(closed||run!==chosen)return;resuming=false;shown='';if(paused){hud();draw();return;}root.classList.remove('sb-overlay');modal.hidden=true;feedback.consume(run);if(audioReady)audio?.play?.('evolve');hud();draw();overlay();canvas.focus();wake();});
  }else if(['won','lost'].includes(run.phase)&&shown!==run.phase){
   shown=run.phase;stop();pointer=null;audio?.setPaused(false);audio?.play?.(run.phase==='won'?'bossDefeat':'hurt');root.classList.add('sb-overlay');modal.hidden=false;
   modal.innerHTML=`<article><small>SEED · 씨앗 바운스</small><h1>${run.phase==='won'?'정원을 지켰어요!':'다음 각도로 다시 도전'}</h1><p>${run.score.toLocaleString()}점 · ${run.turn}번째 발사<br>${run.kills||0}마리 격파 · 최고 연속 타격 ${run.bestCombo||run.combo}</p><p>${bounceEndExplanation(run)}</p><button class="sb-retry">바로 다시 도전</button><button class="sb-close">씨앗 맞추기로</button><small>시험 모드 · 기록과 보상은 계정에 남지 않아요.</small></article>`;$('.sb-retry').onclick=start;$('.sb-close').onclick=close;
  }
 }
 function pause(){if(!run||!['aim','flying'].includes(run.phase))return;paused=!paused;pointer=null;audio?.setPaused(paused);stop();root.classList.toggle('sb-overlay',paused);modal.hidden=!paused;
  if(paused){modal.innerHTML='<article><h2>잠시 쉬어 가요</h2><p>조준한 각도와 씨앗은 그대로 기다려요.</p><button class="sb-resume">계속하기</button><button class="sb-close">씨앗 맞추기로</button></article>';$('.sb-resume').onclick=pause;$('.sb-close').onclick=close;}else{canvas.focus();wake();}hud();draw();
 }
 function point(x,y){return {x:bx+x*scale,y:by+y*scale};}
 function hud(){const status=$('.sb-status'),goal=$('.sb-goal'),build=$('.sb-build'),fire=$('.sb-fire');
  if(!run){status.textContent='';goal.textContent='';build.textContent='';fire.disabled=true;return;}
  status.textContent=`${run.turn}/${BOUNCE_CONFIG.maxTurns} 발사 · ${run.score.toLocaleString()}점`;
  goal.textContent=bounceObjectiveHint(run,paused);
  build.textContent=`${run.laws.map(id=>law(id)?.name||id).join(' + ')||'기본 씨앗'}${run.fusion?' · '+run.fusion.name:''} · ${run.volleySize}발`;fire.disabled=paused||resuming||run.phase!=='aim';
 }
 function backdrop(){if(back)return;back=document.createElement('canvas');back.width=width;back.height=height;const c=back.getContext('2d');c.fillStyle='#102f2b';c.fillRect(0,0,width,height);const image=images.garden;if(image?.naturalWidth){const z=Math.max(width/image.naturalWidth,height/image.naturalHeight);c.drawImage(image,(width-image.naturalWidth*z)/2,(height-image.naturalHeight*z)/2,image.naturalWidth*z,image.naturalHeight*z);c.fillStyle='#0b201dc4';c.fillRect(0,0,width,height);}
  c.fillStyle='#183e32eb';c.strokeStyle='#cecb9055';c.lineWidth=2;c.beginPath();c.roundRect(bx,by,10*scale,8*scale,14);c.fill();c.stroke();
  if(images.terrain?.naturalWidth){c.save();c.clip();const im=images.terrain,tile=im.naturalWidth/2;for(let y=0;y<8;y+=4)for(let x=0;x<10;x+=4)c.drawImage(im,0,0,tile,tile,bx+x*scale,by+y*scale,4*scale,4*scale);c.fillStyle='#1238269e';c.fillRect(bx,by,10*scale,8*scale);c.restore();}
  for(let row=0;row<7;row++){c.fillStyle=row%2?'#c7ceba08':'#b6d5b305';c.fillRect(bx+1,by+row*scale,10*scale-2,scale);}
  const danger=point(0,BOUNCE_CONFIG.heartLine);c.strokeStyle='#edb45c';c.setLineDash([7,6]);c.beginPath();c.moveTo(danger.x,danger.y);c.lineTo(danger.x+10*scale,danger.y);c.stroke();c.setLineDash([]);
  c.fillStyle='#dbd4a8';c.font='12px sans-serif';c.textAlign='center';c.fillText('정원의 심장',bx+8.6*scale,by+(BOUNCE_CONFIG.heartLine+.4)*scale);
 }
 function sprite(key,x,y,size,cols=4){const image=images[key];if(!image?.naturalWidth)return;const q=point(x,y),sw=image.naturalWidth/cols,sh=image.naturalHeight/2;cshadow(q,size);g.drawImage(image,0,0,sw,sh,q.x-size/2,q.y-size*.66,size,size);}
 function cshadow(q,size){g.fillStyle='#06161180';g.beginPath();g.ellipse(q.x,q.y+size*.25,size*.33,size*.09,0,0,Math.PI*2);g.fill();}
 function draw(){if(closed||width<2||height<2)return;backdrop();g.drawImage(back,0,0);if(!run)return;
  for(const enemy of run.enemies){if(!enemy.active||enemy.hp<=0)continue;const q=point(enemy.x,enemy.y);if(enemy.type==='boss'){g.fillStyle='#b8b57822';g.strokeStyle='#ddb36d99';g.lineWidth=2;g.beginPath();g.roundRect(q.x-enemy.w*scale/2,q.y-enemy.h*scale/2,enemy.w*scale,enemy.h*scale,scale*.18);g.fill();g.stroke();}if(enemy.type==='shield'){g.strokeStyle='#d2c98d';g.lineWidth=3;g.beginPath();g.roundRect(q.x-scale*.4,q.y-scale*.4,scale*.8,scale*.8,scale*.14);g.stroke();}sprite(enemy.type==='boss'?'boss':'enemy',enemy.x,enemy.y,(enemy.type==='boss'?1.6:.92)*scale,enemy.type==='boss'?4:2);g.fillStyle=enemy.frost>0?'#b9f2ff':'#f4ecd2';g.font=`bold ${Math.max(12,scale*.26)}px sans-serif`;g.textAlign='center';g.strokeStyle='#132c25';g.lineWidth=4;g.strokeText(Math.ceil(enemy.hp),q.x,q.y+scale*.48);g.fillText(Math.ceil(enemy.hp),q.x,q.y+scale*.48);if(enemy.type==='boss'){g.font=`bold ${Math.max(11,scale*.2)}px sans-serif`;g.fillStyle='#efd79c';g.strokeText('정원 수호자',q.x,q.y-scale*.72);g.fillText('정원 수호자',q.x,q.y-scale*.72);g.fillStyle='#102a20';g.fillRect(q.x-scale*.75,q.y-scale*.58,scale*1.5,5);g.fillStyle='#e9bf68';g.fillRect(q.x-scale*.75,q.y-scale*.58,scale*1.5*clamp(enemy.hp/enemy.maxHp,0,1),5);}}
  if(run.phase==='aim'&&!paused){const path=bounceAimPath(run,aim.x,aim.y);g.strokeStyle='#e9e9b49a';g.lineWidth=2;g.setLineDash([5,7]);g.beginPath();path.forEach((p,i)=>{const q=point(p.x,p.y);g[i?'lineTo':'moveTo'](q.x,q.y);});g.stroke();g.setLineDash([]);}
  for(const ball of run.balls){if(!ball.active)continue;const q=point(ball.x,ball.y),r=Math.max(4,ball.r*scale);g.fillStyle=tint(run.laws[0]);g.beginPath();g.ellipse(q.x,q.y,r*.8,r,Math.atan2(ball.vy,ball.vx),0,Math.PI*2);g.fill();g.fillStyle='#fff5cb';g.beginPath();g.arc(q.x-r*.18,q.y-r*.25,r*.24,0,Math.PI*2);g.fill();}
  if(run.phase==='flying'){for(const fx of run.effects)if(fx.active!==false&&fx.ttl>0)drawBounceEffect(g,fx,{point,scale,reducedMotion:reduced});}
  sprite('seed',run.player.x,run.player.y,1.05*scale);if(run.phase==='flying'&&run.combo>=5){g.fillStyle='#efd67d';g.font=`bold ${Math.max(14,scale*.3)}px sans-serif`;g.textAlign='center';g.textAlign='left';g.fillText(`${run.combo} CHAIN`,Math.min(width-105,bx+10*scale+14),by+scale*1.3);}
 }
 function loop(now){raf=0;if(closed||paused||document.hidden||run?.phase!=='flying')return;if(!pacer(now,60)){wake();return;}const dt=last?Math.min(.05,(now-last)/1000):0;last=now;stepBounce(run,dt);feedback.consume(run);audio?.tick?.(dt);if(now-hudAt>100||run.phase!=='flying'){hudAt=now;hud();}draw();overlay();wake();}
 function resize(){const box=root.getBoundingClientRect();if(box.width<2||box.height<2){if(run&&['aim','flying'].includes(run.phase)&&!paused)pause();stop();return;}width=box.width;height=box.height;const dpr=Math.min(devicePixelRatio||1,1.5);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);g.setTransform(dpr,0,0,dpr,0,0);const top=($('header').offsetHeight||54)+22,bottom=($('footer').offsetHeight||54)+6;scale=Math.min((width-32)/10,(height-top-bottom)/8);bx=(width-10*scale)/2;by=top+Math.max(0,(height-top-bottom-8*scale)/2);back=null;draw();}
 function setAim(event){const rect=canvas.getBoundingClientRect(),x=(event.clientX-rect.left-bx)/scale-run.player.x,y=(event.clientY-rect.top-by)/scale-run.player.y;if(y>=-.25)return;const length=Math.hypot(x,y);const angle=clamp(Math.atan2(y,x),-Math.PI+.22,-.22);aim.x=Math.cos(angle);aim.y=Math.sin(angle);draw();}
 listen(canvas,'pointerdown',event=>{if(paused||resuming||run?.phase!=='aim'||pointer!==null)return;pointer=event.pointerId;canvas.setPointerCapture?.(pointer);setAim(event);});
 listen(canvas,'pointermove',event=>{if(!resuming&&pointer===event.pointerId&&run?.phase==='aim')setAim(event);});
 listen(canvas,'pointerup',event=>{if(pointer!==event.pointerId)return;setAim(event);pointer=null;shoot();});
 for(const event of ['pointercancel','lostpointercapture'])listen(canvas,event,ev=>{if(pointer===ev.pointerId)pointer=null;});
 listen(window,'keydown',event=>{if(closed||event.target?.closest?.('input,textarea,select')||event.repeat)return;if(event.code==='Escape'){event.preventDefault();pause();return;}if(paused||resuming||run?.phase!=='aim'||event.code==='Space'&&event.target?.closest?.('button'))return;if(['ArrowLeft','ArrowRight','Space'].includes(event.code))event.preventDefault();if(event.code==='Space')shoot();else if(event.code==='ArrowLeft'||event.code==='ArrowRight'){const angle=clamp(Math.atan2(aim.y,aim.x)+(event.code==='ArrowLeft'?-.08:.08),-Math.PI+.2,-.2);aim={x:Math.cos(angle),y:Math.sin(angle)};draw();}});
 listen(window,'blur',()=>{pointer=null;if(run&&['aim','flying'].includes(run.phase)&&!paused)pause();});listen(document,'visibilitychange',()=>{pointer=null;if(document.hidden&&run&&['aim','flying'].includes(run.phase)&&!paused)pause();});listen(window,'resize',resize);
 $('.sb-pause').onclick=pause;$('.sb-fire').onclick=shoot;resize();menu();return {close};
}

// Derived presentation only: never changes progression, saves or RNG.
export function adventureObjective(s){
 if(s.phase!=='playing'||!s.region)return null;
 const R=s.region,p=s.player,active=R.events.find(e=>e.state==='active'&&Math.hypot(e.x-p.x,e.y-p.y)<(e.r||6)+2);
 if(active){const raid=active.type==='raid',trail=active.variant==='flowertrail',distance=Math.hypot(active.x-p.x,active.y-p.y),name=adventureEventName(active);return {kind:active.type,x:active.x,y:active.y,distance,label:raid?`선택 도전 · ${name} ${Math.max(0,Math.ceil(active.duration-active.time))}초${trail&&distance>=active.r?' · 빛 안으로':''}`:`선택 도전 · ${name} ${Math.min(active.waves,active.wave+1)}/${active.waves}${active.variant==='moonaltar'?' · '+adventureIngressLabel(active):''}`,hint:raid?(trail?'움직이는 빛 안에서 버티면 보물 상자':'원 안에서 버티면 보물 상자'):(active.variant==='moonaltar'?'무리마다 달라지는 문을 막으면 보물 상자':'행진하는 적을 막으면 보물 상자')};}
 for(const ev of R.events){const cache=adventureEventReward(s,ev);if(!cache)continue;const distance=Math.hypot(cache.x-p.x,cache.y-p.y);if(distance<8)return {kind:'cache',x:cache.x,y:cache.y,distance,label:'도전 성공 · 보물 상자를 부수세요',hint:'가까이 가서 공격하면 햇살과 강화 구슬을 얻어요'};}
 if(R.gate.open)return {kind:'exit',x:R.gate.x,y:R.gate.y,distance:Math.hypot(R.gate.x-p.x,R.gate.y-p.y),label:'출구가 열렸어요 · 빛나는 문으로',hint:''};
 let nearest=null,distance=Infinity,count=0;
 for(const e of s.enemies){if(!e.guard||e.hp<=0)continue;count++;const d=Math.hypot(e.x-p.x,e.y-p.y);if(d<distance){nearest=e;distance=d;}}
 if(!nearest)return null;
 return {kind:'guards',x:nearest.x,y:nearest.y,distance,label:`출구 수호 무리 · ${count}마리 남음`,hint:'제단과 습격지는 선택 도전'};
}

export function adventureEventName(event){return event.variant==='flowertrail'?'꽃등 따라가기':event.variant==='moonaltar'?'달꽃 제단':event.type==='raid'?'습격지':'제단 수호';}
export function adventureEventReward(s,event){return event.state==='done'&&event.cacheId?s.props.find(p=>p.id===event.cacheId&&p.kind==='cache'&&p.hp>0)||null:null;}
export function adventureIngressLabel(event){const pending=event.spawned===0&&event.wave>0&&event.wave<event.waves,portal=pending?event.portals[event.wave%event.portals.length]:event.portal,dx=portal.x-event.x,dy=portal.y-event.y;return (Math.abs(dx)>=Math.abs(dy)?dx<0?'왼쪽 문':'오른쪽 문':dy<0?'위쪽 문':'아래 문')+(pending?' 대기':'');}

export function adventureBossAction(boss){
 if(boss.tell>0)return boss.tellKind;
 if(boss.charging>0)return 'charge';
 if(boss.beam)return 'beam';
 return '';
}

const GARDEN_SCENES=['garden/theme-greenhouse-v1.webp','garden/theme-blossom-v1.webp','garden/theme-moon-v1.webp'];
export function adventureDoorScene(door,next){
 return door.room==='boss'?'adventure/garden-arena-plate-v2.webp':GARDEN_SCENES[next.act]||GARDEN_SCENES[0];
}

// Derived presentation only: never changes progression, saves or RNG.
export function adventureObjective(s){
 if(s.phase!=='playing'||!s.region)return null;
 const R=s.region,p=s.player,active=R.events.find(e=>e.state==='active'&&Math.hypot(e.x-p.x,e.y-p.y)<(e.r||6)+2);
 if(active){const raid=active.type==='raid';return {kind:active.type,x:active.x,y:active.y,distance:Math.hypot(active.x-p.x,active.y-p.y),label:raid?`선택 도전 · 습격지 ${Math.max(0,Math.ceil(active.duration-active.time))}초`:`선택 도전 · 제단 수호 ${Math.min(active.waves,active.wave+1)}/${active.waves}`,hint:raid?'원 안에서 버티면 보물 상자':'행진하는 적을 막으면 보물 상자'};}
 if(R.gate.open)return {kind:'exit',x:R.gate.x,y:R.gate.y,distance:Math.hypot(R.gate.x-p.x,R.gate.y-p.y),label:'출구가 열렸어요 · 빛나는 문으로',hint:''};
 let nearest=null,distance=Infinity,count=0;
 for(const e of s.enemies){if(!e.guard||e.hp<=0)continue;count++;const d=Math.hypot(e.x-p.x,e.y-p.y);if(d<distance){nearest=e;distance=d;}}
 if(!nearest)return null;
 return {kind:'guards',x:nearest.x,y:nearest.y,distance,label:`출구 수호 무리 · ${count}마리 남음`,hint:'제단과 습격지는 선택 도전'};
}

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

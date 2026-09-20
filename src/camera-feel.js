// Camera motion is visual-only. It never reads enemies, changes targeting, or
// changes the playable arena, so framing stays predictable on every build.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const settle=(from,to,rate,dt)=>from+(to-from)*(1-Math.exp(-rate*dt));

export function createCameraFeel(){
 let x=0,z=.4,leadX=0,leadZ=0,freeze=0,punch=0,punchTotal=0;
 function triggerUltimate(overdrive=false){
  freeze=Math.max(freeze,overdrive?.072:.052);
  punchTotal=overdrive?.48:.38;
  punch=Math.max(punch,punchTotal);
 }
 function stepEffects(dt){
  const safe=clamp(Number.isFinite(dt)?dt:0,0,.1);
  freeze=Math.max(0,freeze-safe);
  punch=Math.max(0,punch-safe);
  return freeze>0?.08:1;
 }
 // biasZ: 적이 한쪽에서만 밀려오는 막에서 시선을 그쪽으로 당겨 둔다(3막 하늘길).
 function follow(dt,{playerX=0,playerZ=0,moveX=0,moveZ=0,followX=.14,followZ=.06,baseZoom=1,biasZ=0}={}){
  const safe=clamp(Number.isFinite(dt)?dt:0,0,.1),speed=Math.hypot(moveX,moveZ)/Math.max(safe,.001);
  let targetLeadX=0,targetLeadZ=0;
  // A small stick deadzone prevents camera buzz; look-ahead is capped so the
  // player never loses the space behind them on a phone.
  if(speed>.18){const length=Math.hypot(moveX,moveZ)||1,strength=clamp((speed-.18)/3.4,0,1);targetLeadX=moveX/length*.82*strength;targetLeadZ=moveZ/length*.54*strength;}
  leadX=settle(leadX,targetLeadX,7.2,safe);leadZ=settle(leadZ,targetLeadZ,7.2,safe);
  const safeBias=clamp(Number.isFinite(biasZ)?biasZ:0,-6,6);
  const targetX=playerX*followX+leadX,targetZ=playerZ*followZ+.4+leadZ+safeBias;
  const dx=targetX-x,dz=targetZ-z;
  // The deadzone keeps the body and HP bar visually anchored during tiny
  // animation offsets while still letting deliberate movement pull the view.
  if(Math.hypot(dx,dz)>.105){x=settle(x,targetX,4.6,safe);z=settle(z,targetZ,4.6,safe);}
  let zoomScale=1;
  if(punch>0&&punchTotal>0){const age=1-punch/punchTotal;zoomScale=age<.18?1+.038*(age/.18):1-.022*Math.sin(Math.PI*clamp((age-.18)/.82,0,1));}
  return {x,z,zoom:baseZoom*zoomScale,lookAhead:{x:leadX,z:leadZ}};
 }
 return {triggerUltimate,stepEffects,follow,state:()=>({x,z,leadX,leadZ,freeze,punch})};
}

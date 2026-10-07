// Roster cards share the combat atlases, but a large catalog must not request
// every sheet as soon as its menu opens. Keep only visible/nearby portraits
// attached, so scrolling the whole catalog does not retain 175 large sheets.
// This has no effect on fighter identity, unlocks or selected combat assets.
export function deferDuelPortraits(root,Observer=globalThis.IntersectionObserver){
 const targets=root.querySelectorAll('[data-portrait-src]');
 const sources=new Map(Array.from(targets,el=>[el,el.dataset.portraitSrc]));
 const hydrate=el=>{const src=el.dataset.portraitSrc;if(!src)return;
  el.style.backgroundImage=`url('${src}')`;delete el.dataset.portraitSrc;};
 if(typeof Observer!=='function'){for(const el of targets)hydrate(el);return()=>{};}
 const observer=new Observer(entries=>{for(const entry of entries){
  const el=entry.target;
  if(entry.isIntersecting)hydrate(el);
  else if(el.style.backgroundImage){el.style.backgroundImage='';el.dataset.portraitSrc=sources.get(el);}
 }},{rootMargin:'160px',threshold:0});
 for(const el of targets)observer.observe(el);
 return()=>{observer.disconnect();for(const el of targets)el.style.backgroundImage='';sources.clear();};
}

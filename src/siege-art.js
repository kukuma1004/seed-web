// Authored botanical facility atlas. Rects reference the original 2079×756
// layout; resizing the complete image preserves normalized crops and alpha.
export const SIEGE_ART_FILE='assets/expansion/siege-botanical-facilities-v1.webp';
export const SIEGE_ART_FRAMES=Object.freeze({
 turret:Object.freeze({x:0,y:88,w:503,h:560}),
 snare:Object.freeze({x:507,y:88,w:526,h:560}),
 wall:Object.freeze({x:1040,y:88,w:516,h:560}),
 heart:Object.freeze({x:1560,y:88,w:519,h:560})
});
export function siegeArtTexture(atlas,kind){
 const f=SIEGE_ART_FRAMES[kind];if(!f)throw new Error('Unknown siege art '+kind);
 const t=atlas.clone();t.repeat.set(f.w/2079,f.h/756);t.offset.set(f.x/2079,(756-f.y-f.h)/756);t.needsUpdate=true;return t;
}
export function siegeArtStyle(kind){
 const f=SIEGE_ART_FRAMES[kind];
 return {backgroundSize:`${2079/f.w*100}% ${756/f.h*100}%`,backgroundPosition:`${f.x/(2079-f.w)*100}% ${f.y/(756-f.h)*100}%`};
}
export const siegeArtAspect=kind=>SIEGE_ART_FRAMES[kind].h/SIEGE_ART_FRAMES[kind].w;

// Canvas modes use the same grounded objective as the journey/survival sprites.
// This painter reads no game state and leaves collision and HP ownership alone.
export function paintSiegeHeart(ctx,image,x,y,size){
 const width=image?.naturalWidth||image?.width||0,height=image?.naturalHeight||image?.height||0;
 if(!image?.complete||!width||!height)return false;
 const f=SIEGE_ART_FRAMES.heart,h=size*siegeArtAspect('heart');
 ctx.drawImage(image,f.x/2079*width,f.y/756*height,f.w/2079*width,f.h/756*height,x-size/2,y-h*.93,size,h);
 return true;
}

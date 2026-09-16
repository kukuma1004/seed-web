export const PHONE_LANDSCAPE_MAX_HEIGHT=520;
export const PHONE_ZOOM=1.32;
export const TABLET_ZOOM=1.1;

// Keep the arena coordinates unchanged. This only changes how much of the world
// the camera frames and how closely it follows the seed on a small landscape screen.
export function responsiveView(width,height,touch=false){
 const w=Math.max(1,Number(width)||1),h=Math.max(1,Number(height)||1),landscape=w>h;
 const phone=Boolean(touch&&landscape&&h<=PHONE_LANDSCAPE_MAX_HEIGHT);
 const tablet=Boolean(touch&&landscape&&!phone);
 const aspect=w/h;
 const baseZoom=Math.min(1.18,aspect/(touch&&!landscape?1.25:.95));
 const scale=phone?PHONE_ZOOM:tablet?TABLET_ZOOM:1;
 return Object.freeze({
  phone,tablet,aspect,zoom:baseZoom*scale,
  followX:phone?.5:.14,
  followZ:phone?.4:.06
 });
}

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

// One finite route pan, never a repeat tile. Every native layer shares the
// vertical scale; the authored stone contact lies near 76% of the plate.
export function expeditionFieldPlacement({width,height,progress=0,foregroundStart,groundContact,farAnchorY,farFocalX}={}){
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)return null;
 const p=Number.isFinite(progress)?clamp(progress,0,1):0;
 const imageWidth=Math.max(width*1.25,height*1.5),imageHeight=imageWidth/1.5,overflow=imageWidth-width;
 const focal=Number.isFinite(farFocalX)&&farFocalX>=0&&farFocalX<=1?farFocalX:null;
 const farOffset=focal===null?-overflow/2+(.5-p)*overflow*.28:clamp(width*.5-imageWidth*focal+(.5-p)*overflow*.28,-overflow,0);
 const offsets=Object.freeze([farOffset,...[.72,1].map(rate=>-overflow/2+(.5-p)*overflow*rate)]);
 const top=(height-imageHeight)*.76;
 // Keep a garden's focal landmark in a wide/portrait crop. This framing is
 // only for the distant plate; walking contact and foreground stay separate.
 const farTop=Number.isFinite(farAnchorY)&&farAnchorY>=0&&farAnchorY<=1?(height-imageHeight)*farAnchorY:top;
 // Authored decks have different top-plane heights. Move only the middle
 // layer so walking feet stay on that plane; preserve the distant framing.
 const contact=Number.isFinite(groundContact)&&groundContact>=.65&&groundContact<=.8?groundContact:.76;
 const middleTop=contact===.76?top:height*.76-imageHeight*contact;
 // Some authored foregrounds sit too low to survive a wide-screen crop.
 // Anchor their first visible pixels below 80% of the world while retaining
 // native scale and bottom coverage. Midground contact stays at 76%.
 const foregroundTop=Number.isFinite(foregroundStart)&&foregroundStart>=.8&&foregroundStart<1
  ?Math.max(height-imageHeight,height*.8-imageHeight*foregroundStart):top;
 return Object.freeze({width:imageWidth,height:imageHeight,top,farTop,middleTop,foregroundTop,offsets,groundY:height*.76});
}

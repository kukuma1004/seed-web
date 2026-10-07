// Release obsolete combat image references without touching shared backgrounds or URLs.
export function trimDuelCombatAssets(assets,keepKeys){
 const keep=new Set(keepKeys),released=[];
 for(const key of Object.keys(assets)){
  if(!/^(?:native-motion-|motion-)/.test(key)||keep.has(key))continue;
  const image=assets[key];
  if(image){image.onload=null;image.onerror=null;}
  delete assets[key];released.push(key);
 }
 return released;
}

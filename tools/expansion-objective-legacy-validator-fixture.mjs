// Frozen old public validator from commit 351a653. Evaluated in a VM by the
// objective test; do not relax it when changing the current save protocol.
function validExpansionAccountSave(value,{owner,act}={}){
 try{
  if(!value||value.version!==1||value.channel!=='public-journey'||value.eligibility!=='released'||!ownerValid(value.ownerUid)||!actValid(value.act))return false;
  if(Object.keys(value).some(k=>!['version','channel','eligibility','ownerUid','act','entry','campaign'].includes(k)))return false;
  if(owner!==undefined&&value.ownerUid!==owner||act!==undefined&&value.act!==act)return false;
  if(value.campaign!==undefined&&!validExpansionPublicCampaign(value.campaign,value.act))return false;
  const e=value.entry;
  // Siege remains local review until a separately validated release migration.
  if(e?.journey?.siege!==undefined)return false;
  if(!validEnd(e)&&(!validExpansionEntry(e)||e.ended!==undefined||e.journey.act!==value.act))return false;
  if(value.campaign&&!e.ended&&(e.run.cycle!==value.campaign.lap||value.campaign.bossCleared&&e.journey.phase!=='boss'))return false;
  if(!Number.isSafeInteger(e.revision)||e.revision<0||e.savedAt!==undefined&&(!Number.isSafeInteger(e.savedAt)||e.savedAt<=0))return false;
  return JSON.stringify(value).length<=EXPANSION_ACCOUNT_SAVE_LIMIT;
 }catch{return false;}
}

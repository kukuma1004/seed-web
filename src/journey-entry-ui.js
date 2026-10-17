// Keep loading and failures in the menu that owns the tap. The gameplay toast
// sits behind this overlay and cannot be the only explanation for a failed entry.
export async function launchJourneyCard(button,launch,{status,buttons=[],message=()=>'',label='여정'}={}){
 if(!button||button.disabled||status?.dataset.busy==='true')return false;
 const previous=buttons.map(node=>[node,node.disabled]);
 for(const [node] of previous)node.disabled=true;
 if(status){status.dataset.busy='true';status.hidden=false;status.setAttribute('role','status');status.textContent=label+' 입구와 저장 기록을 준비하고 있어요…';}
 try{
  const ok=await launch();
  if(!ok&&status&&status.isConnected!==false){status.setAttribute('role','alert');status.textContent=message()||'입구를 준비하지 못했어요. 저장 기록은 그대로예요. 다시 눌러 주세요.';}
  return ok===true;
 }catch{
  if(status?.isConnected!==false){status?.setAttribute('role','alert');if(status)status.textContent='입구를 불러오지 못했어요. 연결을 확인한 뒤 다시 눌러 주세요. 저장 기록은 지우지 않았어요.';}
  return false;
 }finally{
  for(const [node,disabled] of previous)node.disabled=disabled;
  if(status)delete status.dataset.busy;
 }
}

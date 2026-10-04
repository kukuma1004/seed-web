import {acquireDefenseAccountLease} from './defense-account-save.js';
import {createDefenseAccountSync,defenseAccountLabel} from './defense-account-sync.js';

// Entry owns the slot until the view has flushed its final preparation. UI uses
// only fixed labels; player-controlled checkpoint strings never become HTML.
export async function prepareDefenseAccount({storage,account,owner,circuit,databaseURL,practice,isCurrent,status,controls,leaseOptions,syncOptions}={}){
 const lease=await acquireDefenseAccountLease(owner,circuit,leaseOptions);
 if(!isCurrent()){await lease.release();return null;}
 if(!lease.ok){status.textContent=lease.reason==='busy'?'다른 창에서 수호전을 진행 중이에요. 그 창을 나간 뒤 다시 눌러 주세요.':'이 브라우저는 안전한 계정 저장을 지원하지 않아요. 다른 최신 브라우저에서 열어 주세요.';return null;}
 let active=false,token=null,timer=null,released=false,saveError='';
 const sync=createDefenseAccountSync({...syncOptions,storage,account,owner,circuit,databaseURL,practice,lease,isActive:()=>active,onState:state=>{if(isCurrent())status.textContent=defenseAccountLabel(state);}});
 const release=async()=>{if(released)return;released=true;clearTimeout(timer);await lease.release();};
 let result=await sync.sync({allowPull:true});
 if(!isCurrent()){await release();return null;}
 if(['conflict','remote','invalid','storage','account','lease'].includes(result.kind)){
  await new Promise(resolve=>{
   const watch=setInterval(()=>{if(!isCurrent()){clearInterval(watch);resolve();}},1000);
   const finish=()=>{clearInterval(watch);resolve();};
   const draw=()=>{
    controls.replaceChildren();status.textContent=defenseAccountLabel(result);
    if(result.kind!=='conflict')return;
    const summary=record=>record?.ended?'도전 종료':record?`${record.checkpoint.wave}차 습격 · 씨앗 ${record.checkpoint.towers.length}개 · 햇살 ${record.checkpoint.currency}`:'저장 없음';
    for(const [choice,label] of [['remote','계정'],['local','이 기기']]){
     const button=document.createElement('button');button.textContent=label+' 기록으로 이어가기 · '+summary(result[choice]);button.disabled=!result[choice];
     button.onclick=async()=>{if(!isCurrent()){finish();return;}const expected=result.expected;for(const b of controls.children)b.disabled=true;result=await sync.sync({allowPull:true,choice,expected});if(!isCurrent()||['synced','empty'].includes(result.kind)){finish();return;}draw();};controls.append(button);
    }
   };
   draw();
   // The owner's back action invalidates isCurrent. Poll only this short-lived
   // menu wait, never a gameplay frame or a repeating network request.
  });
 }
 if(!isCurrent()||!['synced','empty','offline','permission'].includes(result.kind)){await release();return null;}
 try{token=sync.store.readRecord();}catch{status.textContent=defenseAccountLabel({kind:'invalid'});await release();return null;}
 const schedule=()=>{clearTimeout(timer);timer=setTimeout(()=>{timer=null;void sync.flush();},1800);};
 return {
  preparation:{
   read:()=>token&&!token.ended?sync.store.read():null,
   write(state){if(released||practice()!==false)return {ok:false,reason:'account'};const saved=sync.store.write(token,state);saveError=saved.ok?'':defenseAccountLabel({kind:saved.reason});if(saved.ok){token=saved.value;sync.changed();schedule();}return saved;},
   end(id){if(released||practice()!==false)return {ok:false,reason:'account'};const saved=sync.store.end(token,id);saveError=saved.ok?'':defenseAccountLabel({kind:saved.reason});if(saved.ok){token=saved.value;sync.changed();schedule();}return saved;},
   label:()=>saveError||defenseAccountLabel(sync.state())
  },
  activate(){active=true;},
  async close(){active=false;clearTimeout(timer);try{return await sync.flush();}finally{await release();}},
  release
 };
}

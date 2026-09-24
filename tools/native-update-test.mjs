import assert from 'node:assert/strict';
import {AppUpdateAvailability,AppUpdateResultCode} from '@capawesome/capacitor-app-update';
import {createNativeUpdateGate,requiresPlayUpdate} from '../src/native-update.js';

const info=(status,available=49,current=48)=>({updateAvailability:status,availableVersionCode:String(available),currentVersionCode:String(current),immediateUpdateAllowed:true});
assert.equal(requiresPlayUpdate(info(AppUpdateAvailability.UPDATE_AVAILABLE)),true);
assert.equal(requiresPlayUpdate(info(AppUpdateAvailability.UPDATE_AVAILABLE,48)),false);
assert.equal(requiresPlayUpdate(info(AppUpdateAvailability.UPDATE_NOT_AVAILABLE)),false);
assert.equal(requiresPlayUpdate(info(AppUpdateAvailability.UNKNOWN)),false);

function fakeDocument(){
 const controls=new Map();
 const gate={hidden:true,querySelector(selector){if(!controls.has(selector))controls.set(selector,{disabled:false,textContent:'',onclick:null});return controls.get(selector);}};
 return {gate,controls,doc:{createElement(){return gate;},body:{append(){}}}};
}

{
 const {gate,doc,controls}=fakeDocument();let calls=0;
 const updater=createNativeUpdateGate({enabled:true,doc,plugin:{getAppUpdateInfo:async()=>{calls++;return info(AppUpdateAvailability.UPDATE_AVAILABLE);},performImmediateUpdate:async()=>({code:AppUpdateResultCode.CANCELED})}});
 assert.equal(await updater.check(),true,'a Play-offered update gates the old app');
 assert.equal(gate.hidden,false);
 assert.equal(await updater.check(),true,'a menu redraw reuses the recent result');
 assert.equal(calls,1);
 await controls.get('#app-update-now').onclick();
 assert.match(controls.get('#app-update-message').textContent,/취소/,'canceling a Play flow keeps an honest update instruction');
 assert.equal(gate.hidden,false);
}
{
 const {gate,doc}=fakeDocument();
 const updater=createNativeUpdateGate({enabled:true,doc,plugin:{getAppUpdateInfo:async()=>info(AppUpdateAvailability.UPDATE_NOT_AVAILABLE)}});
 assert.equal(await updater.check(),false,'pending review is not an installed update');
 assert.equal(gate.hidden,true);
}
{
 const {gate,doc}=fakeDocument();
 const updater=createNativeUpdateGate({enabled:true,doc,plugin:{getAppUpdateInfo:async()=>{throw new Error('offline');}}});
 assert.equal(await updater.check(),false,'network failure does not strand the player');
 assert.equal(gate.hidden,true);
}
assert.equal(await createNativeUpdateGate({enabled:false}).check(),false,'web and PWA skip the Play gate');
console.log('Native update gate: available, pending, offline and web paths passed.');

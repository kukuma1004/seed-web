import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';

const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const start=main.indexOf('let siegeSupportSoundAt='),end=main.indexOf('\nfunction supportExpansionGuardian(',start);
if(start<0||end<=start)throw Error('Shipping siege support helper boundary missing');
export const siegeFeedbackHostSource=main.slice(start,end);

// Keep the shipping helper and finite damage logic. Only the presentation
// endpoints absent from old extracted-host fixtures receive inert fallbacks.
export function installSiegeFeedbackHost(context){
 const c=vm.isContext(context)?context:vm.createContext(context);
 c.V=THREE.Vector3;
 if(!Number.isFinite(c.elapsed))c.elapsed=0;
 c.vfx??={};c.vfx.muzzle??=()=>{};c.vfx.burst??=()=>{};
 c.audio??={};c.audio.play??=()=>{};c.line??=()=>{};
 if(!Object.hasOwn(c,'expansionSiegeView'))c.expansionSiegeView=null;
 if(typeof c.showSiegeSupport!=='function')c.showSiegeSupport=vm.runInContext(`(()=>{${siegeFeedbackHostSource}\nreturn showSiegeSupport;})()`,c);
 return c;
}

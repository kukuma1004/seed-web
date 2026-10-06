// Narrow new namespace only. Do not replace any pre-existing live game rules.
// These rules fence writers and immutable ancestry; they cannot execute P2
// combat or parse the opaque JSON checkpoint, and are not anti-cheat authority.
const node=validate=>({'.validate':validate});
const text=max=>`newData.isString() && newData.val().length > 0 && newData.val().length <= ${max}`;
const integer=`newData.isNumber() && newData.val() >= 0 && newData.val() % 1 == 0`;
const hash=`newData.isString() && newData.val().matches(/^[a-f0-9]{64}$/)`;
const wireKey=`newData.isString() && newData.val().length > 0 && newData.val().length <= 256 && newData.val().matches(/^[a-f0-9]+$/)`;
import {EXPEDITION_ACCOUNT_RELEASE_POLICY} from '../src/expedition/account-release.js';
const policy="root.child('seedExpeditionRelease/accountV1')";
const grant=`auth != null && auth.uid == $uid && auth.token.firebase.sign_in_provider != 'anonymous' && ${policy}.child('enabled').val() == true && ${policy}.child('runtimeVersion').val() == ${EXPEDITION_ACCOUNT_RELEASE_POLICY.runtimeVersion} && ${policy}.child('combatVersion').val() == ${EXPEDITION_ACCOUNT_RELEASE_POLICY.combatVersion}`;
const home=`root.child('seedExpeditionAccountV1').child($uid)`;
const serverLease=`${home}.child('lease')`;
const head=`${home}.child('head')`;
const child=(base,k)=>`${base}.child('${k}').val()`;
const matchWriter=(a,b)=>['deviceId','leaseId','issuedAt','expiresAt'].map(k=>`${child(a,k)} == ${child(b,k)}`).join(' && ');
const active=`${child(serverLease,'closed')} == false && ${child(serverLease+".child('writer')",'issuedAt')} <= now + 1000 && ${child(serverLease+".child('writer')",'expiresAt')} > now`;
const sameParent=(parent,source)=>['ownerUid','campaignId','writeId','revision','checkpointHash'].map(k=>`${child(parent,k)} == ${child(source,k)}`).join(' && ');
function schema(required,fields){return {'.validate':`newData.hasChildren(${JSON.stringify(required)})`,...fields,$other:{'.validate':false}};}
const writer=()=>schema(['deviceId','leaseId','issuedAt','expiresAt'],{
 deviceId:node(text(128)),leaseId:node(text(128)),issuedAt:node(`${integer} && newData.val() > 0`),
 expiresAt:node(`${integer} && newData.val() > newData.parent().child('issuedAt').val() && newData.val() - newData.parent().child('issuedAt').val() <= 120000`)
});
const parent=()=>({'.validate':`(newData.isBoolean() && newData.val() == false) || newData.hasChildren(['ownerUid','campaignId','writeId','revision','checkpointHash'])`,ownerUid:node(`newData.val() == $uid`),campaignId:node(text(128)),writeId:node(text(128)),revision:node(integer),checkpointHash:node(hash),$other:{'.validate':false}});
function envelope(payload){return schema(['version','ownerUid','campaignId','writeId','revision','checkpointHash','campaignKey','writeKey','parent','writer','createdAt','updatedAt',payload],{
 version:node('newData.val() == 1'),ownerUid:node('newData.val() == $uid'),campaignId:node(text(128)),writeId:node(text(128)),revision:node(integer),checkpointHash:node(hash),campaignKey:node(wireKey),writeKey:node(wireKey),parent:parent(),writer:writer(),createdAt:node(`${integer} && newData.val() > 0`),updatedAt:node(`${integer} && newData.val() >= newData.parent().child('createdAt').val() && newData.val() <= now + 1000 && newData.val() >= newData.parent().child('writer/issuedAt').val() && newData.val() < newData.parent().child('writer/expiresAt').val()`),[payload]:node(text(payload==='checkpoint'?4000000:65536))
 });}
export function expeditionAccountRuleNodes(){
 const leaseNode=schema(['version','ownerUid','closed','writer'],{version:node('newData.val() == 1'),ownerUid:node('newData.val() == $uid'),closed:node('newData.isBoolean()'),writer:writer()});
 const freshLease=`(!data.exists() || data.child('closed').val() == true || data.child('writer/expiresAt').val() <= now) && newData.child('closed').val() == false && newData.child('writer/issuedAt').val() >= now - 15000 && newData.child('writer/issuedAt').val() <= now + 1000 && newData.child('writer/expiresAt').val() > now && newData.child('writer/expiresAt').val() <= now + 120000`;
 const releaseLease=`data.exists() && data.child('closed').val() == false && newData.child('closed').val() == true && ${matchWriter("newData.child('writer')","data.child('writer')")}`;
 leaseNode['.write']=`${grant} && newData.exists() && ((${freshLease}) || (${releaseLease}))`;
 const h=envelope('checkpoint'),receipt=`${home}.child('receipts').child(newData.child('campaignKey').val()).child(newData.child('writeKey').val())`;
 const successor=`newData.child('revision').val() == data.child('revision').val() + 1 && newData.child('campaignId').val() == data.child('campaignId').val() && newData.child('createdAt').val() == data.child('createdAt').val() && ${sameParent("newData.child('parent')",'data')} && ${receipt}.exists() && ${['ownerUid','campaignId','writeId','revision','checkpointHash','createdAt','updatedAt'].map(k=>`${child(receipt,k)} == ${child('newData',k)}`).join(' && ')} && ${matchWriter(receipt+".child('writer')","newData.child('writer')")} && ${sameParent(receipt+".child('parent')",'data')}`;
 h['.write']=`${grant} && newData.exists() && ${active} && ${matchWriter("newData.child('writer')",serverLease+".child('writer')")} && ((!data.exists() && newData.child('revision').val() == 0 && newData.child('parent').val() == false && newData.child('createdAt').val() == newData.child('updatedAt').val()) || (data.exists() && ${successor}))`;
 const r=envelope('payload');r.campaignKey=node(`${wireKey} && newData.val() == $campaignKey`);r.writeKey=node(`${wireKey} && newData.val() == $writeKey`);
 r['.write']=`${grant} && !data.exists() && newData.exists() && ${active} && ${matchWriter("newData.child('writer')",serverLease+".child('writer')")} && ${head}.exists() && newData.child('revision').val() == ${head}.child('revision').val() + 1 && newData.child('campaignId').val() == ${head}.child('campaignId').val() && newData.child('createdAt').val() == ${head}.child('createdAt').val() && ${sameParent("newData.child('parent')",head)}`;
 const release=schema(['enabled','runtimeVersion','combatVersion'],{enabled:node('newData.isBoolean()'),runtimeVersion:node(`${integer} && newData.val() > 0`),combatVersion:node(`${integer} && newData.val() > 0`)});
 release['.validate']="(newData.isBoolean() && newData.val() == false) || newData.hasChildren(['enabled','runtimeVersion','combatVersion'])";
 return {seedExpeditionRelease:{'.read':true,'.write':false,accountV1:release,$other:{'.validate':false}},seedExpeditionAccountV1:{$uid:{'.read':grant,lease:leaseNode,head:h,receipts:{$campaignKey:{'.indexOn':['revision'],$writeKey:r}},$other:{'.validate':false}}}};
}
export function appendExpeditionAccountRules(previous){
 if(!previous?.rules||['seedExpeditionRelease','seedExpeditionAccountV1'].some(k=>Object.hasOwn(previous.rules,k)))throw Error('Existing namespace must be reviewed, never overwritten');
 return {...structuredClone(previous),rules:{...structuredClone(previous.rules),...expeditionAccountRuleNodes()}};
}

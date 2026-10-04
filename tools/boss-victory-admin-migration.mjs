import {fileURLToPath} from 'node:url';
import {adminApp,DATABASE_URL} from './seed-admin-grant.mjs';
import {validBossMigrationSeal,sealBossMigrationUser,initializeBossLedgerFromSeal} from '../src/boss-victory-migration.js';
import {assertBossMigrationRules} from './boss-victory-migration-rules.mjs';

export function createBossMigrationRestAdmin({databaseURL,authorization,namespace=null,fetchImpl=globalThis.fetch}={}){
 const base=new URL(databaseURL);if(base.protocol!=='https:'&&!(base.protocol==='http:'&&base.hostname==='127.0.0.1'))throw Error('invalid-admin-endpoint');
 async function request(path,options={}){
  const url=new URL(base.href.replace(/\/$/,'')+'/'+path+'.json');if(namespace)url.searchParams.set('ns',namespace);
  const credential=await authorization();if(!credential)throw Error('admin-credential');
  const response=await fetchImpl(url,{...options,headers:{Authorization:'Bearer '+credential,...options.headers},signal:AbortSignal.timeout(15000),cache:'no-store'});
  if(!response.ok&&response.status!==412)throw Error('admin-request-'+response.status);return response;
 }
 return {
  async read(path){const response=await request(path,{headers:{'X-Firebase-ETag':'true'}}),etag=response.headers.get('ETag');if(!etag)throw Error('admin-etag');return {value:await response.json(),etag};},
  async compareAndSet(path,value,etag){const r=await request(path,{method:'PUT',headers:{'Content-Type':'application/json','if-match':etag},body:JSON.stringify(value)});return r.status!==412;},
  async rules(){return (await request('.settings/rules')).json();}
 };
}
export async function migrateBossVictoryUser({admin,ownerUid,epoch,apply=false,now=Date.now()}={}){
 if(typeof ownerUid!=='string'||! /^[\w-]{1,128}$/.test(ownerUid)||typeof epoch!=='string'||! /^[\w-]{6,96}$/.test(epoch))throw Error('invalid-migration-context');
 const path='seedUsers/'+ownerUid,ledgerPath='seedBossVictories/'+ownerUid;
 const source=await admin.read(path),planned=sealBossMigrationUser(source.value,ownerUid,epoch,now),seal=planned.bossMigration;
 if(!apply)return {kind:'dry-run',baseline:{...seal.baseline},entitlements:(seal.legacyEntitlements.bosses||[]).length};
 async function ready(){assertBossMigrationRules(await admin.rules());const r=(await admin.read('seedBossMigrationReady')).value;if(r?.version!==2||r?.clientReady!==true)throw Error('client-not-ready');}
 await ready();initializeBossLedgerFromSeal((await admin.read(ledgerPath)).value,seal);let frozen=null;
 for(let attempt=0;attempt<3;attempt++){
  const current=attempt===0?source:await admin.read(path),next=sealBossMigrationUser(current.value,ownerUid,epoch,now);
  // A retry may have a newer legacy count. Recheck any existing ledger
  // against this candidate before freezing the UID with a different baseline.
  initializeBossLedgerFromSeal((await admin.read(ledgerPath)).value,next.bossMigration);
  if(current.value.bossMigration||await admin.compareAndSet(path,next,current.etag)){frozen=(await admin.read(path)).value?.bossMigration;break;}
 }
 if(!validBossMigrationSeal(frozen)||frozen.ownerUid!==ownerUid||frozen.epoch!==epoch)throw Error('seal-not-confirmed');
 // The server rule freezes old writes immediately after the per-user seal.
 // A crash here leaves the original save archived and resumable migration,
 // never a writable half-created baseline or a fabricated victory.
 await ready();let confirmed=null;
 for(let attempt=0;attempt<3;attempt++){
  const current=await admin.read(ledgerPath),next=initializeBossLedgerFromSeal(current.value,frozen);
  if(current.value!==null||await admin.compareAndSet(ledgerPath,next,current.etag)){confirmed=(await admin.read(ledgerPath)).value;break;}
 }
 if(confirmed==null)throw Error('ledger-not-confirmed');initializeBossLedgerFromSeal(confirmed,frozen);
 return {kind:'sealed',baseline:{...frozen.baseline},entitlements:(frozen.legacyEntitlements.bosses||[]).length};
}
async function main(){
 const args=process.argv.slice(2),get=name=>args[args.indexOf(name)+1],ownerUid=args.includes('--uid')?get('--uid'):'',epoch=args.includes('--epoch')?get('--epoch'):'';
 // Candidate only: this tool does not publish rules or readiness flags.
 // Default invocation cannot write. --apply additionally requires the server
 // readiness flag and the exact protected migration rules already installed.
 const app=await adminApp(),admin=createBossMigrationRestAdmin({databaseURL:DATABASE_URL,authorization:async()=> (await app.options.credential.getAccessToken()).access_token});
 const result=await migrateBossVictoryUser({admin,ownerUid,epoch,apply:args.includes('--apply')});
 console.log('Boss migration '+result.kind+'; immutable baseline checked, legacy entitlements '+result.entitlements+'.');
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1])main().catch(error=>{console.error(error.message);process.exitCode=1;});

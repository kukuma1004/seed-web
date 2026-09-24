#!/usr/bin/env node
import {getDatabase} from 'firebase-admin/database';
import {adminApp} from './seed-admin-grant.mjs';
import {seoulDay,WEB_TELEMETRY_ROOT} from '../src/web-telemetry.js';
import {fileURLToPath} from 'node:url';

const countEvents=users=>Object.values(users||{}).reduce((sum,events)=>sum+Object.keys(events||{}).length,0);
export function summarizeWebDay(value){
 const failures={};
 for(const [provider,reasons] of Object.entries(value?.loginFailures||{}))
  for(const [reason,users] of Object.entries(reasons||{}))failures[`${provider}/${reason}`]=countEvents(users);
 return {browsers:Object.keys(value?.visitors||{}).length,starts:countEvents(value?.starts),loginFailures:Object.values(failures).reduce((sum,n)=>sum+n,0),failureKinds:failures};
}

async function main(){
 const days=Math.max(1,Math.min(90,Number(process.argv.find(arg=>arg.startsWith('--days='))?.slice(7))||14));
 try{
  const db=getDatabase(await adminApp());
  console.log('서울 날짜 | 웹 이용 브라우저 | 전투 진입 | 로그인 실패');
  for(let offset=days-1;offset>=0;offset--){
   const day=seoulDay(Date.now()-offset*86400000);
   const value=(await db.ref(`${WEB_TELEMETRY_ROOT}/${day}`).once('value')).val();
   const row=summarizeWebDay(value);
   console.log(`${day} | ${row.browsers} | ${row.starts} | ${row.loginFailures}${row.loginFailures?` (${Object.entries(row.failureKinds).map(([kind,n])=>`${kind}:${n}`).join(', ')})`:''}`);
  }
 }catch(error){console.error(`웹 통계를 읽지 못했습니다: ${error.message}`);process.exitCode=1;}
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1])main();

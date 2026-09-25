import {seoulDay,WEB_TELEMETRY_ROOT} from './web-telemetry.js';

const count=items=>Object.keys(items||{}).length;
const countEvents=users=>Object.values(users||{}).reduce((sum,events)=>sum+count(events),0);

export function summarizeUsageDay(day,value){
 const sessions=Object.values(value?.sessions||{}).flatMap(platform=>Object.values(platform||{}).flatMap(users=>Object.values(users||{})));
 const activeSeconds=sessions.reduce((sum,record)=>sum+(Number.isFinite(record?.activeSeconds)?Math.max(0,Math.min(86400,record.activeSeconds)):0),0);
 const cleared=sessions.filter(record=>record?.outcome==='cleared').length;
 const deaths=sessions.filter(record=>record?.outcome==='ended').length;
 return {day,webDevices:count(value?.visitors),appDevices:count(value?.appVisitors),webStarts:countEvents(value?.starts),appStarts:countEvents(value?.appStarts),activeSeconds:Math.round(activeSeconds),cleared,deaths};
}

export async function readUsageDays({tokenSession,databaseURL,fetchImpl=globalThis.fetch,now=Date.now,days=7}={}){
 const session=await tokenSession?.();
 if(!session?.idToken||!databaseURL)throw new Error('관리자 로그인을 확인하지 못했어요.');
 const countDays=Math.max(1,Math.min(14,days));
 return Promise.all(Array.from({length:countDays},async(_,index)=>{
  const day=seoulDay(now()-index*86400000);
  const response=await fetchImpl(`${databaseURL}/${WEB_TELEMETRY_ROOT}/${day}.json?auth=${encodeURIComponent(session.idToken)}`,{cache:'no-store'});
  if(!response.ok)throw new Error(response.status===401||response.status===403?'이용 통계 읽기 권한이 아직 적용되지 않았어요.':'통계를 불러오지 못했어요.');
  return summarizeUsageDay(day,await response.json());
 }));
}

export const usageTotals=rows=>rows.reduce((sum,row)=>({webDevices:sum.webDevices+row.webDevices,appDevices:sum.appDevices+row.appDevices,webStarts:sum.webStarts+row.webStarts,appStarts:sum.appStarts+row.appStarts,activeSeconds:sum.activeSeconds+row.activeSeconds,cleared:sum.cleared+row.cleared,deaths:sum.deaths+row.deaths}),{webDevices:0,appDevices:0,webStarts:0,appStarts:0,activeSeconds:0,cleared:0,deaths:0});

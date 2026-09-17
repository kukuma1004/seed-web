#!/usr/bin/env node
import {applicationDefault,cert,getApps,initializeApp} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getDatabase} from 'firebase-admin/database';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

export const DATABASE_URL='https://jpmathlab-default-rtdb.asia-southeast1.firebasedatabase.app';
const PROJECT_ID='jpmathlab';
const args=process.argv.slice(2);
const values=name=>args.flatMap((arg,index)=>arg===name?[args[index+1]]:arg.startsWith(name+'=')?[arg.slice(name.length+1)]:[]).filter(Boolean);
const value=(name,fallback='')=>values(name).at(-1)||fallback;
const pairs=list=>Object.fromEntries(list.map(entry=>String(entry).split(':')).filter(([id,n])=>id&&Number.isInteger(Number(n))&&Number(n)>0).map(([id,n])=>[id,Number(n)]));
const mask=email=>String(email).replace(/^(.{1,2}).*(@.*)$/,'$1***$2');
const cleanId=id=>String(id||'').trim().replace(/[^a-zA-Z0-9_-]/g,'-').slice(0,48);

export function createGrant(options={}){
 const id=cleanId(options.id),jp=Math.max(0,Math.min(9_999_999,Math.floor(Number(options.jp)||0)));
 if(!id)throw new Error('grant id is required');
 return {label:String(options.label||'SEED 운영 선물').slice(0,80),source:String(options.source||'admin').slice(0,40),createdAt:{'.sv':'timestamp'},rewards:{jp,badges:[...new Set(options.badges||[])].slice(0,40),skins:[...new Set(options.skins||[])].slice(0,80),seeds:options.seeds||{},items:options.items||{}}};
}

export async function adminApp(){
 if(getApps().length)return getApps()[0];
 let credential=applicationDefault();
 const inline=process.env.SEED_FIREBASE_SERVICE_ACCOUNT_JSON;
 if(inline)credential=cert(JSON.parse(inline));
 return initializeApp({credential,projectId:PROJECT_ID,databaseURL:DATABASE_URL});
}

export async function resolveUsers(app,{uids=[],emails=[]}={}){
 const auth=getAuth(app),out=[];
 for(const uid of uids)try{out.push(await auth.getUser(uid));}catch(error){if(error?.code!=='auth/user-not-found')throw error;console.warn(`Skipped unknown UID ${String(uid).slice(0,8)}…`);}
 for(const email of emails)try{out.push(await auth.getUserByEmail(email));}catch(error){if(error?.code!=='auth/user-not-found')throw error;console.warn(`Skipped ${mask(email)} (sign in once before rewards can be attached)`);}
 return [...new Map(out.map(user=>[user.uid,user])).values()];
}

export async function grantToUser(app,user,grantId,grant){
 const ref=getDatabase(app).ref(`seedUserRewards/${user.uid}/${grantId}`);
 let created=false;
 await ref.transaction(current=>{if(current!==null){created=false;return current;}created=true;return grant;},{applyLocally:false});
 return {uid:user.uid,email:user.email||'',created};
}

async function main(){
 const uidList=values('--uid'),emailList=values('--email');
 const emailFile=value('--emails-file');
 if(emailFile)emailList.push(...readFileSync(emailFile,'utf8').split(/[\r\n,;]+/).map(v=>v.trim()).filter(v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)));
 if(!uidList.length&&!emailList.length)throw new Error('Use --uid, --email or --emails-file.');
 const grantId=cleanId(value('--grant-id'));
 const grant=createGrant({id:grantId,jp:value('--jp','0'),label:value('--label'),source:value('--source','admin'),badges:values('--badge'),skins:values('--skin'),seeds:pairs(values('--seed')),items:pairs(values('--item'))});
 const app=await adminApp(),users=await resolveUsers(app,{uids:uidList,emails:emailList});
 const results=[];for(const user of users)results.push(await grantToUser(app,user,grantId,grant));
 const created=results.filter(r=>r.created).length;
 console.log(`Grant ${grantId}: ${created} new, ${results.length-created} already present, ${results.length} users.`);
 for(const result of results)console.log(`- ${mask(result.email)||result.uid.slice(0,8)+'…'}: ${result.created?'created':'kept'}`);
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1])main().catch(error=>{console.error(error.message);process.exitCode=1;});

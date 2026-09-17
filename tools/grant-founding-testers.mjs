#!/usr/bin/env node
import {spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';

const file=process.argv[2]||'store/seed-beta-testers.csv';
if(!existsSync(file)){console.error(`Tester list not found: ${file}`);process.exit(1);}
const script=new URL('./seed-admin-grant.mjs',import.meta.url).pathname.replace(/^\/(.:)/,'$1');
const result=spawnSync(process.execPath,[script,'--emails-file',file,'--grant-id','founding-tester-2026','--label','SEED 창립 테스터 선물','--source','closed-beta-2026','--jp','3000','--badge','founding-tester','--seed','founder:1'],{stdio:'inherit'});
process.exitCode=result.status??1;

import {defineConfig} from 'vite';
import {readdirSync,statSync,writeFileSync} from 'node:fs';
import {join,relative} from 'node:path';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {execSync} from 'node:child_process';
import {applyDuelRuntimeAssets} from './build/duel-runtime-assets.mjs';

// 성능 기록에 붙는 빌드 번호(커밋 앞 7자리). git이 없으면 빈칸.
const buildId=(()=>{try{return execSync('git rev-parse --short=7 HEAD',{stdio:['ignore','pipe','ignore']}).toString().trim();}catch{return '';}})();

// After a build, list every file the game needs so the service worker can keep a full copy for offline play.
// Static art keeps its authored paths; include deployment revisions so cached art can update too.
function offlineManifest(){
 let outDir='dist',root=import.meta.dirname;
 return {
  name:'seed-offline-manifest',apply:'build',
  configResolved(config){outDir=config.build.outDir;root=config.root;},
  closeBundle(){
   const optimized=applyDuelRuntimeAssets({root,outDir});
   const files=[];
   const walk=dir=>{for(const name of readdirSync(dir)){const path=join(dir,name);if(statSync(path).isDirectory())walk(path);else files.push(relative(outDir,path).split('\\').join('/'));}};
   walk(outDir);
   const list=files.filter(f=>f!=='sw.js'&&f!=='offline-manifest.json').sort();
   const version=createHash('sha1').update(list.join('\n')).update(JSON.stringify(optimized.assetVersions)).digest('hex').slice(0,12);
   writeFileSync(join(outDir,'offline-manifest.json'),JSON.stringify({version,files:list,assetVersions:optimized.assetVersions}));
   console.log(`Duel deployment copies: ${optimized.count}, saved ${(optimized.savedBytes/1048576).toFixed(2)} MiB; source art intact.`);
  }
 };
}

// Relative build URLs work both on GitHub project Pages and on the local server.
export default defineConfig({
 base:'./',
 // Some workspace-linked Capacitor plugins resolve the parent node_modules.
 // Keep one runtime instance instead of bundling both physical copies.
 resolve:{dedupe:['three','@capacitor/core']},
 define:{__SEED_BUILD__:JSON.stringify(process.env.SEED_BUILD||buildId)},
 plugins:[offlineManifest()],
 build:{rollupOptions:{input:{index:resolve(import.meta.dirname,'index.html'),comboLab:resolve(import.meta.dirname,'combo-lab.html')}}}
});

import {defineConfig} from 'vite';
import {readdirSync,statSync,writeFileSync} from 'node:fs';
import {join,relative} from 'node:path';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';

// After a build, list every file the game needs so the service worker can keep a full copy for offline play.
// The version changes whenever a file name changes (Vite hashes JS/CSS/image names), which tells old copies to go.
function offlineManifest(){
 let outDir='dist';
 return {
  name:'seed-offline-manifest',apply:'build',
  configResolved(config){outDir=config.build.outDir;},
  closeBundle(){
   const files=[];
   const walk=dir=>{for(const name of readdirSync(dir)){const path=join(dir,name);if(statSync(path).isDirectory())walk(path);else files.push(relative(outDir,path).split('\\').join('/'));}};
   walk(outDir);
   const list=files.filter(f=>f!=='sw.js'&&f!=='offline-manifest.json').sort();
   const version=createHash('sha1').update(list.join('\n')).digest('hex').slice(0,12);
   writeFileSync(join(outDir,'offline-manifest.json'),JSON.stringify({version,files:list}));
  }
 };
}

// Relative build URLs work both on GitHub project Pages and on the local server.
export default defineConfig({
 base:'./',
 plugins:[offlineManifest()],
 build:{rollupOptions:{input:{index:resolve(import.meta.dirname,'index.html'),comboLab:resolve(import.meta.dirname,'combo-lab.html')}}}
});

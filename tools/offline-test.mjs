import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';

// The service worker keeps a full offline copy: it reads the build's file list, ignores Vary when matching
// (GitHub Pages and Vite send "Vary: Origin", which otherwise makes every stored script miss), and drops old builds.
const sw=readFileSync(new URL('../public/sw.js',import.meta.url),'utf8');
assert.ok(sw.includes("offline-manifest.json"),'reads the build file list');
assert.ok(sw.includes('ignoreVary:true'),'matches stored files regardless of Vary');
assert.ok(/cache\.delete\(request\)/.test(sw),'forgets files from older builds');
assert.ok(/catch\(\(\)=>caches\.match\(ROOT\)\)/.test(sw),'offline navigation falls back to the stored page');
const config=readFileSync(new URL('../vite.config.js',import.meta.url),'utf8');
assert.ok(config.includes('offline-manifest.json')&&config.includes('closeBundle'),'the build writes the file list');
const manifestPath=new URL('../dist/offline-manifest.json',import.meta.url);
if(existsSync(manifestPath)){
 const {version,files}=JSON.parse(readFileSync(manifestPath,'utf8'));
 assert.ok(/^[0-9a-f]{12}$/.test(version));
 assert.ok(files.some(f=>/^assets\/index-.*\.js$/.test(f))&&files.some(f=>f.endsWith('.png')),'lists code and images');
 assert.ok(!files.includes('sw.js')&&!files.includes('offline-manifest.json'));
}
console.log('Offline: build file list, Vary-safe cache matching, old build cleanup and offline page fallback passed.');

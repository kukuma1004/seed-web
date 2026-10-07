import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {applyDuelRuntimeAssets} from '../build/duel-runtime-assets.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const root=resolve(import.meta.dirname,'..'),manifest=JSON.parse(readFileSync(join(root,'build-assets/duel-runtime/manifest.json'),'utf8'));
assert(manifest.entries.length>0);
for(const e of manifest.entries){
 const source=readFileSync(join(root,'public/assets/duel',e.file)),runtime=readFileSync(join(root,'build-assets/duel-runtime',e.file));
 assert.equal(hash(source),e.sourceSha256);assert.equal(hash(runtime),e.runtimeSha256);
 assert.equal(e.alphaDifferences,0);assert.equal(e.visibleRGBDifferences,0);assert(runtime.length<=source.length*.90);
}
const temp=mkdtempSync(join(tmpdir(),'seed-runtime-assets-'));
try{
 mkdirSync(join(temp,'public/assets/duel'),{recursive:true});mkdirSync(join(temp,'dist/assets/duel'),{recursive:true});mkdirSync(join(temp,'build-assets/duel-runtime'),{recursive:true});
 const e=manifest.entries[0],source=readFileSync(join(root,'public/assets/duel',e.file)),runtime=readFileSync(join(root,'build-assets/duel-runtime',e.file));
 writeFileSync(join(temp,'public/assets/duel',e.file),source);writeFileSync(join(temp,'dist/assets/duel',e.file),source);writeFileSync(join(temp,'build-assets/duel-runtime',e.file),runtime);
 const saveEntry=entry=>writeFileSync(join(temp,'build-assets/duel-runtime/manifest.json'),JSON.stringify({schema:1,entries:[entry]}));saveEntry(e);
 const applied=applyDuelRuntimeAssets({root:temp,outDir:'dist'});assert.equal(applied.count,1);assert.equal(applied.savedBytes,source.length-runtime.length);assert.equal(applied.assetVersions['assets/duel/'+e.file],e.runtimeSha256);
 assert.equal(hash(readFileSync(join(temp,'dist/assets/duel',e.file))),e.runtimeSha256);assert.equal(hash(readFileSync(join(temp,'public/assets/duel',e.file))),e.sourceSha256);
 writeFileSync(join(temp,'dist/assets/duel',e.file),source);saveEntry({...e,file:'../escape.webp'});assert.throws(()=>applyDuelRuntimeAssets({root:temp,outDir:'dist'}),/runtime path/);
 saveEntry({...e,alphaDifferences:1});assert.throws(()=>applyDuelRuntimeAssets({root:temp,outDir:'dist'}),/Unverified/);
 saveEntry(e);writeFileSync(join(temp,'build-assets/duel-runtime',e.file),'wrong');assert.throws(()=>applyDuelRuntimeAssets({root:temp,outDir:'dist'}),/Corrupt/);
 writeFileSync(join(temp,'build-assets/duel-runtime',e.file),runtime);writeFileSync(join(temp,'public/assets/duel',e.file),'new art');assert.throws(()=>applyDuelRuntimeAssets({root:temp,outDir:'dist'}),/Changed source/);
}finally{rmSync(temp,{recursive:true,force:true});}
console.log(`Duel deploy copies: ${manifest.entries.length} source/derived hashes, alpha/RGB receipts, scoped output, stale/corrupt/path guards passed; saved ${manifest.savedBytes} bytes.`);

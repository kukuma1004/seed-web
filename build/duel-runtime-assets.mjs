import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
const hash=b=>createHash('sha256').update(b).digest('hex');
export function applyDuelRuntimeAssets({root,outDir}){
 const base=resolve(root,'build-assets/duel-runtime');
 const manifest=JSON.parse(readFileSync(join(base,'manifest.json'),'utf8'));
 if(manifest.schema!==1||!Array.isArray(manifest.entries))throw Error('Invalid duel deployment manifest');
 const assetVersions={},seen=new Set();let savedBytes=0;
 // Validate the complete set before touching output, so stale art never yields a mixed build.
 const prepared=manifest.entries.map(entry=>{
  if(!/^[a-z0-9-]+\.webp$/.test(entry.file)||seen.has(entry.file))throw Error('Invalid or duplicated duel runtime path');
  seen.add(entry.file);
  const asset='assets/duel/'+entry.file,source=readFileSync(resolve(root,'public',asset)),runtime=readFileSync(join(base,entry.file)),output=readFileSync(resolve(root,outDir,asset));
  if(hash(source)!==entry.sourceSha256||hash(output)!==entry.sourceSha256)throw Error('Changed source art needs compression review: '+entry.file);
  if(hash(runtime)!==entry.runtimeSha256||runtime.length!==entry.runtimeBytes||source.length!==entry.sourceBytes)throw Error('Corrupt duel deployment copy: '+entry.file);
  if(entry.alphaDifferences!==0||entry.visibleRGBDifferences!==0||runtime.length>source.length*.90)throw Error('Unverified duel deployment copy: '+entry.file);
  return {asset,entry,runtime};
 });
 for(const {asset,entry,runtime} of prepared){writeFileSync(resolve(root,outDir,asset),runtime);assetVersions[asset]=entry.runtimeSha256;savedBytes+=entry.sourceBytes-entry.runtimeBytes;}
 return {assetVersions,count:prepared.length,savedBytes};
}

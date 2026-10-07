// Re-encode deployment copies only. Source art and authored frame layouts stay intact.
// CI consumes the checked-in copies; image-generation tooling is not needed to build.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url);
const moduleIndex=process.argv.indexOf('--sharp-module');
const sharp=require(moduleIndex>=0?process.argv[moduleIndex+1]:'sharp');
const root=path.resolve(import.meta.dirname,'..');
const sourceDir=path.join(root,'public/assets/duel');
const outputDir=path.join(root,'build-assets/duel-runtime');
fs.mkdirSync(outputDir,{recursive:true});
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const entries=[],rejected=[];
for(const file of fs.readdirSync(sourceDir).sort()){
 if(!file.endsWith('.webp'))continue;
 const source=fs.readFileSync(path.join(sourceDir,file));
 if(source.length<512*1024)continue;
 const metadata=await sharp(source).metadata();
 if(metadata.pages>1||metadata.icc){rejected.push({file,reason:'animation or color profile requires separate review'});continue;}
 const encoded=await sharp(source).webp({lossless:true,effort:6}).toBuffer();
 if(encoded.length>source.length*.90){rejected.push({file,reason:'less than 10% reduction',sourceBytes:source.length,encodedBytes:encoded.length});continue;}
 const before=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const after=await sharp(encoded).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 if(JSON.stringify(before.info)!==JSON.stringify(after.info))throw Error(file+': changed dimensions');
 let changedInvisibleChannels=0;
 for(let i=0;i<before.data.length;i+=4){
  if(before.data[i+3]!==after.data[i+3])throw Error(file+': changed alpha');
  for(let c=0;c<3;c++)if(before.data[i+c]!==after.data[i+c]){
   if(before.data[i+3]!==0)throw Error(file+': changed visible RGB');
   changedInvisibleChannels++;
  }
 }
 if(hash(fs.readFileSync(path.join(sourceDir,file)))!==hash(source))throw Error(file+': source changed during encode');
 fs.writeFileSync(path.join(outputDir,file),encoded);
 entries.push({file,sourceSha256:hash(source),runtimeSha256:hash(encoded),sourceBytes:source.length,runtimeBytes:encoded.length,width:before.info.width,height:before.info.height,alphaDifferences:0,visibleRGBDifferences:0,changedInvisibleChannels});
 console.log(`${file}: ${source.length} -> ${encoded.length}`);
}
// Never remove older copies implicitly: a removed entry simply stops being deployed.
const sourceBytes=entries.reduce((n,e)=>n+e.sourceBytes,0),runtimeBytes=entries.reduce((n,e)=>n+e.runtimeBytes,0);
fs.writeFileSync(path.join(outputDir,'manifest.json'),JSON.stringify({schema:1,method:'lossless WebP; alpha and every nonzero-alpha RGB channel identical',entries,rejected,sourceBytes,runtimeBytes,savedBytes:sourceBytes-runtimeBytes},null,2)+'\n');
console.log(JSON.stringify({accepted:entries.length,rejected:rejected.length,sourceBytes,runtimeBytes,savedBytes:sourceBytes-runtimeBytes}));

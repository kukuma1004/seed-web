// Deterministic platform exports only; artwork is authored with ImageGen.
// node tools/package-app-icon.mjs <opaque-art> <transparent-art> <sharp-module-path>
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const [opaque,foreground,sharpModule='sharp']=process.argv.slice(2);
if(!opaque||!foreground)throw new Error('Supply opaque and transparent source artwork.');
const sharp=require(sharpModule),root=new URL('../',import.meta.url),bg='#08251f';
const file=p=>new URL(p,root);
await mkdir(file('store/icon-cute-v1'),{recursive:true});
await sharp(opaque).resize(1024,1024).removeAlpha().png().toFile(fileURLToPath(file('store/icon-cute-v1/master.png')));
const save=async(p,buffer)=>writeFile(file(p),buffer);
const size=async(n)=>sharp(opaque).resize(n,n).removeAlpha().png().toBuffer();
for(const n of [192,512]){
 const png=await size(n);
 await save(`public/icons/seed-cute-v1-${n}.png`,png);
 // Keep existing installed-manifest URLs valid as well.
 await save(`public/icons/seed-${n}.png`,png);
}
await save('store/play-icon-512.png',await size(512));
await save('public/icons/seed-cute-v1-180.png',await size(180));
await save('public/icons/seed-cute-v1-32.png',await size(32));
const cutout=await sharp(foreground).trim().png().toBuffer();
await save('store/icon-cute-v1/foreground.png',cutout);
// Maskable web icon: fit the whole silhouette within the central safe circle.
const maskBody=await sharp(cutout).resize(330,330,{fit:'inside'}).png().toBuffer();
await save('public/icons/seed-cute-v1-maskable-512.png',await sharp({create:{width:512,height:512,channels:3,background:bg}}).composite([{input:maskBody,gravity:'centre'}]).png().toBuffer());
for(const [density,legacy,adaptive] of [['mdpi',48,108],['hdpi',72,162],['xhdpi',96,216],['xxhdpi',144,324],['xxxhdpi',192,432]]){
 const dir=`android/app/src/main/res/mipmap-${density}/`;
 const png=await size(legacy);
 await save(dir+'ic_launcher.png',png);
 await save(dir+'ic_launcher_round.png',png);
 // Android adaptive layers use a 108dp canvas with a central 66dp safe zone.
 const subject=await sharp(cutout).resize(Math.round(adaptive*.55),Math.round(adaptive*.55),{fit:'inside'}).png().toBuffer();
 await save(dir+'ic_launcher_foreground.png',await sharp({create:{width:adaptive,height:adaptive,channels:4,background:'#00000000'}}).composite([{input:subject,gravity:'centre'}]).png().toBuffer());
}
console.log('Exported web, Apple touch, Play listing and five Android icon densities.');

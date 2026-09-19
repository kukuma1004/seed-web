import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {THEMES,normalizeTheme} from './themes.js';

const alongZ=geometry=>geometry.rotateX(Math.PI/2);
const merge=(name,parts)=>{
 const geometries=parts.map((g,partIndex)=>{
  const geometry=g.index?g.toNonIndexed():g;if(geometry!==g)g.dispose();
  const position=geometry.getAttribute('position'),normal=geometry.getAttribute('normal'),colors=new Float32Array(position.count*3);
  const base=[.7,1.15,.9,1.35][partIndex%4];
  for(let i=0;i<position.count;i++){
   const tip=Math.max(0,Math.min(1,(position.getZ(i)+.4)/.8));
   const facet=normal?.count?Math.max(0,normal.getX(i)*.55+normal.getY(i)*.68+normal.getZ(i)*.28):0;
   const edge=Math.min(1,(Math.abs(position.getX(i))+Math.abs(position.getY(i)))/.22);
   const band=.5+.5*Math.cos((tip*2.1+partIndex*.19)*Math.PI*2);
   const brightness=base*(.68+tip*.28+facet*.1+edge*.055+band*.04);
   colors[i*3]=brightness;colors[i*3+1]=brightness*(.94+tip*.06);colors[i*3+2]=brightness*(.82+tip*.18);
  }
  geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));return geometry;
 });
 const out=mergeGeometries(geometries,false);out.name=`seed-shot-${name}`;out.computeVertexNormals();out.computeBoundingSphere();
 for(const g of geometries)g.dispose();return out;
};
const cone=(radius,length,sides=5)=>alongZ(new THREE.ConeGeometry(radius,length,sides,1,false));
const crystal=(x=.12,y=.12,z=.3)=>new THREE.OctahedronGeometry(1,0).scale(x,y,z);
const fin=(angle,length=.34,width=.09)=>cone(width,length,4).rotateZ(angle).translate(Math.sin(angle)*.07,Math.cos(angle)*.07,-.12);
const collar=(radius=.14,depth=.055,sides=6)=>alongZ(new THREE.CylinderGeometry(radius,radius*.9,depth,sides,1,false));

// Each projectile is still one mesh and one draw call. The extra detail lives in
// a merged low-poly silhouette instead of adding child meshes or dynamic lights.
export function createProjectileGeometries(){
 const geos={
  // The most common shot now reads as a tiny germinating seed: faceted kernel,
  // husk collar, two swept leaves and a bright growth point. All five pieces
  // are baked into the same geometry, so a room full of shots still pays one
  // mesh and one material per projectile exactly as before.
  seed:merge('seed',[
   crystal(.11,.1,.27),
   collar(.135,.06,6).translate(0,0,-.08),
   fin(.82,.27,.066),fin(-.82,.27,.066),
   crystal(.047,.047,.09).translate(0,0,.29)
  ]),
  split:merge('split',[crystal(.12,.12,.22),collar(.13,.045,5).translate(0,0,-.06),fin(0,.32,.075),fin(Math.PI*.66,.32,.075),fin(-Math.PI*.66,.32,.075)]),
  pierce:merge('pierce',[cone(.105,.62,5).translate(0,0,.12),crystal(.08,.08,.16).translate(0,0,-.22),fin(.72,.22,.045),fin(-.72,.22,.045)]),
  burst:merge('burst',[cone(.15,.48,6).translate(0,0,.08),collar(.15,.045,6).translate(0,0,-.08),fin(.9,.3,.09),fin(-.9,.3,.09),crystal(.07,.07,.18).translate(0,0,-.22)]),
  recall:merge('recall',[cone(.075,.5,4).translate(.08,0,.06),cone(.075,.5,4).rotateZ(Math.PI).translate(-.08,0,.06),crystal(.08,.06,.16),crystal(.045,.045,.09).translate(0,0,-.24)]),
  gravity:merge('gravity',[crystal(.15,.15,.24),new THREE.TorusGeometry(.21,.025,4,12).rotateX(Math.PI/2),fin(.75,.22,.045),fin(-.75,.22,.045)]),
  frost:merge('frost',[crystal(.12,.1,.34),collar(.115,.04,5).translate(0,0,-.05),cone(.06,.25,4).rotateZ(Math.PI/2).translate(.12,0,-.08),cone(.06,.25,4).rotateZ(-Math.PI/2).translate(-.12,0,-.08)]),
  chain:merge('chain',[cone(.08,.28,4).rotateZ(.45).translate(-.07,0,.14),cone(.08,.28,4).rotateZ(-.45).translate(.07,0,-.08),cone(.07,.25,4).rotateZ(.45).translate(-.06,0,-.28),crystal(.045,.045,.095).translate(.02,0,-.04)]),
  reflect:merge('reflect',[crystal(.15,.07,.3),collar(.13,.04,5).translate(0,0,-.05),fin(Math.PI/2,.25,.065),fin(-Math.PI/2,.25,.065)]),
  orbit:merge('orbit',[new THREE.TorusGeometry(.16,.035,4,12).rotateX(Math.PI/2),crystal(.07,.07,.23),fin(.72,.22,.045),fin(-.72,.22,.045)]),
  portal:merge('portal',[new THREE.TorusGeometry(.18,.035,5,12).rotateX(Math.PI/2),cone(.075,.42,5),cone(.055,.28,4).rotateZ(Math.PI).translate(0,0,-.2),fin(.72,.2,.04),fin(-.72,.2,.04)])
 };
 return Object.freeze(geos);
}

export function projectileGeometry(geometries,id){return geometries[id]||geometries.seed;}

// Critical shots keep the same one-mesh budget, but their 1.5x damage must be
// unmistakable before impact. Full shots use a 2x silhouette. Critical split
// fragments stop at normal full-shot size so a lucky split volley stays clear.
export const CRITICAL_PROJECTILE_SCALE=2;
export const CRITICAL_FRAGMENT_SCALE=1;
export function projectileVisualScale(fragment=false,critical=false){return fragment?(critical?CRITICAL_FRAGMENT_SCALE:.62):(critical?CRITICAL_PROJECTILE_SCALE:1);}

// Texture-free projectile skins. Collision and travel never change; only the
// existing mesh pose changes, so a theme adds no draw call or texture upload.
const PROJECTILE_MOTION=Object.freeze({
 seed:Object.freeze({spin:1,pulse:1,tilt:1}),split:Object.freeze({spin:1.55,pulse:1.15,tilt:1.3}),pierce:Object.freeze({spin:.28,pulse:.3,tilt:.18}),
 burst:Object.freeze({spin:.8,pulse:1.6,tilt:.65}),recall:Object.freeze({spin:1.75,pulse:.75,tilt:1.15}),gravity:Object.freeze({spin:.72,pulse:1.45,tilt:.9}),
 frost:Object.freeze({spin:.42,pulse:.55,tilt:.35}),chain:Object.freeze({spin:1.35,pulse:1.05,tilt:1.4}),reflect:Object.freeze({spin:1.5,pulse:.65,tilt:.75}),
 orbit:Object.freeze({spin:2,pulse:.8,tilt:1.1}),portal:Object.freeze({spin:1.25,pulse:1.25,tilt:.85})
});
export function applyProjectileTheme(mesh,id,themeId,age,baseScale=1){
 const theme=THEMES[normalizeTheme(themeId)],motion=PROJECTILE_MOTION[id]||PROJECTILE_MOTION.seed,t=Number.isFinite(age)?age:0;
 const phase=t*(5.2+motion.spin),wave=Math.sin(phase),pulse=1+wave*theme.projectilePulse*motion.pulse;
 let sx=theme.projectileScale[0]*baseScale*pulse,sy=theme.projectileScale[1]*baseScale*pulse,sz=theme.projectileScale[2]*baseScale;
 if(theme.projectileMotion==='collapse'){const pinch=1-wave*.065*motion.pulse;sx*=pinch;sy*=2-pinch;sz*=1+Math.cos(phase*.7)*.045;mesh.rotation.x=Math.sin(phase*.53)*.18*motion.tilt;mesh.rotation.z=t*theme.projectileSpin*motion.spin;}
 else if(theme.projectileMotion==='packet'){const tick=Math.floor(t*16)%4;sz*=1+(tick===0?.11:0);sx*=tick===2?.88:1;mesh.rotation.x=0;mesh.rotation.z=Math.round(t*theme.projectileSpin*motion.spin/(Math.PI/2))*(Math.PI/2);}
 else if(theme.projectileMotion==='twinkle'){const star=1+Math.max(0,Math.sin(phase*1.4))*.09*motion.pulse;sx*=star;sy*=star;mesh.rotation.x=Math.sin(t*2.1)*.13*motion.tilt;mesh.rotation.z=t*theme.projectileSpin*motion.spin;}
 else{mesh.rotation.x=Math.sin(phase*.72)*.09*motion.tilt;mesh.rotation.z=Math.sin(phase*.58)*.22*motion.tilt+t*theme.projectileSpin*motion.spin*.12;}
 mesh.scale.set(sx,sy,sz);return mesh;
}

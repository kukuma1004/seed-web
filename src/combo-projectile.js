import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {COMBO_LAW_BY_ID} from './combo-catalog.js';

// One deterministic visual grammar serves the live 58 forms and the future
// 1,090-entry catalogue. A recipe is data only, so choice cards and the 3D
// combat projectile can never drift into unrelated designs.
const FALLBACK='#d6efc7';
const LAW_SHAPES=Object.freeze({
 reflect:'prism',split:'petal',chain:'fork',orbit:'ring',pierce:'spear',
 burst:'flare',recall:'crescent',gravity:'well',frost:'crystal',portal:'gate'
});
const AUDIO=Object.freeze({
 reflect:'shotCrystal',split:'shotPetal',chain:'shotArc',orbit:'shotOrbit',
 pierce:'shotPierce',burst:'shotBurst',recall:'shotReturn',gravity:'shotGravity',
 frost:'shotFrost',portal:'shotPortal'
});
const hash=text=>{let value=2166136261;for(let i=0;i<text.length;i++)value=Math.imul(value^text.charCodeAt(i),16777619);return value>>>0;};
const unique=values=>[...new Set((values||[]).filter(Boolean))];

export function projectileRecipe(form){
 const laws=unique(form?.requires||form?.laws||[]);
 const primary=laws[0]||'split',secondary=laws[1]||primary,tail=laws[2]||secondary;
 const accent=form?.visual?.accent||COMBO_LAW_BY_ID[primary]?.color||FALLBACK;
 const secondaryColor=form?.visual?.secondary||COMBO_LAW_BY_ID[secondary]?.color||accent;
 const seed=hash(`${form?.id||'seed'}:${laws.join('+')}`);
 return Object.freeze({
  id:form?.id||'seed',laws:Object.freeze(laws),primary,secondary,tail,
  core:LAW_SHAPES[primary]||'seed',shell:LAW_SHAPES[secondary]||'ring',trail:LAW_SHAPES[tail]||'petal',
  accent,secondaryColor,gold:Boolean(form?.awakened),twin:Boolean(form?.twin),second:Boolean(form?.second),
  coreVariant:form?.visual?.coreTile??seed%12,shellVariant:form?.visual?.shellTile??(seed>>>7)%12,
  trailVariant:form?.visual?.projectileTile??(seed>>>13)%12,
  twist:((seed>>>5)%9-4)*.055,mark:(form?.visual?.mark??seed)%6,audio:AUDIO[primary]||'shot'
 });
}

function colorGeometry(geometry,color,tip=1.12){
 const g=geometry.index?geometry.toNonIndexed():geometry;if(g!==geometry)geometry.dispose();
 g.deleteAttribute('uv');g.computeVertexNormals();g.computeBoundingBox();
 const p=g.getAttribute('position'),n=g.getAttribute('normal'),base=new THREE.Color(color),out=[];
 const min=g.boundingBox.min.z,max=g.boundingBox.max.z,span=max-min||1;
 for(let i=0;i<p.count;i++){
  const t=(p.getZ(i)-min)/span,shade=.7+.18*Math.max(0,n.getY(i))+.12*t;
  const c=base.clone().multiplyScalar(shade*(1+(tip-1)*t));out.push(c.r,c.g,c.b);
 }
 g.setAttribute('color',new THREE.Float32BufferAttribute(out,3));return g;
}
function crescent(scale=.25){
 const s=new THREE.Shape();s.moveTo(-.45,-.3);s.bezierCurveTo(-.05,-.12,.25,.04,.4,.5);s.bezierCurveTo(.63,.08,.43,-.4,.08,-.48);s.bezierCurveTo(-.18,-.5,-.35,-.4,-.45,-.3);
 // A flat double-sided cutout is enough from the fixed top camera and avoids
 // hundreds of bevel vertices on recall-heavy builds.
 return new THREE.ShapeGeometry(s,4).rotateX(Math.PI/2).scale(scale,scale,scale);
}
function part(shape,scale=.24){
 switch(shape){
  case 'prism':return new THREE.OctahedronGeometry(scale,0).scale(.72,.72,1.6);
  case 'petal':return new THREE.SphereGeometry(scale,6,4).scale(.55,.3,1.45);
  case 'fork':return new THREE.ConeGeometry(scale*.55,scale*2.25,5).rotateX(Math.PI/2);
  case 'ring':return new THREE.TorusGeometry(scale*.8,scale*.18,3,8).rotateX(Math.PI/2);
  case 'spear':return new THREE.ConeGeometry(scale*.5,scale*3,5).rotateX(Math.PI/2);
  case 'flare':return new THREE.DodecahedronGeometry(scale*.82,0).scale(.85,.85,1.25);
  case 'crescent':return crescent(scale*1.18);
  case 'well':return new THREE.SphereGeometry(scale*.72,6,4).scale(1,1,.78);
  case 'crystal':return new THREE.OctahedronGeometry(scale,0).scale(.6,.82,1.72);
  case 'gate':return new THREE.TorusGeometry(scale*.76,scale*.2,3,8).rotateX(Math.PI/2);
  default:return new THREE.SphereGeometry(scale,6,4);
 }
}

// Built only for an equipped generated form, never for all catalogue entries.
// All decoration is merged into one geometry and therefore remains one draw.
export function buildComboProjectileGeometry(input){
 const recipe=input?.core?input:projectileRecipe(input),parts=[];
 const coreWide=.86+(recipe.coreVariant%4)*.09,coreLong=.92+(Math.floor(recipe.coreVariant/4)%3)*.13;
 const core=colorGeometry(part(recipe.core,.25),recipe.accent).scale(coreWide,2-coreWide,coreLong).rotateZ(recipe.twist).translate(0,0,.08);parts.push(core);
 const shellTilt=(recipe.shellVariant%6-2.5)*.12;
 const shell=colorGeometry(part(recipe.shell,.2),recipe.secondaryColor).scale(.82+(recipe.shellVariant%3)*.1,1.08,.9).rotateZ(shellTilt).translate(0,0,-.02);parts.push(shell);
 const tailSide=(recipe.trailVariant%5-2)*.025;
 const tail=colorGeometry(part(recipe.trail,.13),recipe.gold?'#ffd77b':recipe.accent,.94).scale(.62+(recipe.trailVariant%4)*.07,.7,1.05+(recipe.trailVariant%3)*.12).rotateZ(-recipe.twist*2).translate(tailSide,0,-.38);parts.push(tail);
 if(recipe.mark)parts.push(colorGeometry(new THREE.TetrahedronGeometry(.045+.006*recipe.mark,0),recipe.secondaryColor).translate(recipe.mark%2?.2:-.2,.02,-.05));
 if(recipe.gold)parts.push(colorGeometry(new THREE.TorusGeometry(.27,.026,3,8).rotateX(Math.PI/2),'#ffd77b').translate(0,0,.02));
 if(recipe.twin)parts.push(colorGeometry(part(recipe.shell,.12),recipe.secondaryColor).translate(.2,0,-.08));
 const geometry=mergeGeometries(parts,false);for(const p of parts)p.dispose();
 geometry.name=`seed-combo-projectile-${recipe.id}`;geometry.computeBoundingSphere();return geometry;
}

const svgShape=(shape,color,secondary)=>{
 const common=`fill="${color}" stroke="${secondary}" stroke-width="3" stroke-linejoin="round"`;
 switch(shape){
  case 'prism':return `<path ${common} d="M50 12 70 45 50 78 30 45Z"/><path d="M50 12v66M30 45h40" stroke="#fff" stroke-opacity=".55"/>`;
  case 'petal':return `<path ${common} d="M50 12C76 28 73 61 50 78 27 61 24 28 50 12Z"/><path d="M50 22v46" stroke="#fff" stroke-opacity=".55"/>`;
  case 'fork':return `<path ${common} d="M45 13h10v29l19-16 7 9-25 22v21H44V56L19 35l7-9 19 16Z"/>`;
  case 'ring':return `<circle cx="50" cy="45" r="25" fill="none" stroke="${color}" stroke-width="10"/><circle cx="50" cy="45" r="8" fill="${secondary}"/>`;
  case 'spear':return `<path ${common} d="M50 7 67 44 57 42 57 79H43V42L33 44Z"/>`;
  case 'flare':return `<path ${common} d="m50 8 9 22 22-8-11 21 20 12-24 3 2 24-18-16-18 16 2-24-24-3 20-12-11-21 22 8Z"/>`;
  case 'crescent':return `<path ${common} d="M67 14C42 23 36 58 61 76 29 77 13 45 30 20 39 7 54 6 67 14Z"/>`;
  case 'well':return `<circle cx="50" cy="45" r="30" fill="url(#well)" stroke="${secondary}" stroke-width="3"/><circle cx="50" cy="45" r="8" fill="#081016"/>`;
  case 'crystal':return `<path ${common} d="M50 7 68 34 60 76 50 84 40 76 32 34Z"/><path d="m32 34 18 12 18-12M50 7v77" stroke="#fff" stroke-opacity=".5" fill="none"/>`;
  case 'gate':return `<ellipse cx="50" cy="45" rx="28" ry="34" fill="none" stroke="${color}" stroke-width="9"/><path d="M36 45h28" stroke="${secondary}" stroke-width="5"/>`;
  default:return `<circle cx="50" cy="45" r="25" ${common}/>`;
 }
};

export function comboProjectilePreview(form,{compact=false}={}){
 const r=projectileRecipe(form),label=`${(COMBO_LAW_BY_ID[r.primary]?.name||'씨앗')} 핵 · ${(COMBO_LAW_BY_ID[r.secondary]?.name||'성질')} 외피`;
 const gradientId=`shot-trail-${String(r.id).replace(/[^a-z0-9-]/gi,'-')}-${r.mark}`;
 const wellId=`shot-well-${String(r.id).replace(/[^a-z0-9-]/gi,'-')}`;
 const stars=r.gold?'<path d="m76 15 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="#ffd77b"/>':'';
 const mark=r.mark?`<circle cx="${82+(r.mark%2)*8}" cy="${65-r.mark*3}" r="${2+r.mark*.35}" fill="${r.secondaryColor}" stroke="#fff" stroke-opacity=".45"/>`:'';
 const core=svgShape(r.core,r.accent,r.secondaryColor).replace('url(#well)',`url(#${wellId})`);
 const shell=svgShape(r.shell,r.secondaryColor,r.accent).replace('url(#well)',`url(#${wellId})`);
 return `<div class="projectile-preview${compact?' compact':''}" title="${label}"><svg viewBox="0 0 150 90" aria-hidden="true"><defs><radialGradient id="${wellId}"><stop stop-color="#060b13"/><stop offset=".7" stop-color="${r.accent}"/><stop offset="1" stop-color="#05070d"/></radialGradient><linearGradient id="${gradientId}" x1="0" x2="1"><stop stop-color="${r.secondaryColor}" stop-opacity="0"/><stop offset="1" stop-color="${r.accent}" stop-opacity=".9"/></linearGradient></defs><path d="M8 45Q38 ${30+r.mark*4} 72 45" fill="none" stroke="url(#${gradientId})" stroke-width="${r.twin?10:7}" stroke-linecap="round"/><g transform="translate(65 0) rotate(${(r.coreVariant%5-2)*3} 50 45)">${core}${r.core!==r.shell?`<g transform="translate(8 3) scale(.72)" opacity=".72">${shell}</g>`:''}${stars}${mark}</g></svg><span>탄환 문양 · ${label}</span></div>`;
}

export function projectileAudioEvent(form){return projectileRecipe(form).audio;}

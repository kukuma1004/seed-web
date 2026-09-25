import assert from 'node:assert/strict';
import * as THREE from 'three';
import {ALL_FORMS,AWAKEN_FORMS} from '../src/forms.js';
import {projectileAtlasTile} from '../src/combo-projectile.js';
import {createFormCombat} from '../src/form-combat.js';
import {createFinalBranchCombat} from '../src/final-branch-combat.js';
import {FINAL_BRANCH_PATTERNS} from '../src/final-branch-patterns.js';

const V=THREE.Vector3;
const paintedTile=projectileAtlasTile;
for(const form of Object.values(ALL_FORMS)){
 const tile=paintedTile(form);
 assert.ok(Number.isInteger(tile)&&tile>=0&&tile<12,`${form.id} has no projectile atlas cell`);
}
assert.equal(paintedTile(ALL_FORMS.blastlance),1,'blast lance uses the burning spear painting');
assert.equal(paintedTile(ALL_FORMS.refractlance),3,'refract lance uses the crystal spear painting');
assert.equal(paintedTile(ALL_FORMS.thunderlance),2,'thunder lance uses the lightning spear painting');

const silent=[];
for(const form of Object.values(ALL_FORMS)){
 const player={position:new V()},scene=new THREE.Scene(),foes=[2,4,6].map(x=>({type:'hound',dead:false,g:{position:new V(x,0,0)}}));
 let drawn=0;const vfx=Object.fromEntries(['muzzle','burst','flame','explosion','trail','lance','frostWeb','rewindTrace','mirrorArc','gardenVortex','sunburst','arc','reflect','split','portal'].map(key=>[key,()=>{drawn++;}]));
 const combat=createFormCombat(scene,{player,camera:new THREE.PerspectiveCamera(),comboTexture:new THREE.Texture(),enemies:()=>foes,hit:()=>true,blocked:()=>false,boundary:()=>false,constrain:()=>{},vfx});
 combat.set(form.id);combat.fire(player.position,new V(1,0,0));combat.update(.05);
 if(!drawn&&!combat.projectileBodies([]).length&&!combat.state().orbit)silent.push(form.id);
 combat.dispose();
}
assert.deepEqual(silent,[],'forms with no visible opening attack or body');

// These attacks resolve damage instantly. Their moving painted silhouette is
// nevertheless required: a thin hit line alone disappears on mobile screens.
const directLances=['thunderlance','icicle','refractlance','pierceshower','glassspear','blastlance','gravitystake'];
for(const id of directLances){
 const scene=new THREE.Scene(),player={position:new V(0,0,0)},camera=new THREE.PerspectiveCamera();
 const calls={lance:0};
 const combat=createFormCombat(scene,{player,camera,comboTexture:new THREE.Texture(),enemies:()=>[],hit:()=>true,blocked:()=>false,boundary:()=>false,constrain:()=>{},vfx:{lance(){calls.lance++;}}});
 combat.set(id);combat.fire(player.position,new V(1,0,0));
 const bodies=combat.projectileBodies([]);
 assert.ok(calls.lance>0,`${id}: missing directional hit silhouette`);
 assert.ok(bodies.some(b=>b.spriteKey==='combo'&&b.life>0),`${id}: missing painted travelling lance`);
 assert.equal(bodies[0].spriteCell,paintedTile(ALL_FORMS[id]),`${id}: combat sheet differs from its law identity`);
 assert.ok(bodies.every(b=>!b.ob.isMesh),`${id}: hitscan visual allocated a scene mesh`);
 const start=bodies[0].ob.position.x;combat.update(.1);
 assert.ok(bodies[0].ob.position.x>start,`${id}: lance painting does not move`);
 combat.dispose();
}
{
 const scene=new THREE.Scene(),player={position:new V()},target={type:'hound',dead:false,g:{position:new V(3,0,0)}},calls={lance:0};
 const combat=createFormCombat(scene,{player,camera:new THREE.PerspectiveCamera(),comboTexture:new THREE.Texture(),enemies:()=>[target],hit:()=>true,blocked:()=>false,boundary:()=>false,constrain:()=>{},vfx:{lance(){calls.lance++;}}});
 combat.set('spearring');combat.update(.05);
 assert.ok(calls.lance>0&&combat.projectileBodies([]).some(b=>b.spriteKey==='combo'), 'spearring orbit launches a painted lance');
 combat.dispose();
}

// Every final branch with an independent moving shot needs a visible body.
let movingFinals=0;
for(const form of Object.values(AWAKEN_FORMS).filter(f=>f.finalCandidate)){
 const spec=FINAL_BRANCH_PATTERNS[form.id];
 if(!['fan','return','ricochet','spiral'].includes(spec.motion))continue;
 const player={position:new V()},fx={},combat=createFinalBranchCombat({player,enemies:()=>[],deal:()=>true,boundary:()=>false,reflector:()=>false,blocked:()=>false,constrain:()=>{},fx});
 combat.set(form.id,30,1,false,form.base);
 combat.onFire(new V(),new V(1,0,0));
 const bodies=combat.visualShots([],paintedTile(form));
 assert.ok(bodies.length>0,`${form.id}: final shot has only a trail`);
 assert.ok(bodies.every(b=>b.spriteKey==='combo'&&b.life>0&&b.ob.position instanceof V),`${form.id}: final shot has no render body`);
 movingFinals++;
}
console.log(`Projectile visibility: ${Object.keys(ALL_FORMS).length} atlas mappings, ${directLances.length+1} painted hitscan lances, ${movingFinals} moving final branches passed.`);

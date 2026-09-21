import assert from 'node:assert/strict';
import * as THREE from 'three';
import {SPRITE_LIGHTING_VERSION,applySpriteLighting} from '../src/sprite-lighting.js';

const material=applySpriteLighting(new THREE.SpriteMaterial({map:new THREE.Texture()}));
assert.equal(material.userData.spriteLighting.version,SPRITE_LIGHTING_VERSION);
const shader={fragmentShader:'#include <common>\n#include <map_fragment>'};material.onBeforeCompile(shader);
assert(shader.fragmentShader.includes('seedLightDome'));
assert(shader.fragmentShader.includes('diffuseColor.rgb*=mix(seedLightShadow,seedLightHighlight,seedLightKey)'));
assert(shader.fragmentShader.includes('uniform float seedLightShadow;'));
assert(material.customProgramCacheKey().includes(SPRITE_LIGHTING_VERSION));
// 값이 다른 그림도 셰이더 하나를 함께 쓰고, 값은 예전과 같은 소수 넷째 자리로 유니폼에 들어간다.
const other=applySpriteLighting(new THREE.SpriteMaterial({map:new THREE.Texture()}),{shadow:.74,highlight:1.07,rim:0xffffff,rimStrength:.065});
assert.equal(other.customProgramCacheKey(),material.customProgramCacheKey());
const s2={fragmentShader:'#include <map_fragment>'};other.onBeforeCompile(s2);
assert.equal(s2.uniforms.seedLightShadow.value,.74);assert.equal(s2.uniforms.seedLightHighlight.value,1.07);assert.equal(s2.uniforms.seedLightRimStrength.value,.065);
assert.deepEqual(s2.uniforms.seedLightRimColor.value.toArray(),[1,1,1]);
assert.equal(shader.fragmentShader.replace(/\s+/g,' ').includes('seedLightRimColor*seedLightRimStrength'),true);
console.log('Painted sprites share one dome-light shader; per-art values are uniforms.');

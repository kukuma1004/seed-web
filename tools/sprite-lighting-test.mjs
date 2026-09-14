import assert from 'node:assert/strict';
import * as THREE from 'three';
import {SPRITE_LIGHTING_VERSION,applySpriteLighting} from '../src/sprite-lighting.js';

const material=applySpriteLighting(new THREE.SpriteMaterial({map:new THREE.Texture()}));
assert.equal(material.userData.spriteLighting.version,SPRITE_LIGHTING_VERSION);
const shader={fragmentShader:'#include <map_fragment>'};material.onBeforeCompile(shader);
assert(shader.fragmentShader.includes('seedLightDome'));
assert(shader.fragmentShader.includes('diffuseColor.rgb*=mix'));
assert(material.customProgramCacheKey().includes(SPRITE_LIGHTING_VERSION));
console.log('Painted sprites receive one stable dome-light shader without extra geometry.');

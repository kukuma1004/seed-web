import assert from 'node:assert/strict';
import {createCameraFeel} from '../src/camera-feel.js';

const camera=createCameraFeel();
let pose=camera.follow(1/60,{playerX:0,playerZ:0,moveX:0,moveZ:0,baseZoom:1.3});
assert.equal(pose.zoom,1.3,'ordinary framing has no dynamic enemy-count zoom');
for(let i=0;i<20;i++)pose=camera.follow(1/60,{playerX:i*.08,playerZ:0,moveX:.08,moveZ:0,followX:.5,followZ:.4,baseZoom:1.3});
assert.ok(pose.lookAhead.x>.35&&pose.x>0,'deliberate movement creates a bounded look-ahead');
const before=pose.lookAhead.x;for(let i=0;i<30;i++)pose=camera.follow(1/60,{playerX:1.6,playerZ:0,moveX:.0001,moveZ:0,followX:.5,followZ:.4,baseZoom:1.3});
assert.ok(pose.lookAhead.x<before*.2,'tiny stick noise decays instead of moving the camera');
const skyCamera=createCameraFeel();let skyPose=null;
for(let i=0;i<60;i++)skyPose=skyCamera.follow(1/60,{playerX:i*.1,playerZ:0,moveX:.1,moveZ:0,followX:.045,followZ:.02,leadScale:0,baseZoom:1.3});
assert.equal(skyPose.lookAhead.x,0,'3막은 이동 입력에 따라 탄이 같이 밀려 보이지 않도록 시선 선행을 끈다');
camera.triggerUltimate(true);assert.equal(camera.stepEffects(.01),.08,'only an ultimate requests a short simulation hold');
pose=camera.follow(.01,{baseZoom:1.3});assert.notEqual(pose.zoom,1.3,'ultimate activation owns a brief camera punch');
for(let i=0;i<60;i++){camera.stepEffects(1/60);pose=camera.follow(1/60,{baseZoom:1.3});}
assert.ok(Math.abs(pose.zoom-1.3)<1e-6,'camera returns exactly to the fixed device zoom');
// 시선 당기기(3막): 적이 오는 쪽으로 화면을 밀되, 값은 안전 범위 안에서만 쓴다.
{
 const plain=createCameraFeel(),ahead=createCameraFeel();
 let a=null,b=null;
 for(let i=0;i<120;i++){a=plain.follow(1/60,{playerX:0,playerZ:5.5,followX:.5,followZ:.4,baseZoom:1.3});b=ahead.follow(1/60,{playerX:0,playerZ:5.5,followX:.5,followZ:.4,baseZoom:1.3,biasZ:-2});}
 assert.ok(b.z<a.z-1.8,'시선이 적 쪽으로 당겨진다');
 assert.equal(b.x,a.x,'좌우는 그대로다');
 const wild=createCameraFeel();let c=null;
 for(let i=0;i<200;i++)c=wild.follow(1/60,{playerZ:0,biasZ:-99});
 assert.ok(c.z>-6.1,'터무니없는 값은 잘려서 화면이 날아가지 않는다');
 const broken=createCameraFeel();let d=null;
 for(let i=0;i<60;i++)d=broken.follow(1/60,{playerZ:0,biasZ:Number.NaN});
 assert.ok(Number.isFinite(d.z),'값이 없으면 예전과 똑같이 움직인다');
}
console.log('Camera deadzone, movement look-ahead and ultimate-only punch, forward bias passed.');

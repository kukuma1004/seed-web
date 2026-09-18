import fs from 'node:fs';
import assert from 'node:assert/strict';

const manifest=fs.readFileSync(new URL('../android/app/src/main/AndroidManifest.xml',import.meta.url),'utf8');
const activity=fs.readFileSync(new URL('../android/app/src/main/java/kr/jpmathlab/seed/MainActivity.java',import.meta.url),'utf8');
const mobile=fs.readFileSync(new URL('../src/mobile-app.js',import.meta.url),'utf8');

assert.match(manifest,/android:appCategory="game"/,'Android 앱을 게임으로 분류해야 합니다.');
assert.match(manifest,/android:resizeableActivity="true"/,'대형 화면에서 창 크기 조절을 허용해야 합니다.');
assert.doesNotMatch(manifest,/android:screenOrientation=/,'매니페스트에서 화면 방향을 고정하면 안 됩니다.');
for(const change of ['orientation','screenSize','smallestScreenSize','screenLayout','density']){
  assert.match(manifest,new RegExp(`android:configChanges="[^"]*${change}`),`${change} 구성 변경 처리가 필요합니다.`);
}
assert.match(activity,/WindowCompat\.enableEdgeToEdge\(getWindow\(\)\)/,'Android 15 전체 화면 API를 사용해야 합니다.');
assert.match(activity,/BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE/,'몰입형 시스템 바 동작을 유지해야 합니다.');
assert.match(activity,/SCREEN_ORIENTATION_SENSOR_LANDSCAPE/,'Android 앱은 실행 즉시 센서 기반 가로 화면을 요청해야 합니다.');
assert.match(mobile,/nativeApp\)[\s\S]*screen\.orientation\?\.lock[\s\S]*'landscape'/,'앱에서 플레이를 시작할 때 가로 화면을 요청해야 합니다.');

console.log('Android adaptive display checks passed.');

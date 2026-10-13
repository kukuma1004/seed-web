import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {DECOR_PROP_ART,DECOR_PROP_REGIONS} from '../src/garden-decor-art.js';
// Inspect the actual shipping WebP rather than mocked Image availability.
const result=spawnSync('python',['-c',`
import sys,json,hashlib
from PIL import Image
p=json.load(sys.stdin); im=Image.open(p['path']).convert('RGBA'); w,h=im.size
assert w%4==0 and h%3==0 and w//4==h//3, 'Square sprite cells required'
assert im.getchannel('A').getextrema()==(0,255), 'Actual transparent RGBA required'
cw,ch=w//4,h//3; rows=[]
for i,r in enumerate(p['regions']):
 x0,y0,x1,y1=r; box=(round((i%4+x0)*cw),round((i//4+y0)*ch),round((i%4+x1)*cw),round((i//4+y1)*ch))
 assert box[0]>=0 and box[1]>=0 and box[2]<=w and box[3]<=h
 c=im.crop(box); a=c.getchannel('A'); visible=sum(v>180 for v in a.getdata())
 assert visible>5000, 'Empty or fragmented prop'
 assert a.getbbox()[3]>=c.height-5, 'Feet must reach cropped bottom pivot'
 rows.append({'tile':i,'width':c.width,'height':c.height,'opaque':visible,'hash':hashlib.sha256(c.tobytes()).hexdigest()})
assert len(set(r['hash'] for r in rows))==12
print(json.dumps({'ok':True,'width':w,'height':h,'cells':12,'trueAlpha':True,'props':rows}))
`],{input:JSON.stringify({path:'public/'+DECOR_PROP_ART,regions:DECOR_PROP_REGIONS}),encoding:'utf8'});
assert.equal(result.status,0,result.stderr);const proof=JSON.parse(result.stdout);
console.log(`Garden artwork PASS: ${proof.width}×${proof.height}, twelve distinct decoded props, transparent alpha and measured bottom pivots. Pixel integrity; artistic/device judgment separate.`);

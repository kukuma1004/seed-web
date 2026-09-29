# 정원 v2 그림 내보내기: 빈 장면 + 자리 조각(garden_spot_part.py 결과)을 게임용 webp로.
# 사용: python tools/garden_spot_export.py <테마> <원화 폴더(빈장면.png)> <조각 폴더(1A_part.png …)> [배율=0.8]
# 좌표는 src/garden-spots.js 에 원래 크기(1536×1024) 그대로 두고, 그림만 줄여 싣는다(화면은 % 로 놓는다).
import sys,os
from PIL import Image
theme,base,parts=sys.argv[1:4];scale=float(sys.argv[4]) if len(sys.argv)>4 else .8
out=f'public/assets/garden/v2/{theme}';os.makedirs(out,exist_ok=True)
b=Image.open(base).convert('RGB');b=b.resize((round(b.width*scale),round(b.height*scale)),Image.LANCZOS);b.save(f'{out}/base.webp',quality=82,method=6)
total=os.path.getsize(f'{out}/base.webp')
for f in sorted(os.listdir(parts)):
 if not f.endswith('_part.png'):continue
 code=f.split('_')[0];im=Image.open(os.path.join(parts,f)).convert('RGBA')
 im=im.resize((max(1,round(im.width*scale)),max(1,round(im.height*scale))),Image.LANCZOS);im.save(f'{out}/{code}.webp',quality=84,method=6)
 total+=os.path.getsize(f'{out}/{code}.webp')
print(f'{out}: {total//1024} KB')

# 빈 장면에 좌표 격자(128px마다 선, 숫자는 장면 픽셀)를 그려 자리 범위(region)를 눈으로 잡기 쉽게 한다.
# 사용: python tools/garden_grid.py <작업 폴더>  → 작업 폴더/확인_격자.jpg
import sys,os
from PIL import Image,ImageDraw
folder=sys.argv[1];im=Image.open(os.path.join(folder,'base.png')).convert('RGB');W,H=im.size;d=ImageDraw.Draw(im)
for x in range(0,W,128):
    d.line([(x,0),(x,H)],fill=(255,0,255),width=2);d.text((x+4,4),str(x),fill=(255,255,0))
for y in range(0,H,128):
    d.line([(0,y),(W,y)],fill=(0,255,255),width=2);d.text((4,y+4),str(y),fill=(255,255,0))
im.save(os.path.join(folder,'확인_격자.jpg'),quality=85);print(os.path.join(folder,'확인_격자.jpg'))

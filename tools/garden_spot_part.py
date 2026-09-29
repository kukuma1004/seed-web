# 정원 v2 자리 조각 뽑기: 빈 장면과 "그 자리만 채운" 그림의 차이로 물건만 떼어 낸다.
# 사용: python tools/garden_spot_part.py 빈.png 채운.png x0,y0,x1,y1 출력.png [확인.jpg]
# 출력 PNG는 자리 상자 크기(투명 배경)이고, 상자 왼쪽 위 좌표는 파일 이름과 함께 garden-v2 자리 표에 적는다.
import sys,numpy as np
from PIL import Image,ImageFilter
base_p,fill_p,box,out_p=sys.argv[1:5];chk=sys.argv[5] if len(sys.argv)>5 else None
x0,y0,x1,y1=map(int,box.split(','))
A=Image.open(base_p).convert('RGB');F=Image.open(fill_p).convert('RGB')
if F.size!=A.size:F=F.resize(A.size,Image.LANCZOS)
a=np.asarray(A.filter(ImageFilter.GaussianBlur(2)),np.int16)[y0:y1,x0:x1]
f=np.asarray(F.filter(ImageFilter.GaussianBlur(2)),np.int16)[y0:y1,x0:x1]
d=np.abs(a-f).max(2)
# 다시 그려진 선 정도(약한 차이)는 버리고, 확실한 변화에서 시작해 이어진 약한 변화까지 번진다
strong=d>34;weak=d>16
m=Image.fromarray((strong*255).astype(np.uint8))
m=m.filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.MinFilter(9))  # 닫기
m=m.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))  # 작은 점 지우기
grow=np.asarray(m)>0
for _ in range(6):
 g=np.asarray(Image.fromarray((grow*255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5)))>0
 grow=grow|(g&weak)
m=Image.fromarray((grow*255).astype(np.uint8))
# 작은 덩어리 버리기
from collections import deque
arr=np.asarray(m)>0;H,W=arr.shape;lab=np.zeros((H,W),np.int32);keep=np.zeros_like(arr);n=0
for yy in range(H):
 for xx in range(W):
  if arr[yy,xx] and not lab[yy,xx]:
   n+=1;q=deque([(yy,xx)]);lab[yy,xx]=n;pts=[]
   while q:
    cy,cx=q.popleft();pts.append((cy,cx))
    for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
     ny,nx=cy+dy,cx+dx
     if 0<=ny<H and 0<=nx<W and arr[ny,nx] and not lab[ny,nx]:lab[ny,nx]=n;q.append((ny,nx))
   if len(pts)>=400:
    ys,xs=zip(*pts);keep[list(ys),list(xs)]=True
m=Image.fromarray((keep*255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(1.5))
rgba=F.crop((x0,y0,x1,y1)).convert('RGBA');rgba.putalpha(m);rgba.save(out_p)
cov=(np.asarray(m)>128).mean()
print(f'{out_p}: 덮는 비율 {cov*100:.1f}%')
if chk:
 # 확인: 빈 장면 위에 조각을 얹은 그림 + 조각만(체크무늬)
 comp=A.copy().convert('RGBA');comp.alpha_composite(rgba,(x0,y0))
 cb=Image.new('RGBA',rgba.size,(255,0,255,255));cb.alpha_composite(rgba)
 w=comp.width//2;c=comp.resize((w,comp.height//2)).convert('RGB')
 s=cb.convert('RGB');s.thumbnail((w//2,c.height))
 sheet=Image.new('RGB',(w+s.width,c.height),(20,20,20));sheet.paste(c,(0,0));sheet.paste(s,(w,0));sheet.save(chk,quality=85)

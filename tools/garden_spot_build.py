# 정원 v2 한 정원 통째로 만들기: 빈 장면 + 자리별 채운 그림(모습 A·B·C) → 자리 범위 자동 찾기 → 조각 추출 → 게임용 webp + 자리 표(js).
# 사용: python tools/garden_spot_build.py <작업 폴더>
#   작업 폴더에 base.png(빈 장면)와 manifest.json:
#   {"theme":"meadow","spots":[{"id":"1","name":"왼쪽 꽃밭","region":[x0,y0,x1,y1],"styles":{"A":{"name":"들꽃","file":"1A.png"},"B":{...},"C":{...}}}, ...]}
#   region: 그 자리를 찾을 대략의 범위(장면 픽셀, 넉넉히). 없으면 그림 전체에서 찾는다(다시 그려진 잡티가 잡힐 수 있어 권장하지 않음).
# 결과: public/assets/garden/v2/<theme>/base.webp · <id><A|B|C>.webp, src/garden-spots/<theme>.js, 작업 폴더/확인_<id>.jpg · 확인_전체.jpg
# 자리 범위 = 세 모습의 바뀐 곳을 모두 덮는 상자(+여백). 한 모습이라도 바뀐 곳이 거의 없으면 실패로 알려 준다(다시 그려 받기).
import sys,os,json
from collections import deque
import numpy as np
from PIL import Image,ImageFilter

SCALE=.8
def changed_mask(A,F,box):
    x0,y0,x1,y1=box
    a=np.asarray(A.filter(ImageFilter.GaussianBlur(2)),np.int16)[y0:y1,x0:x1]
    f=np.asarray(F.filter(ImageFilter.GaussianBlur(2)),np.int16)[y0:y1,x0:x1]
    d=np.abs(a-f).max(2);strong=d>34;weak=d>16
    m=Image.fromarray((strong*255).astype(np.uint8)).filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.MinFilter(9))
    m=m.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))
    grow=np.asarray(m)>0
    for _ in range(6):
        g=np.asarray(Image.fromarray((grow*255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5)))>0
        grow=grow|(g&weak)
    # 작은 덩어리 버리기
    H,W=grow.shape;lab=np.zeros((H,W),np.int32);keep=np.zeros_like(grow);n=0
    ys,xs=np.nonzero(grow)
    for yy,xx in zip(ys,xs):
        if lab[yy,xx]:continue
        n+=1;q=deque([(yy,xx)]);lab[yy,xx]=n;pts=[]
        while q:
            cy,cx=q.popleft();pts.append((cy,cx))
            for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
                ny,nx=cy+dy,cx+dx
                if 0<=ny<H and 0<=nx<W and grow[ny,nx] and not lab[ny,nx]:lab[ny,nx]=n;q.append((ny,nx))
        if len(pts)>=400:
            py,px=zip(*pts);keep[list(py),list(px)]=True
    return keep

def main(folder):
    man=json.load(open(os.path.join(folder,'manifest.json'),encoding='utf-8'))
    theme=man['theme'];A=Image.open(os.path.join(folder,'base.png')).convert('RGB');W,H=A.size
    out=f'public/assets/garden/v2/{theme}';os.makedirs(out,exist_ok=True)
    b=A.resize((round(W*SCALE),round(H*SCALE)),Image.LANCZOS);b.save(f'{out}/base.webp',quality=82,method=6)
    spots=[];problems=[];comp=A.convert('RGBA')
    for sp in man['spots']:
        region=sp.get('region') or [0,0,W,H]
        region=[max(0,region[0]),max(0,region[1]),min(W,region[2]),min(H,region[3])]
        fills={};boxes=[]
        for st,info in sp['styles'].items():
            F=Image.open(os.path.join(folder,info['file'])).convert('RGB')
            if F.size!=A.size:F=F.resize(A.size,Image.LANCZOS)
            m=changed_mask(A,F,region);fills[st]=F
            ys,xs=np.nonzero(m)
            if len(ys)<800:problems.append(f"{sp['id']}{st} 바뀐 곳이 거의 없음({len(ys)}px) — 다시 받기");continue
            boxes.append((region[0]+xs.min(),region[1]+ys.min(),region[0]+xs.max()+1,region[1]+ys.max()+1))
        if not boxes:continue
        pad=14;x0=max(0,min(b[0] for b in boxes)-pad);y0=max(0,min(b[1] for b in boxes)-pad);x1=min(W,max(b[2] for b in boxes)+pad);y1=min(H,max(b[3] for b in boxes)+pad)
        box=[int(x0),int(y0),int(x1),int(y1)]
        for st,F in fills.items():
            m=changed_mask(A,F,box)
            alpha=Image.fromarray((m*255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(1.5))
            part=F.crop(box).convert('RGBA');part.putalpha(alpha)
            small=part.resize((max(1,round(part.width*SCALE)),max(1,round(part.height*SCALE))),Image.LANCZOS)
            small.save(f"{out}/{sp['id']}{st}.webp",quality=84,method=6)
            # 확인: 빈 장면 위에 얹은 모습
            c=A.convert('RGBA');c.alpha_composite(part,(box[0],box[1]));c.convert('RGB').resize((W//2,H//2)).save(os.path.join(folder,f"확인_{sp['id']}{st}.jpg"),quality=80)
        first=sorted(fills)[0];m=changed_mask(A,fills[first],box)
        p=fills[first].crop(box).convert('RGBA');p.putalpha(Image.fromarray((m*255).astype(np.uint8)));comp.alpha_composite(p,(box[0],box[1]))
        at=sp.get('at') or [int((box[0]+box[2])/2),int((box[1]+box[3])/2)]
        spots.append({'id':sp['id'],'name':sp['name'],'box':box,'at':at,'styles':{k:v['name'] for k,v in sp['styles'].items()}})
    comp.convert('RGB').resize((W//2,H//2)).save(os.path.join(folder,'확인_전체.jpg'),quality=82)
    os.makedirs('src/garden-spots',exist_ok=True)
    lines=[f"// 자동 생성: python tools/garden_spot_build.py (정원 '{theme}'). 좌표는 원본 장면 픽셀({W}×{H}).",
           f"export default Object.freeze({{size:Object.freeze([{W},{H}]),spots:Object.freeze(["]
    for s in spots:
        lines.append(f" Object.freeze({{id:'{s['id']}',name:{json.dumps(s['name'],ensure_ascii=False)},box:{s['box']},at:{s['at']},styles:Object.freeze({json.dumps(s['styles'],ensure_ascii=False)})}}),")
    lines.append("])});")
    open(f'src/garden-spots/{theme}.js','w',encoding='utf-8').write('\n'.join(lines)+'\n')
    total=sum(os.path.getsize(os.path.join(out,f)) for f in os.listdir(out))
    print(json.dumps({'theme':theme,'spots':len(spots),'kb':total//1024,'problems':problems},ensure_ascii=False))

if __name__=='__main__':main(sys.argv[1])

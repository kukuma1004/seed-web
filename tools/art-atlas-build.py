# Higgsfield 원본을 게임용 아틀라스로 가공한다(HIGGSFIELD_RULES.md 5·6절). 원본은 art-source/higgsfield/<날짜>/ 에 있고 git에 올리지 않는다.
#   floor  : 판석 4종 2×2(1024²) → PC 1024 · 휴대폰 512 WebP
#   sigils : 궁극기 문양 3×3(1024², 검정 바탕 흑백) → 1024×512, 256px 칸 4×2(예전 ultimate-archetypes-v1과 같은 배치)
#   sanctuary : 정원 배경 2K(16:9) → PC 1920×1080 · 휴대폰 1280×720
#   garden : 정원 식물 12종 4×3(자홍 바탕) → 배경 떼기, 예전 아틀라스(v3)와 같은 크기·뿌리 위치·색 분포로 맞춘 1200×900 RGBA
# 사용: python tools/art-atlas-build.py floor|sigils|sanctuary|garden [원본]
import sys
import numpy as np
from PIL import Image

kind = sys.argv[1]
if kind == 'floor':
    src = sys.argv[2] if len(sys.argv) > 2 else 'art-source/higgsfield/20260922/floor-slabs-nb2-1k.png'
    sheet = np.asarray(Image.open(src).convert('RGB').resize((1024, 1024), Image.LANCZOS)).astype(np.float32)
    # 네 판석의 색·밝기를 예전 바닥 돌 그림(garden-stone-v4) 평균에 맞추고 대비를 조금 낮춘다.
    # 그대로 두면 어두운 판석과 밝은 판석이 체크무늬처럼 보여 적과 탄이 덜 눈에 띄었다(2026-09-22 화면 비교).
    target = np.asarray(Image.open('public/assets/garden-stone-v4.png').convert('RGB')).astype(np.float32).reshape(-1, 3).mean(0)
    for qy in (0, 512):
        for qx in (0, 512):
            q = sheet[qy:qy + 512, qx:qx + 512]
            sheet[qy:qy + 512, qx:qx + 512] = (q - q.reshape(-1, 3).mean(0)) * .8 + target
    sheet = Image.fromarray(np.clip(sheet, 0, 255).astype(np.uint8))
    sheet.save('public/assets/ground-garden-v5.webp', 'WEBP', quality=86, method=6)
    sheet.resize((512, 512), Image.LANCZOS).save('public/assets/mobile/ground-garden-v5.webp', 'WEBP', quality=84, method=6)
    print('ground-garden-v5.webp 1024 / mobile 512')
elif kind == 'sigils':
    src = sys.argv[2] if len(sys.argv) > 2 else 'art-source/higgsfield/20260922/ultimate-sigils-nb2-1k.png'
    sheet = np.asarray(Image.open(src).convert('L')).astype(np.float32)
    size = sheet.shape[0] / 3
    # 원본 칸(줄, 칸) → 궁극기 골격 순서: BURST · RAIN · ORBIT · BEAM · DOMAIN · BLACKHOLE · TIME_STOP · (씨앗 문양 예비)
    order = [(0, 0), (0, 1), (0, 2), (1, 0), (1, 1), (1, 2), (2, 0), (2, 1)]
    CELL, BLACK, WHITE = 256, 8, 245
    yy, xx = np.mgrid[0:CELL, 0:CELL]
    r = np.hypot(xx - (CELL - 1) / 2, yy - (CELL - 1) / 2) / ((CELL - 1) / 2)
    edge = np.clip((1.02 - r) / .08, 0, 1)  # 원 밖(칸 모서리)은 완전 검정
    atlas = np.zeros((CELL * 2, CELL * 4), np.float32)
    for index, (row, col) in enumerate(order):
        y0, x0 = int(round(row * size)), int(round(col * size))
        cell = sheet[y0:y0 + int(size), x0:x0 + int(size)]
        cell = np.clip((cell - BLACK) / (WHITE - BLACK), 0, 1)
        small = np.asarray(Image.fromarray((cell * 255).astype(np.uint8)).resize((CELL, CELL), Image.LANCZOS)).astype(np.float32) / 255
        ay, ax = (index // 4) * CELL, (index % 4) * CELL
        atlas[ay:ay + CELL, ax:ax + CELL] = small * edge
    Image.fromarray((atlas * 255 + .5).astype(np.uint8)).convert('RGB').save('public/assets/ultimate-archetypes-v2.webp', 'WEBP', quality=88, method=6)
    print('ultimate-archetypes-v2.webp 1024x512')
elif kind == 'sanctuary':
    src = sys.argv[2] if len(sys.argv) > 2 else 'art-source/higgsfield/20260922/garden-sanctuary-nb2-2k.png'
    im = Image.open(src).convert('RGB')
    w, h = im.size
    cw = round(h * 16 / 9)  # 2752×1536 → 정확히 16:9로 양옆을 조금 자른다
    im = im.crop(((w - cw) // 2, 0, (w - cw) // 2 + cw, h))
    im.resize((1920, 1080), Image.LANCZOS).save('public/assets/garden-sanctuary-v2.webp', 'WEBP', quality=84, method=6)
    im.resize((1280, 720), Image.LANCZOS).save('public/assets/mobile/garden-sanctuary-v2.webp', 'WEBP', quality=82, method=6)
    print('garden-sanctuary-v2.webp 1920x1080 / mobile 1280x720')
elif kind == 'garden':
    src = sys.argv[2] if len(sys.argv) > 2 else 'art-source/higgsfield/20260922/garden-growth-nb2-1k.png'
    sheet = np.asarray(Image.open(src).convert('RGB')).astype(np.float32)
    H, W = sheet.shape[:2]
    # 자홍(#FF00FF) 바탕 떼기: 자홍 정도 m = min(R,B) - G. 바탕은 m이 크고, 잎·꽃·금빛은 m이 작다.
    r, g, b = sheet[..., 0], sheet[..., 1], sheet[..., 2]
    m = np.minimum(r, b) - g
    alpha = np.clip((140 - m) / (140 - 35), 0, 1)
    # 반투명 가장자리는 자홍이 섞인 색이라, 섞기 전 색으로 되돌린다(분홍 테두리 없애기).
    key = np.array([255, 0, 255], np.float32)
    a3 = np.maximum(alpha[..., None], 1e-3)
    color = np.clip((sheet - (1 - a3) * key) / a3, 0, 255)
    # 빛 번짐처럼 자홍이 섞여 남은 분홍기는 빨강·파랑에서 똑같이 빼 낸다(식물에는 원래 분홍·자주가 없다).
    spill = np.clip(np.minimum(color[..., 0], color[..., 2]) - color[..., 1], 0, None)
    color[..., 0] -= spill; color[..., 2] -= spill
    alpha = alpha * np.clip(1 - spill / 160, 0, 1)
    # 가장자리 한 겹을 깎아 남은 분홍 테두리를 없애고(3×3 최소값), 다시 살짝 부드럽게 한다.
    from PIL import ImageFilter
    a8 = Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(.6))
    alpha = np.asarray(a8).astype(np.float32) / 255
    color = np.where(alpha[..., None] > 0, color, 0)
    old = np.asarray(Image.open('public/assets/garden-growth-atlas-v3.webp').convert('RGBA')).astype(np.float32)
    oh, ow = old.shape[:2]
    # 색 분포를 예전 아틀라스(어두운 청록 잎·금빛 테두리)에 가깝게: 불투명 픽셀의 채널별 평균·편차를 70%만큼 맞춘다.
    om = old[..., 3] > 200; nm = alpha > .8
    mu_o, sd_o = old[..., :3][om].mean(0), old[..., :3][om].std(0)
    mu_n, sd_n = color[nm].mean(0), color[nm].std(0)
    graded = (color - mu_n) / sd_n * sd_o + mu_o
    # 밝고 선명한 새 그림이 어두운 밤 배경에서 떠 보이지 않게 조금 더 가라앉힌다(채도 85%).
    color = np.clip(color * .15 + graded * .85, 0, 255)
    gray = color.mean(2, keepdims=True)
    color = np.clip(gray + (color - gray) * .85, 0, 255)
    CELL = 300
    out = np.zeros((CELL * 3, CELL * 4, 4), np.float32)
    for tile in range(12):
        col, row = tile % 4, tile // 4
        # 예전 칸에서 식물이 차지한 높이·바닥·가로 중심 → 게임 속 크기와 뿌리 위치를 그대로 둔다.
        oc = old[round(row * oh / 3):round((row + 1) * oh / 3), round(col * ow / 4):round((col + 1) * ow / 4)]
        oy, ox = np.nonzero(oc[..., 3] > 25)
        osz = oc.shape[0]
        o_bottom, o_height, o_cx = (oy.max() + 1) / osz, (oy.max() + 1 - oy.min()) / osz, (ox.min() + ox.max() + 1) / 2 / oc.shape[1]
        y0, y1, x0, x1 = round(row * H / 3), round((row + 1) * H / 3), round(col * W / 4), round((col + 1) * W / 4)
        na, nc = alpha[y0:y1, x0:x1], color[y0:y1, x0:x1]
        ny, nx = np.nonzero(na > .1)
        by0, by1, bx0, bx1 = ny.min(), ny.max() + 1, nx.min(), nx.max() + 1
        rgba = np.dstack([nc[by0:by1, bx0:bx1], na[by0:by1, bx0:bx1] * 255]).astype(np.uint8)
        scale = o_height * CELL / (by1 - by0)
        tw, th = max(1, round((bx1 - bx0) * scale)), max(1, round((by1 - by0) * scale))
        if tw > CELL * .96:  # 너무 넓으면 칸 안에 들어오게 줄인다
            k = CELL * .96 / tw; tw, th = round(tw * k), round(th * k)
        piece = np.asarray(Image.fromarray(rgba, 'RGBA').resize((tw, th), Image.LANCZOS)).astype(np.float32)
        px = int(np.clip(round(o_cx * CELL - tw / 2), 0, CELL - tw)); py = int(np.clip(round(o_bottom * CELL - th), 0, CELL - th))
        out[row * CELL + py:row * CELL + py + th, col * CELL + px:col * CELL + px + tw] = piece
    # 2026-09-22 결과는 쓰지 않아 public 대신 art-source에 둔다(다시 뽑으면 여기서 비교한 뒤 옮긴다).
    Image.fromarray(out.astype(np.uint8), 'RGBA').save('art-source/higgsfield/20260922/rejected/garden-growth-atlas-v4.webp', 'WEBP', quality=88, method=6)
    print('art-source/.../garden-growth-atlas-v4.webp 1200x900 (게임에 넣지 않음)')

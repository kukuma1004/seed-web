# Higgsfield 원본을 게임용 아틀라스로 가공한다(HIGGSFIELD_RULES.md 5·6절). 원본은 art-source/higgsfield/<날짜>/ 에 있고 git에 올리지 않는다.
#   floor  : 판석 4종 2×2(1024²) → PC 1024 · 휴대폰 512 WebP
#   sigils : 궁극기 문양 3×3(1024², 검정 바탕 흑백) → 1024×512, 256px 칸 4×2(예전 ultimate-archetypes-v1과 같은 배치)
# 사용: python tools/art-atlas-build.py floor|sigils [원본]
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

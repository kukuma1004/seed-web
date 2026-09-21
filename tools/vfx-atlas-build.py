# Higgsfield 원본(1024², 4×4 칸, 검정 바탕)을 게임용 이펙트 아틀라스(512², 128px 칸, 칸마다 2px 여백)로 만든다.
# 원본은 art-source/higgsfield/<날짜>/ 에 있고 git에 올리지 않는다(HIGGSFIELD_RULES.md 5·6절).
# 사용: python tools/vfx-atlas-build.py [원본] [결과]
import sys
import numpy as np
from PIL import Image

src = sys.argv[1] if len(sys.argv) > 1 else 'art-source/higgsfield/20260921/vfx-sheet-nb2-1k.png'
out = sys.argv[2] if len(sys.argv) > 2 else 'public/assets/vfx-atlas-v1.webp'
GRID, CELL, PAD = 4, 128, 2
BLACK, WHITE = 10, 245  # 이 밝기 이하는 완전 검정(가산 합성에서 네모 테두리가 비치지 않게)

sheet = np.asarray(Image.open(src).convert('L')).astype(np.float32)
size = sheet.shape[0] // GRID
inset = 8  # 원본의 칸 경계선(2px 회색 줄)을 잘라 낸다
inner = CELL - PAD * 2
yy, xx = np.mgrid[0:inner, 0:inner]
r = np.maximum(np.abs(xx - (inner - 1) / 2), np.abs(yy - (inner - 1) / 2)) / ((inner - 1) / 2)
edge = np.clip((1 - r) / .12, 0, 1)  # 칸 가장자리 12%에서 0으로 부드럽게
edge = edge * edge * (3 - 2 * edge)

atlas = np.zeros((CELL * GRID, CELL * GRID), np.float32)
for row in range(GRID):
    for col in range(GRID):
        cell = sheet[row * size + inset:(row + 1) * size - inset, col * size + inset:(col + 1) * size - inset]
        cell = np.clip((cell - BLACK) / (WHITE - BLACK), 0, 1)
        small = np.asarray(Image.fromarray((cell * 255).astype(np.uint8)).resize((inner, inner), Image.LANCZOS)).astype(np.float32) / 255
        y0, x0 = row * CELL + PAD, col * CELL + PAD
        atlas[y0:y0 + inner, x0:x0 + inner] = small * edge

img = Image.fromarray((atlas * 255 + .5).astype(np.uint8)).convert('RGB')
img.save(out, 'WEBP', quality=90, method=6)
print(out, img.size)

# 162 구조 · 전용 그림 제작 기록

## 맥동중력핵 · 2026-09-23

- 출력: `public/assets/seed-pulsegravity-v1-ui.webp`, 512×512, WebP 품질 84, 76,208바이트.
- 제작 방식: Codex 기본 제공 `image_gen`으로 새 래스터 원화 생성. 기존 `seed-awaken-atlas-v1-ui.webp`와 `seed-solo-atlas-v3-ui.webp`는 스타일·성질 참고로 제공했다. 생성 원본 PNG를 512px WebP로 최적화하고 전용 카드에 연결했다.
- 실제 전투 메시를 원화로 바꾼 것은 아니다. 발동 때는 중력장 지속·세 번 맥동·작게 닫히는 VFX로 대붕괴와 구분한다.

### 생성 프롬프트

> Create ONE square, finished game evolution-card illustration for SEED, named 맥동중력핵 (do not render any text). Use the first reference atlas as the style and quality guide, especially the first tile's mature gold-and-ivory seed craftsmanship; use the second atlas's purple black-hole tile (middle row, far right) for gravity character only. New original design: one small ivory-and-antique-gold seed shell encasing a deep amethyst-violet gravity core, suspended at the exact center; three clearly separated concentric compression rings radiate outward in a slow rhythmic pattern. A few crystal flecks and tiny gold seed scales bend inward toward the core, never explode outward. The image must immediately read as persistent gravity pulses, distinct from the first tile's violent one-time collapse. Refined painterly 2.5D game illustration, crisp silhouette readable at 80 pixels, elegant hand-painted material depth, subtle teal reflected edge light, dark navy botanical void background matching existing atlas, jewel-like highlights only near the nucleus. No person, no character face, no words, no letters, no border, no grid, no multi-panel sheet, no UI. Full-bleed square composition with safe 8 percent margin.

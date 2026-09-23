import {writeFileSync} from 'node:fs';
import {FINAL_IDENTITY_IDS,finalIdentity} from '../src/final-identity-art.js';

const clean=s=>String(s??'').replaceAll('|','／').replaceAll('\n',' ');
const rows=FINAL_IDENTITY_IDS.map(id=>finalIdentity(id));
const finals=rows.filter(x=>x.kind==='final'),twins=rows.filter(x=>x.kind==='twin');
const line=x=>`| ${x.id} | ${clean(x.name)} | ${clean(x.recipe.join(' + '))} | ${clean(x.visual)} | ${clean(x.projectile.core)} + ${clean(x.projectile.shell)} · ${clean(x.projectile.trailCue)} | ${clean(x.impact.shape)} / ${clean(x.impact.echo)} | ${clean(x.ultimate.storyboard.join(' → '))} |`;
const content=`# SEED · 162종 완성/쌍둥이 시각 설계표

이 문서는 COMBO_162_MASTER_PLAN.md의 72 완성 갈래와 36 쌍둥이 각성의 **이미지·탄·적중·궁극기 연출**을 한 ID로 묶는다. 기본 9·단독 9·1차 융합 36은 기존 원화/전투 구현을 유지한다. 본 파일은 node tools/build-final-identity-doc.mjs로 기획표와 동일하게 재생성한다.

## 제작 방식과 한계

- 카드 108장은 기존 손그림 단독진화 9종과 1차 융합 원화 26종을 재구성한 **합성 원화**다. 한 융합의 두 갈래는 중심 주체를 달리하고, 실제 공격 경로를 나타낸 10개 문양과 분기 표식을 그렸다. 108장을 새로 손으로 그린 완전 독립 원화라는 뜻은 아니다. 공개 전 눈에 띄게 닮은 카드는 별도 원화로 교체한다.
- 세 장의 6×6 WebP 아틀라스가 108장을 제공한다. 도감 화면의 108개 카드가 108개의 그림 요청과 GPU 텍스처를 만들지 않는다. 새로운 3D 머티리얼, 동적 조명, 후처리도 요구하지 않는다.
- 탄은 finalProjectileStyle(id)의 핵/외피/꼬리를 buildComboProjectileGeometry 한 메시로 합친다. 실제 검사 최대 696정점·232삼각형이다. 새 완성 갈래 61개는 전투실험실에서 전용 공격 경로와 이름 붙은 여는 기술을 실행한다. 표의 **3박자 스토리보드**는 추가 연출 지침이며 세 컷이 독립적으로 모두 구현되었다는 뜻은 아니다.
- 두 갈래의 차이는 단순 색이 아니다. 주도하는 단독진화가 탄의 중앙 실루엣을 차지하고, 행동표에 적힌 **이동 경로·타격 위치·박자**가 달라진다. 같은 융합 양쪽은 각기 다른 중심 형상을 가진다.
- 전투 계층은 동시에 살아 있는 전용 탄 20개·예약 타격 24개·지속 장 8개로 제한한다. 보스 적탄 가독성과 씨앗 위치는 궁극기보다 우선한다.
- 새 완성 갈래 61개는 **implemented_held** 상태다. 실험실에서는 동작하지만 일반 선택 풀과 도감에는 아직 나오지 않는다. 기기별 프레임과 역할별 밸런스 검증 후 묶음별 공개한다. 기존 11개 완성 각성과 36개 쌍둥이는 플레이어에게 공개 중이다.

## 72 완성 갈래

| ID | 이름 | 재료 | 중심 연출 | 탄 핵+외피·꼬리 | 적중/잔향 | 궁극기 3박자 |
| --- | --- | --- | --- | --- | --- | --- |
${finals.map(line).join('\n')}

## 36 쌍둥이 각성

쌍둥이 카드는 한쪽을 가르는 단순 대각선이 아니라 두 단독 원화가 한 중앙 공명 마디를 잡는 구도다. 전투에서는 각 단독 공격을 남기고, 두 궤적이 교차하는 순간의 표식으로 각성을 읽힌다.

| ID | 이름 | 재료 | 두 공격의 관계 | 탄 핵+외피·꼬리 | 적중/잔향 | 궁극기 3박자 |
| --- | --- | --- | --- | --- | --- | --- |
${twins.map(line).join('\n')}

## 연결 계약

formArt(id, extra)는 108개 ID 중 새 완성 갈래 61개와 쌍둥이 36개를 finalArt(id, extra) 카드에 연결한다. 기존 11개 각성 원화는 유지한다. CSS는 final-identity-art.css다. 장착한 완성 갈래의 탄 형상은 한 번 생성하고 해제 시 폐기한다. final-branch-combat.js는 61개의 패턴 지정과 기존 VFX 풀을 사용하고, twin-interactions.js는 36개 쌍둥이의 연계 규칙을 실행한다. finalIdentity(id).ultimate.storyboard는 후속 아트 작업의 지침이다.

검사: node tools/final-identity-art-test.mjs.
`;
writeFileSync(new URL('../docs/COMBO_162_VISUAL_BIBLE.md',import.meta.url),content);
console.log(`Wrote ${finals.length}+${twins.length} visual entries`);

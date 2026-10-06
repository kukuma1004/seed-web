import {getExpeditionSpecies} from './species.js';
import {canResowExpedition,nurseryGrowthCandidates} from './nursery.js';
import {expeditionStoryJournal,expeditionRestorationProgress,readExpeditionStory} from './story.js';
import {EXPEDITION_GARDENS} from './world.js';
import {EXPEDITION_BOSS_BEHAVIORS} from './boss-ai.js';
import {EXPEDITION_RELICS,expeditionAppliedRelics} from './relics.js';
import {lawArt} from '../law-art.js';

const h=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const name=id=>getExpeditionSpecies(id)?.name||id;
export function renderExpeditionNursery(s){
 const candidates=nurseryGrowthCandidates(s.roster),m=s.meta;
 return `<section class="exv-panel exv-nursery"><div class="exv-section-head"><h2>온실 · 생명전류</h2><small>씨앗알 ${m.eggs.length} · 성장 기회 ${m.growthCharges}</small></div><p class="exv-help">두 번 이상 싸우고 살아 돌아오면 성장 기회가 남아요. 파티에 넣지 않은 씨앗을 키우면 연쇄 생명전류도 모입니다. 알에서는 새로운 Lv1 씨앗이 태어나요.</p><div class="exv-nursery-list">${m.eggs.map(e=>`<article><span>${h(name(e.speciesId))} 씨앗알 · ${h(EXPEDITION_GARDENS[e.gardenId].name)}</span><button data-hatch="${h(e.eggId)}">새 씨앗 부화</button></article>`).join('')}${candidates.map(i=>`<article><span>${h(i.nickname||name(i.speciesId))} Lv.${i.level} · XP ${i.xp}</span><button data-grow="${h(i.instanceId)}" ${m.growthCharges?'':'disabled'}>온실에서 키우기</button></article>`).join('')}</div>${canResowExpedition(s.roster,m)?'<p class="exv-help">떠난 씨앗은 돌아오지 않습니다. 기억을 지키며 새로운 작은 씨앗으로 다시 시작할 수 있어요.</p><button class="exv-primary" data-resow="1">새로운 씨앗 심기</button>':''}<details><summary>법칙핵과 각성 재료</summary><div class="exv-core-list">${Object.entries(m.cores).map(([id,n])=>`<span>${h(name(id))} ${n}</span>`).join('')}<span>각성 재료 ${m.awakenMaterials}</span></div></details></section>`;
}
export function renderExpeditionRelics(s){
 const owned=new Set(s.meta.relics);
 return `<section class="exv-panel exv-relics"><div class="exv-section-head"><h2>정원이 남긴 유물</h2><small>보유 ${owned.size}/8</small></div><p class="exv-help">보스를 쓰러뜨리고 살아 귀환하면 남습니다. 다음 전투부터 같은 법칙을 가진 씨앗의 행동을 자동으로 보강해요. 한 번의 타격·보호·반격에 겹치는 계수 증가는 +0.1까지입니다.</p><div class="exv-relic-grid">${Object.values(EXPEDITION_RELICS).map(r=>`<article class="exv-relic ${owned.has(r.gardenId)?'owned':'locked'}" data-relic="${r.gardenId}">${lawArt(r.law)}<div><b>${h(r.name)}</b><small>${h(EXPEDITION_GARDENS[r.gardenId].name)} · ${owned.has(r.gardenId)?'보유':'보스 처치 후 귀환'}</small><p>${h(name(r.law))} · ${h(r.description)}</p></div></article>`).join('')}</div></section>`;
}
export function renderExpeditionRelicReward(s){
 const r=s.lastResult,relic=EXPEDITION_RELICS[r?.gardenId];
 if(r?.kind!=='return'||!r.boss||!relic||!s.meta.relics.includes(r.gardenId))return '';
 return `<article class="exv-relic owned exv-relic-reward">${lawArt(relic.law)}<div><b>${h(relic.name)} · 유물 보유</b><p>${h(relic.description)}</p><small>다음 전투부터 같은 법칙의 씨앗에게 적용됩니다. 같은 유물을 다시 얻어도 중첩되지 않아요.</small></div></article>`;
}
export function renderExpeditionBattleRelics(s){
 const relics=new Map();
 for(const unit of s.battle?.units||[])if(unit.side==='ally'&&!unit.dead)for(const r of expeditionAppliedRelics(unit,s.meta.relics))relics.set(r.gardenId,r);
 return relics.size?`<details class="exv-battle-relics"><summary>유물 보강 ${relics.size}종</summary>${[...relics.values()].map(r=>`<p><b>${h(r.name)}</b> · ${h(r.description)}</p>`).join('')}</details>`:'';
}
export function renderExpeditionStoryJournal(s){
 const progress=expeditionRestorationProgress(s.roster.story),journal=expeditionStoryJournal(s.roster.story);
 return `<section class="exv-panel exv-story-journal"><div class="exv-section-head"><h2>정원이 기억한 이야기</h2><small>복원 ${progress.restoredCount}/8</small></div><div class="exv-restoration-list">${Object.values(EXPEDITION_GARDENS).map(g=>`<span>${h(g.name)} · ${s.meta.restoration[g.id]?'★'+s.meta.restoration[g.id]:'아직 잠든 곳'}</span>`).join('')}</div><details><summary>기록된 이야기 ${journal.length}장 다시 읽기</summary>${journal.map(scene=>`<article><h3>${h(scene.title)}</h3><p>${h(scene.body)}</p></article>`).join('')}</details></section>`;
}
export function renderExpeditionReturnStory(s){
 if(s.lastResult?.kind!=='return'||!s.lastResult.boss)return '';
 const scene=readExpeditionStory(`story:${s.lastResult.gardenId}:restore`,s.roster.story)?.scene;
 return scene?`<article class="exv-return-story"><h3>${h(scene.title)}</h3><p>${h(scene.body)}</p></article>`:'';
}
export function renderExpeditionBossNote(s){
 const gardenId=s.route?.gardenId,definition=EXPEDITION_BOSS_BEHAVIORS[gardenId];
 if(!definition||!s.battle?.units.some(u=>u.side==='enemy'&&u.boss&&!u.dead))return '';
 const intro=readExpeditionStory(`story:${gardenId}:boss-intro`,s.roster.story)?.scene;
 return `<details class="exv-boss-note"><summary>${h(definition.name)} · 패턴 읽기</summary>${intro?`<p>${h(intro.body)}</p>`:''}<ol>${definition.steps.map(step=>`<li><b>${h(step.phase)}</b> · ${h(step.tell)}</li>`).join('')}</ol><p>치명 공격 예고는 실제 대상에 남습니다. 다음 차례의 방어·교대를 확인하세요.</p></details>`;
}

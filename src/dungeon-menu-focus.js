// Reorder existing destinations once at menu entry. Moving nodes preserves their
// launch handlers, account gates and authored artwork; no observer or game loop.
export function applyDungeonMenuFocus(overlay){
 const panel=overlay?.querySelector?.('.dungeon-hub');
 if(!panel||panel.classList.contains('dungeon-focus'))return false;
 const scroll=panel.querySelector('.dungeon-scroll'),grid=scroll?.querySelector('.dungeon-modes');
 const journey=grid?.querySelector('#open-journey'),survival=grid?.querySelector('#open-survival'),defense=grid?.querySelector('#open-defense');
 if(!scroll||!grid||!journey||!survival||!defense)return false;
 const doc=panel.ownerDocument;
 const make=(tag,className,text)=>{const node=doc.createElement(tag);node.className=className;if(text)node.textContent=text;return node;};
 const remaining=Array.from(grid.querySelectorAll('button.dungeon-mode')).filter(node=>node!==journey&&node!==survival&&node!==defense);
 const hint=make('p','dungeon-first-hint','처음에는 여정 1막 · 강해지는 맛은 물량생존전');
 const featured=make('div','dungeon-featured');featured.setAttribute('role','group');featured.setAttribute('aria-label','추천 도전');
 const labels=[[journey,'처음 추천 · 자동 공격'],[survival,'무리 돌파 · 빠른 성장'],[defense,'전략 · 배치와 합체']];
 for(const [button,label] of labels){const badge=button.querySelector('.mode-type');if(badge)badge.textContent=label;}
 featured.append(journey,survival);defense.classList.add('mode-strategy');
 const content=[hint,featured,defense];
 if(remaining.length){
  const other=make('details','dungeon-other'),summary=make('summary','dungeon-other-toggle');
  summary.append(make('strong','','다른 도전'),make('span','dungeon-other-hint',remaining.map(button=>button.querySelector('strong')?.textContent?.replace(/^씨앗(?:의)?\s*/, '')).filter(Boolean).join(' · ')));
  const choices=make('div','dungeon-other-modes');choices.setAttribute('role','group');choices.setAttribute('aria-label','다른 도전');
  for(const button of remaining){const art=button.querySelector('.mode-art');if(art)art.loading='lazy';choices.append(button);}
  other.append(summary,choices);content.push(other);
 }
 scroll.replaceChildren(...content);panel.classList.add('dungeon-focus');
 return true;
}

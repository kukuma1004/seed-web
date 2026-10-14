// Move existing result nodes rather than recreate buttons/listeners/statuses.
// All work is event-driven at a result transition, never in the frame loop.
export function focusRunResult(overlay,{reflection='',harvest='',primaryId='',onRetry=null,onGarden=null}={}){
 if(!overlay?.ownerDocument||overlay.querySelector('.run-result-layout'))return false;
 const doc=overlay.ownerDocument,container=overlay.querySelector('.menu-panel')||overlay;
 const shell=doc.createElement('div');shell.className='run-result-layout';
 const content=doc.createElement('div');content.className='run-result-content';
 const actions=doc.createElement('footer');actions.className='run-result-actions';
 const grouped=container.querySelector('.survival-actions,.end-actions,.developer-footer');
 const buttons=grouped?[...grouped.querySelectorAll('button')]:[...container.children].filter(n=>n.tagName?.toLowerCase()==='button');
 let primary=primaryId?container.querySelector('#'+primaryId):null;
 let retryStatus=null;
 if(onRetry){primary=doc.createElement('button');primary.id='run-again';primary.textContent='같은 막 다시 도전';retryStatus=doc.createElement('p');retryStatus.className='run-retry-status';retryStatus.setAttribute('role','status');primary.onclick=()=>{const message=onRetry();retryStatus.textContent=typeof message==='string'?message:'';};buttons.unshift(primary);}
 if(onGarden){const garden=doc.createElement('button');garden.id='run-garden';garden.textContent='이번 수확 보러 가기';garden.onclick=onGarden;buttons.push(garden);}
 if(primary&&!buttons.includes(primary))buttons.unshift(primary);
 for(const node of [...container.childNodes])if(node!==grouped&&!buttons.includes(node))content.append(node);
 if(grouped)grouped.remove();
 for(const button of buttons)actions.append(button);
 if(primary){primary.classList.add('primary','run-result-primary');actions.prepend(primary);}
 if(retryStatus)actions.append(retryStatus);
 if(reflection){const block=doc.createElement('div');block.className='run-reflection-host';block.innerHTML=reflection;
  const score=content.querySelector('.final-score,.survival-facts');if(score)score.after(block);else content.append(block);
 }
 const analysis=content.querySelector('.death-combat-analysis');
 if(analysis){const fold=doc.createElement('details'),label=doc.createElement('summary');fold.className='run-result-details';label.textContent='마지막 전장의 조합 성능';analysis.before(fold);fold.append(label,analysis);}
 if(harvest){const gain=doc.createElement('p');gain.className='run-harvest';gain.textContent=harvest;content.append(gain);}
 shell.append(content,actions);container.append(shell);container.classList.add('run-result-panel');
 return true;
}
export function focusSurvivalSetup(overlay){
 const button=overlay?.querySelector('#open-garden-challenge');if(!button||button.closest('.survival-short-fold'))return false;
 const doc=button.ownerDocument,fold=doc.createElement('details'),summary=doc.createElement('summary');
 fold.className='survival-short-fold';summary.textContent='짧은 3분 도전도 있어요';button.before(fold);fold.append(summary,button);button.classList.remove('primary');return true;
}

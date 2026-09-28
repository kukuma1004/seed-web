// Attack form describes geometry. Laws modify that description once; the
// simulation owns damage/status and the view consumes emitted presentation.
export const ATTACK_SHAPES=Object.freeze({
 slash:{name:'베기',icon:'╱',description:'가까운 적을 넓게 베어요'},
 throw:{name:'던지기',icon:'➶',description:'조준한 방향으로 잎날을 날려요'},
 hybrid:{name:'베기 + 던지기',icon:'✣',description:'한 번 베면서 전방으로 잎날을 날려요'},
});
export function availableAttacks(shapes){return shapes.length===2?['slash','throw','hybrid']:[...shapes];}
export function composeAdventureAttack({weapon,laws=[],form=null,level=1}){
 const hybrid=weapon==='hybrid',cut=weapon!=='throw',ranged=weapon!=='slash';
 const split=laws.includes('split'),recall=laws.includes('recall');
 // 2026-09-28 사용자: 속도감 — 공격 간격 약 20% 짧게.
 const plan={cooldown:hybrid?.45:cut?.35:.28,cuts:[],shots:[],returnCuts:[],orbitDuration:cut?.8:1,orbitRadius:cut?1.9:2.7};
 if(cut){
  const damage=(27+level*3)*(hybrid?.72:1);
  for(const offset of split?[-.62,0,.62]:[0]){
   const c={offset,radius:2.65,cos:split?.75:.1,damage};
   plan.cuts.push(c);
   if(recall)plan.returnCuts.push({...c,damage:damage*.55,delay:.28});
  }
 }
 // A slash without a ranged form only projects a blade for projection laws.
 const projected=cut&&!ranged&&laws.some(l=>l==='pierce'||l==='reflect');
 if(ranged||projected){
  const offsets=split?[-.24,0,.24]:[0];
  for(const offset of offsets)plan.shots.push({
   offset,damage:(ranged?17+level*2:14+level*2)*(hybrid?.65:1)*(split?.7:1),
   speed:form==='thunderlance'?17:ranged?12:10,
   life:ranged?1.15:.7,remaining:form==='returnblade'?6:laws.includes('pierce')?3:1,
   recall,blade:form==='returnblade',shape:form==='thunderlance'?'lance':form==='returnblade'?'returnblade':'leaf',
  });
 }
 return plan;
}

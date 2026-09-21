// Higgsfield 1막 바닥(2026-09-22, HIGGSFIELD_RULES.md): 판석 4종을 2×2로 담은 아틀라스.
// 원본 → tools/art-atlas-build.py floor → public/assets/ground-garden-v5.webp(PC 1024) · assets/mobile/(512).
export const FLOOR_ATLAS_FILE='ground-garden-v5.webp';

// 격자 위치로 판석 모양(4칸)과 뒤집기(좌우·상하)를 정한다. 같은 방은 늘 같은 바닥이고 장면 난수는 쓰지 않는다.
export function floorSlabVariant(x,z){
 const i=Math.round(x*2+100),j=Math.round(z*2+100);
 let h=(Math.imul(i,73856093)^Math.imul(j,19349663))>>>0;h^=h>>>13;h=Math.imul(h,1274126177)>>>0;
 return {cell:h&3,flipU:Boolean(h&4),flipV:Boolean(h&8)};
}
// 판석 면의 0~1 좌표를 아틀라스 한 칸으로 옮긴다. 가장자리를 조금 안쪽으로 잡아 밉맵에서 옆 칸 색이 번지지 않게 한다.
export function floorSlabUV({cell,flipU,flipV},u,v,pad=.006){
 if(flipU)u=1-u;if(flipV)v=1-v;
 return [(cell%2)*.5+pad+u*(.5-pad*2),Math.floor(cell/2)*.5+pad+v*(.5-pad*2)];
}

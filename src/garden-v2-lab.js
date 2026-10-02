// Local inspection only. The caller uses the isolated inspection store.
import {SPOT_SCENES} from './garden-spots.js';
import {normalizeGarden} from './garden.js';
export function gardenV2Fixture(garden){
 const spots=Object.fromEntries(Object.entries(SPOT_SCENES).filter(([id])=>id!=='dream').map(([id,scene])=>[id,Object.fromEntries(scene.spots.map(p=>[p.id,{on:'A',own:['A']}]))]));
 return normalizeGarden({...garden,spots,themesOpened:Object.keys(SPOT_SCENES),tree:{
  plots:[{seed:'clocktower',water:24},{seed:'reflect',water:1},null,{seed:'chain',water:10},{seed:'frost',water:4},{seed:'orbit',water:9},{seed:'f-returnblade',water:14}],
  bag:{frost:1,founder:1,alwaysbeginner:1,tempestcarrier:1},shards:{common:15,rare:30},bloomed:['clocktower','chain','orbit'],once:{migrated:true,welcome:true,labFixture:true},updatedAt:0,
 }});
}

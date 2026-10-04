// Original eight-pose paintings follow the canonical encounter clock. Art never
// chooses attacks, changes collision, or owns a separate combat state.
export const EXPANSION_BOSS_ART=Object.freeze({
 crosswindKeeper:Object.freeze({file:'expansion/boss-crosswind-motion-v1.webp',size:4.1,baseline:62/512}),
 crystalGardener:Object.freeze({file:'expansion/boss-crystal-motion-v1.webp',size:4.4,baseline:62/512})
});
export function expansionBossFrame(model,hit=0){
 if(!model||!Number.isInteger(model.pattern)||model.pattern<0||model.pattern>2)return hit>0?7:0;
 // Rapid player hits must not conceal the canonical attack preparation. The
 // billboard already handles impact tint/reaction without replacing the pose.
 if(model.state==='tell')return 1+model.pattern*2;
 if(model.state==='attack')return 2+model.pattern*2;
 return 7;
}
const actorFrame=actor=>expansionBossFrame(actor.expansionMotion,actor.hit);
export function expansionActorArt(id){
 const art=EXPANSION_BOSS_ART[id];
 return art?{...art,atlasColumns:4,atlasRows:2,atlasFrame:actorFrame,occlusion:false,lighting:false}:null;
}
export function paintExpansionBoss(ctx,enemy,image,size){
 if(!image?.complete||!image.naturalWidth)return false;
 const frame=expansionBossFrame(enemy.expansionBoss,enemy.hit),cell=image.width/4,height=image.height/2;
 ctx.drawImage(image,(frame%4)*cell,Math.floor(frame/4)*height,cell,height,enemy.x-size/2,enemy.y-size*(450/512),size,size);
 return true;
}

export const EXPANSION_ENEMY_ART=Object.freeze({
 crosswind:Object.freeze({file:'expansion/enemy-crosswind-motion-v1.webp',size:1.95,baseline:62/512}),
 crystalGorge:Object.freeze({file:'expansion/enemy-crystal-motion-v1.webp',size:1.95,baseline:62/512})
});
const roleColumns=Object.freeze({scout:0,lobber:1,charger:2,swarm:0,brute:1,runner:2});
export const expansionEnemyFrame=(role,action=false)=>(roleColumns[role]??0)+(action?3:0);
const threatFrame=actor=>{const model=actor.expansionThreat;return expansionEnemyFrame(model?.type,model?.phase==='charge'||model?.phase==='recover'&&model.timer>model.cooldown-.22);};
export function expansionEnemyArt(act){const art=EXPANSION_ENEMY_ART[act];return art?{...art,atlasColumns:3,atlasRows:2,atlasFrame:threatFrame,occlusion:false,lighting:false}:null;}
export function paintExpansionEnemy(ctx,enemy,image,size){
 if(!image?.complete||!image.naturalWidth)return false;
 const role=enemy.kind==='fast'?'charger':enemy.kind==='shield'||enemy.kind==='resilient'?'lobber':'scout',frame=expansionEnemyFrame(role),cell=image.width/3,height=image.height/2;
 ctx.drawImage(image,(frame%3)*cell,Math.floor(frame/3)*height,cell,height,enemy.x-size/2,enemy.y-size*(450/512),size,size);return true;
}

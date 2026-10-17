// Presentation only. Act 1 is the ruler; leave its original rigs untouched.
// Heights use the shipping alphaTest .08 silhouette, including Austin's 1.2
// body scale. Normalize once at spawn, never by changing collision/root scale.
export const JOURNEY_ACT1_HEIGHT=Object.freeze({
 swarm:.95*226/256,hound:1.75*1.3*226/256,caster:2.2*1.22*226/256,
 shield:2.05*226/256,turret:3*211/256,warden:4.1*372/384,
 boss:4.3*1.2*356/384
});
const role=(height,ratio)=>Object.freeze({height,ratio});
const H=JOURNEY_ACT1_HEIGHT;
// The idle frame is the stable ruler for every action of that actor. Attack
// poses keep their authored extent; changing frame must not pump body size.
const profiles=Object.freeze({
 'enemy-catcher-v1.webp':role(H.shield,226/256),
 'enemy-pitcher-v1.webp':role(H.caster,226/256),
 'enemy-runner-v1.webp':role(H.hound,226/256),
 'enemy-batter-v1.webp':role(H.caster,226/256),
 'warden-act2-ace-v1.webp':role(H.warden,487/512),
 'warden-act2-diamond-v1.webp':role(H.warden,493/512),
 'warden-act2-slugger-v1.webp':role(H.warden,490/512),
 'boss-always-beginner-v1.webp':role(H.boss,505/512),
 'boss-crosswind-motion-v1.webp':role(H.boss,264/512),
 'boss-crystal-motion-v1.webp':role(H.boss,333/512),
});
const flightRoles=Object.freeze({
 'sky-scout':role(H.caster,226/256),'sky-diver':role(H.hound,226/256),
 'sky-bomber':role(H.caster,226/256),'sky-carrier':role(H.caster,226/256),
 act3warden:role(H.warden,448/512),tempestcarrier:role(H.boss,449/512)
});
const crosswindRoles=Object.freeze({scout:role(H.hound,385/512),lobber:role(H.caster,364/512),charger:role(H.hound,293/512)});
const crystalRoles=Object.freeze({swarm:role(H.hound,306/512),brute:role(H.shield,378/512),runner:role(H.hound,320/512)});
export const ARBOR_ACT1_BOSS_SIZE=H.boss/(489/512);

export function journeyActorArt(actor,art){
 if(!art?.file||!Number.isFinite(art.size))return art;
 const file=art.file.split('/').at(-1),type=actor?.type;
 let profile=profiles[file]||flightRoles[type];
 if(file==='enemy-relay-atlas-v1.webp')profile=role(type==='relaymachine'?H.turret:H.shield,226/256);
 if(file==='enemy-runner-v1.webp'&&type==='swarm')profile=role(H.swarm,226/256);
 if(file==='enemy-crosswind-motion-v1.webp')profile=crosswindRoles[actor?.expansionThreat?.type]||crosswindRoles.scout;
 if(file==='enemy-crystal-motion-v1.webp')profile=crystalRoles[actor?.expansionThreat?.type]||crystalRoles.swarm;
 if(!profile)return art;
 const body=actor.body||actor.motion?.body||actor.g;
 const parentScale=(actor.g?.scale?.y||1)*(body!==actor.g?(body?.scale?.y||1):1);
 return {...art,size:profile.height/profile.ratio/parentScale};
}

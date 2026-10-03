// Authored actions are separate from fighter identity and presentation.
// Migrate existing fighters one at a time; an absent entry uses the old rules.
const SKILL_ACTIONS=Object.freeze({
 blastlance:(f,index)=>[{type:index===0?'bloomLance':'bloomRetreat'}],
 pierce:(f,index)=>index===0
  ?[{type:'motion',state:'dash',seconds:.3,dx:f.fx,dy:f.fy,hitDone:false}]
  :[{type:'shot',options:{damage:16,pierce:1,speed:14,kind:'lance'}}],
 reflect:(f,index)=>index===0
  ?[{type:'status',values:{shield:1.1,state:'idle',t:0}},
    {type:'effect',kind:'shield',options:{life:1.1,max:1.1}}]
  :[{type:'shot',options:{damage:12,bounces:2,speed:10,kind:'crystal'}}],
 recall:f=>[{type:'shot',options:{x:f.x+f.fx*.5,y:f.y+f.fy*.5,speed:11,life:1.6,damage:15,pierce:1,bounces:0,law:'recall',kind:'blade',turn:.55,age:0}}],
 orbit:f=>[{type:'hazard',options:{kind:'ring',owner:f.team,x:f.x,y:f.y,t:2.2,r:1.6,tick:0,follow:true,damage:3}}],
});
export function duelSkillActions(f,index){return SKILL_ACTIONS[f.char]?.(f,index)??null;}

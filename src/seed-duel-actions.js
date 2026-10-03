// Authored actions are separate from fighter identity and presentation.
// Migrate existing fighters one at a time; an absent entry uses the old rules.
const SKILL_ACTIONS=Object.freeze({
 pierce:(f,index)=>index===0
  ?[{type:'motion',state:'dash',seconds:.3,dx:f.fx,dy:f.fy,hitDone:false}]
  :[{type:'shot',options:{damage:16,pierce:1,speed:14,kind:'lance'}}],
});
export function duelSkillActions(f,index){return SKILL_ACTIONS[f.char]?.(f,index)??null;}

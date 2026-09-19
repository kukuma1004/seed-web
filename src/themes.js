// Lightweight combat-theme prototypes. They reuse every geometry and GPU batch;
// only color, scale and procedural motion parameters change.
export const THEME_KEY='seed-combat-theme-v1';
export const THEME_ORDER=Object.freeze(['botanical','void','cyber','celestial']);
export const THEMES=Object.freeze({
 botanical:Object.freeze({id:'botanical',name:'잠든 정원',short:'기본',crest:0,motion:'outward',projectileMotion:'flutter',trailMode:'leaf',palette:Object.freeze([0x76ffd0,0xffd36a,0x73dfff]),projectileScale:Object.freeze([1,1,1]),projectileGlow:1.8,projectilePulse:.035,projectileSpin:2.4,trailWidth:1,trailLife:1,portalSides:6,flame:1,sparkScale:.78,twinkle:.18}),
 void:Object.freeze({id:'void',name:'VOID · 심연 균열',short:'VOID',crest:1,motion:'inward',projectileMotion:'collapse',trailMode:'ribbon',palette:Object.freeze([0x8b6cff,0x42e8ff,0xd274ff]),projectileScale:Object.freeze([.82,1.22,.82]),projectileGlow:2.15,projectilePulse:.11,projectileSpin:-3.4,trailWidth:1.35,trailLife:1.3,portalSides:7,flame:.65,sparkScale:.72,twinkle:.22}),
 cyber:Object.freeze({id:'cyber',name:'CYBER · 네온 회로',short:'CYBER',crest:2,motion:'axis',projectileMotion:'packet',trailMode:'dash',palette:Object.freeze([0x00f0ff,0xff3bd4,0xb6ff35]),projectileScale:Object.freeze([.72,.72,1.42]),projectileGlow:2.35,projectilePulse:.025,projectileSpin:5.2,trailWidth:.78,trailLife:.72,portalSides:4,flame:.8,sparkScale:.68,twinkle:.28}),
 celestial:Object.freeze({id:'celestial',name:'CELESTIAL · 별의 정원',short:'CELESTIAL',crest:3,motion:'spiral',projectileMotion:'twinkle',trailMode:'comet',palette:Object.freeze([0xffe89a,0x9ec8ff,0xffffff]),projectileScale:Object.freeze([1.18,.84,1.18]),projectileGlow:2.05,projectilePulse:.075,projectileSpin:1.65,trailWidth:1.12,trailLife:1.18,portalSides:5,flame:1.15,sparkScale:.62,twinkle:.36})
});
export const normalizeTheme=id=>Object.hasOwn(THEMES,id)?id:'botanical';
export function readTheme(storage){try{return normalizeTheme(storage?.getItem(THEME_KEY));}catch{return 'botanical';}}
export function writeTheme(storage,id){const theme=normalizeTheme(id);try{storage?.setItem(THEME_KEY,theme);return true;}catch{return false;}}
export function nextTheme(id){const index=THEME_ORDER.indexOf(normalizeTheme(id));return THEME_ORDER[(index+1)%THEME_ORDER.length];}
const hash=value=>{let out=2166136261;for(const c of String(value))out=Math.imul(out^c.charCodeAt(0),16777619);return out>>>0;};
export function themeColor(id,key,fallback=0xffffff){
 const theme=THEMES[normalizeTheme(id)];if(theme.id==='botanical')return fallback;
 return theme.palette[hash(key)%theme.palette.length];
}

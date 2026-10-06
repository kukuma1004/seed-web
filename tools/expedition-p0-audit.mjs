import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {EXPEDITION_SPECIES,EXPEDITION_TAXONOMY} from '../src/expedition/species.js';
import {DUEL_INSPECTION_CHARACTERS} from '../src/seed-duel-rules.js';
import {AUDIO_EVENTS,MUSIC_SCENES} from '../src/audio.js';
const ids=Object.keys(EXPEDITION_SPECIES),maps={};
for(const c of Object.values(DUEL_INSPECTION_CHARACTERS)){
 const canonicalId=c.comboId||(EXPEDITION_SPECIES[c.id]?.kind==='base'?c.id:null);
 if(canonicalId&&ids.includes(canonicalId))(maps[canonicalId]||=[]).push(c.id);
}
const artFiles=fs.readdirSync('public/assets').filter(f=>/seed-(law|solo|forms|first-forms|awaken|final|twin)|enemy-|garden/.test(f));
const fields=['meadow','blossom','autumn','snow','moon','fire','shadow','dream'].map(id=>({id,existingHome:fs.existsSync(`public/assets/garden/v2/${id}/base.webp`),sideScrollLayerAuthored:false,bossArtAuthored:false}));
const report={specZipSha256:'8766f79e908731deca829366343aed9b7895e7764c073709aba194f0b9d88781',
 baseline:'fccff2834d71c10ed0d9e6d5b874e97c0ac32577',currentMain:execFileSync('git',['rev-parse','origin/main'],{encoding:'utf8'}).trim(),workingHead:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
 taxonomy:EXPEDITION_TAXONOMY,total:ids.length,species:Object.values(EXPEDITION_SPECIES).map(s=>({id:s.id,name:s.name,kind:s.kind,laws:s.laws,parents:s.parents,explicitDuelMappings:maps[s.id]||[],validation:s.validation})),
 fields,existingArtCandidates:artFiles,existingAudioEvents:Object.keys(AUDIO_EVENTS),existingMusic:Object.keys(MUSIC_SCENES),
 boundaries:{existingDuelStoryGatesExpedition:false,newIndependentFolder:'src/expedition',newSaveNamespaceRequired:true,legacyRealtimeCheckpointMigration:false,bossV2Activation:false,productionRulesChanged:false},
 gaps:['Individual instance/XP/permadeath save did not exist before this batch','Cloud schema/lease/ETag/permadeath reconciliation not connected','Existing art is reuse candidate, not expedition sprite or boss sign-off','72 branch adapters require per-branch battle and balance review','36 twins require two surviving solo instances and shared-run receipts','Physical Android/iOS/battery checks unavailable in local automation'],
 existingTest:{log:'artifacts/expedition-p0-existing-test.log',exitConfirmed:0},existingBuild:{log:'artifacts/expedition-p0-existing-build.log',exitConfirmed:0}};
fs.writeFileSync(path.resolve('artifacts/expedition-p0-audit.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({taxonomy:report.taxonomy,total:report.total,explicitDuelMappingCount:Object.keys(maps).length,fields,report:'artifacts/expedition-p0-audit.json'}));

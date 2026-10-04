import {readFileSync} from 'node:fs';
const copy=v=>JSON.parse(JSON.stringify(v));
const canonical=v=>v&&typeof v==='object'?(Array.isArray(v)?v.map(canonical):Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])]))):v;
const equal=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
const seal="root.child('seedUsers').child($uid).child('bossMigration')";
const ledger="root.child('seedBossVictories').child($uid)";
export const BOSS_MIGRATION_SAVE_WRITE="auth != null && auth.uid == $uid && (!"+seal+".exists() || (newData.exists() && auth.token.firebase.sign_in_provider != 'anonymous' && "+seal+".child('version').val() == 2 && "+seal+".child('ownerUid').val() == $uid && "+ledger+".child('epoch').val() == "+seal+".child('epoch').val() && newData.child('bossProtocol').child('version').val() == 2 && newData.child('bossProtocol').child('ownerUid').val() == $uid && newData.child('bossProtocol').child('epoch').val() == "+seal+".child('epoch').val()))";
const fields=['austinWins','alwaysWins','johanWins','crosswindWins','crystalWins'];
const accountValidate="newData.hasChildren() && (!"+seal+".exists() || ("+fields.map(k=>"newData.child('"+k+"').val() == "+seal+".child('baseline').child('"+k+"').val()").join(' && ')+'))';
const protocol={'.validate':"newData.hasChildren(['version', 'ownerUid', 'epoch'])",version:{'.validate':'newData.val() == 2'},ownerUid:{'.validate':'newData.val() == $uid'},epoch:{'.validate':"newData.val() == "+seal+".child('epoch').val()"},'$other':{'.validate':false}};
const baseEvents=JSON.parse(readFileSync(new URL('../docs/boss-victory-v2-rules.json',import.meta.url),'utf8')).rules.seedBossVictories;
const events=copy(baseEvents);
events.$uid.events.$eventId['.write']+=' && '+seal+".child('version').val() == 2 && "+seal+".child('epoch').val() == "+ledger+".child('epoch').val()";
// Reject higher-level grants; child .write:false cannot cancel an ancestor grant.
const noAncestorWrite=rules=>{
 for(const node of [rules,rules.seedUsers,rules.seedUsers?.$uid,rules.seedBossVictories,rules.seedBossVictories?.$uid])if(node&&node['.write']!==undefined&&node['.write']!==false)throw Error('unsafe-ancestor-write');
};
const noDescendantWrite=node=>{
 if(!node||typeof node!=='object')return;
 for(const [key,value] of Object.entries(node)){
  if(key==='.write'&&value!==false)throw Error('unsafe-descendant-write');
  if(!key.startsWith('.'))noDescendantWrite(value);
 }
};
export function createBossMigrationRules(value){
 const next=copy(value),rules=next.rules;noAncestorWrite(rules);
 const save=rules?.seedUsers?.$uid?.save;
 if(!save||!['auth != null && auth.uid == $uid',BOSS_MIGRATION_SAVE_WRITE].includes(save['.write']))throw Error('unknown-save-policy');
 // A lower .write grant could independently authorize an old client even
 // when the migrated /save condition fails. Reject every descendant grant.
 for(const [key,value] of Object.entries(save))if(!key.startsWith('.'))noDescendantWrite(value);
 if(rules.seedUsers.$uid.$other)noDescendantWrite(rules.seedUsers.$uid.$other);
 if(!['newData.hasChildren()',accountValidate].includes(save.account?.['.validate']))throw Error('unknown-account-policy');
 if(rules.seedBossVictories&&!equal(rules.seedBossVictories,events))throw Error('unknown-boss-event-policy');
 save['.write']=BOSS_MIGRATION_SAVE_WRITE;save.account['.validate']=accountValidate;save.bossProtocol=copy(protocol);
 rules.seedUsers.$uid.bossMigration={'.write':false};rules.seedBossVictories=copy(events);rules.seedBossMigrationReady={'.read':false,'.write':false};
 return next;
}
export function assertBossMigrationRules(value){
 const next=createBossMigrationRules(value);
 if(!equal(next,value))throw Error('migration-rules-not-installed');return true;
}

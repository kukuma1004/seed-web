import fs from 'node:fs';
import assert from 'node:assert/strict';

const source=fs.readFileSync(new URL('../src/account-auth.js',import.meta.url),'utf8');
const variables=fs.readFileSync(new URL('../android/variables.gradle',import.meta.url),'utf8');
const config=JSON.parse(fs.readFileSync(new URL('../capacitor.config.json',import.meta.url),'utf8'));
const services=JSON.parse(fs.readFileSync(new URL('../android/app/google-services.json',import.meta.url),'utf8'));
const client=services.client.find(entry=>entry.client_info?.android_client_info?.package_name==='com.jpmathlab.seed');

assert.ok(client,'Firebase Android app must match com.jpmathlab.seed.');
assert.equal(config.plugins?.FirebaseAuthentication?.skipNativeAuth,false,'Android must use native Firebase auth.');
assert.ok(config.plugins?.FirebaseAuthentication?.providers?.includes('google.com'),'Google provider must be included.');
assert.match(variables,/rgcfaIncludeGoogle\s*=\s*true/,'Google native dependencies must be packaged.');
assert.match(variables,/androidxCredentialsVersion\s*=\s*'1\.([3-9]|\d{2,})\./,'Credential libraries must meet the plugin setup minimum.');
assert.match(source,/try\{return await FirebaseAuthentication\[method\]\(\{useCredentialManager:false\}\);\}/,'Android sign-in must try the reliable native account picker first.');
assert.match(source,/FirebaseAuthentication\[method\]\(\{useCredentialManager:true\}\)/,'Android sign-in must retain Credential Manager as a compatibility fallback.');
assert.match(source,/credentialConflict\(error\)[\s\S]*writeMigration[\s\S]*FirebaseAuthentication\.signOut\(\)[\s\S]*google\(false\)/,'An anonymous device must recover when Google already belongs to the web-created Firebase UID.');
assert.match(source,/linkWithPopup[\s\S]*credentialConflict\(error\)[\s\S]*webSdk\.signOut\(webAuth\)[\s\S]*signInWithPopup/,'An installed web app must recover when its anonymous UID cannot link to an existing Google UID.');
assert.match(source,/pendingMigration:readMigration,finishMigration:clearMigration/,'Cloud sync must receive a durable guest-to-Google migration marker.');
assert.ok(client.oauth_client.some(item=>item.client_type===3),'A web OAuth client ID is required for the Google ID token.');
assert.ok(client.oauth_client.filter(item=>item.client_type===1).length>=2,'Play app-signing SHA-1 OAuth clients must be present.');

console.log('Android Google auth packaging and compatibility checks passed.');

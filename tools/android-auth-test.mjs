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
assert.match(source,/platform==='android'\?\{useCredentialManager:false\}:undefined/,'Android sign-in must use the broad-compatibility Google flow.');
assert.ok(client.oauth_client.some(item=>item.client_type===3),'A web OAuth client ID is required for the Google ID token.');
assert.ok(client.oauth_client.filter(item=>item.client_type===1).length>=2,'Play app-signing SHA-1 OAuth clients must be present.');

console.log('Android Google auth packaging and compatibility checks passed.');

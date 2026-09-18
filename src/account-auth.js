import {Capacitor} from '@capacitor/core';
import {FirebaseAuthentication} from '@capacitor-firebase/authentication';

// Public Firebase identifiers. Access is protected by Firebase Authentication and database rules,
// not by hiding these values in the bundle.
export const FIREBASE_APP=Object.freeze({
 apiKey:'AIzaSyD9mHiQ8Cyh4zJKbyhW_oYZkcu3WPMYw3k',
 authDomain:'jpmathlab.firebaseapp.com',
 projectId:'jpmathlab',
 storageBucket:'jpmathlab.firebasestorage.app',
 messagingSenderId:'1061208248935',
 appId:'1:1061208248935:web:839fa3cc986bc687cebac2',
 databaseURL:'https://jpmathlab-default-rtdb.asia-southeast1.firebasedatabase.app'
});

export const ACCOUNT_CHOICE_KEY='seed-account-choice-v1';
const native=Capacitor.isNativePlatform();
const platform=Capacitor.getPlatform();

const safeUser=user=>user?Object.freeze({
 uid:user.uid,
 displayName:user.displayName||'',
 email:user.email||'',
 photoUrl:user.photoUrl||user.photoURL||'',
 isAnonymous:Boolean(user.isAnonymous),
 providerId:user.providerData?.find?.(p=>p?.providerId&&p.providerId!=='firebase')?.providerId||user.providerId||'firebase'
}):null;

export function accountLabel(user){
 if(!user)return '로그인하지 않음';
 if(user.isAnonymous)return '게스트 · 이 기기에서 플레이';
 if(user.providerId==='apple.com')return user.email||user.displayName||'Apple 계정';
 return user.displayName||user.email||'Google 계정';
}

export function createAccountAuth({storage=globalThis.localStorage}={}){
 let user=null,readyPromise=null,webAuth=null,webSdk=null;
 const listeners=new Set();
 const emit=next=>{user=safeUser(next);for(const listener of listeners)listener(user);return user;};
 const chosen=()=>{try{return storage?.getItem(ACCOUNT_CHOICE_KEY)==='yes';}catch{return false;}};
 const rememberChoice=()=>{try{storage?.setItem(ACCOUNT_CHOICE_KEY,'yes');}catch{}};

 async function ready(){
  if(readyPromise)return readyPromise;
  readyPromise=(async()=>{
   if(native){
    const result=await FirebaseAuthentication.getCurrentUser();
    return emit(result.user);
   }
   const [appSdk,authSdk]=await Promise.all([import('firebase/app'),import('firebase/auth')]);
   webSdk={...appSdk,...authSdk};
   const app=webSdk.getApps()[0]||webSdk.initializeApp(FIREBASE_APP);
   webAuth=webSdk.getAuth(app);
   await webSdk.setPersistence(webAuth,webSdk.browserLocalPersistence);
   await webAuth.authStateReady();
   return emit(webAuth.currentUser);
  })().catch(()=>emit(null));
  return readyPromise;
 }

 async function guest(){
  await ready();
  if(user){rememberChoice();return user;}
  const result=native?await FirebaseAuthentication.signInAnonymously():await webSdk.signInAnonymously(webAuth);
  rememberChoice();
  return emit(result.user);
 }

 async function provider(kind){
  await ready();
  let result;
  if(native){
   const link=Boolean(user?.isAnonymous);
   if(kind==='apple')result=link?await FirebaseAuthentication.linkWithApple():await FirebaseAuthentication.signInWithApple();
   else{
    // Credential Manager is the plugin default, but it fails on some otherwise
    // supported Android devices when Play services expose no credential provider.
    // The plugin's maintained legacy flow uses the same Firebase/OAuth setup and
    // is more reliable for the older, lower-end phones SEED explicitly supports.
    const options=platform==='android'?{useCredentialManager:false}:undefined;
    result=link?await FirebaseAuthentication.linkWithGoogle(options):await FirebaseAuthentication.signInWithGoogle(options);
   }
  }else{
   const authProvider=kind==='apple'?new webSdk.OAuthProvider('apple.com'):new webSdk.GoogleAuthProvider();
   result=user?.isAnonymous?await webSdk.linkWithPopup(webAuth.currentUser,authProvider):await webSdk.signInWithPopup(webAuth,authProvider);
  }
  rememberChoice();
  return emit(result.user);
 }

 async function tokenSession(){
  await ready();
  if(!user)return null;
  if(native){
   const {token}=await FirebaseAuthentication.getIdToken({forceRefresh:false});
   return {uid:user.uid,idToken:token,expiresAt:Date.now()+50*60*1000,account:true};
  }
  const current=webAuth.currentUser;if(!current)return null;
  return {uid:current.uid,idToken:await current.getIdToken(),expiresAt:Date.now()+50*60*1000,account:true};
 }

 async function signOut(){
  await ready();
  if(native)await FirebaseAuthentication.signOut();else await webSdk.signOut(webAuth);
  try{storage?.removeItem(ACCOUNT_CHOICE_KEY);}catch{}
  return emit(null);
 }

 return {
  ready,guest,signInWithGoogle:()=>provider('google'),signInWithApple:()=>provider('apple'),signOut,tokenSession,
  user:()=>user,chosen,label:()=>accountLabel(user),native,platform,
  appleConfigured:platform==='ios'||import.meta.env.VITE_APPLE_SIGN_IN_READY==='true',
  onChange(listener){listeners.add(listener);return()=>listeners.delete(listener);}
 };
}

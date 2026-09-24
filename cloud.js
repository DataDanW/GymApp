import {validate,migrate} from './model.js';
const URL='https://ndrqsinrcdrvrpkswrpn.supabase.co';
const PUBLIC_KEY='sb_publishable_M-NVTMsMLZflGPyQtOO-bA_FAU8IBrG';
export const AUTH_KEY='setbook-cloud-auth-v1',META_KEY='setbook-cloud-meta-v1';
export const canonical=x=>JSON.stringify(x,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
export function decideSync(local,remote,meta,userId){
 if(meta?.userId&&meta.userId!==userId)return 'account';
 if(!meta?.enabled)return 'choose';
 if(remote&&canonical(remote.payload)===canonical(local))return 'equal';
 if((remote?.revision||0)!==meta.revision)return 'conflict';
 return canonical(local)===meta.baseline?'clean':'push';
}
export class Cloud {
 constructor({storage=localStorage,fetcher=fetch,locks=navigator.locks,getData,onStatus=()=>{},onRestore=()=>{}}){Object.assign(this,{storage,fetcher,locks,getData,onStatus,onRestore});this.status='Sign in to enable cloud saving';this.remote=null;this.pending=false;this.timer=null;this.busy=false;this.choice=false;}
 read(key){const raw=this.storage.getItem(key);return raw?JSON.parse(raw):null;}
 get session(){return this.read(AUTH_KEY);}
 get meta(){return this.read(META_KEY);}
 say(message){this.status=message;this.onStatus();}
 async request(path,{body,token,method}={}){
  const response=await this.fetcher(URL+path,{method:method||(body?'POST':'GET'),headers:{apikey:PUBLIC_KEY,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});
  const value=await response.json().catch(()=>null);
  if(!response.ok)throw new Error(response.status===401?'Please sign in again.':value?.msg||value?.message||value?.error_description||'Cloud connection failed. Local data is safe.');return value;
 }
 async lock(fn){if(!this.locks)throw new Error('Cloud saving needs a current Safari, Chrome or Edge browser. Local saving still works.');return this.locks.request('setbook-cloud',fn);}
 async sendLink(email){await this.request('/auth/v1/otp?redirect_to='+encodeURIComponent('https://datadanw.github.io/GymApp/'),{body:{email,create_user:true}});this.say('Check your email and open the sign-in link on this device.');}
 async useEmailLink(value){const link=new globalThis.URL(value.trim());if(link.origin!==URL||link.pathname!=='/auth/v1/verify'||!['signup','magiclink','email'].includes(link.searchParams.get('type'))||!link.searchParams.get('token'))throw new Error('Copy the sign-in button’s link from your Setbook email.');const s=await this.request('/auth/v1/verify',{body:{token_hash:link.searchParams.get('token'),type:link.searchParams.get('type')}});if(!s.access_token||!s.user)throw new Error('This link could not sign you in. Request a new email.');this.storage.setItem(AUTH_KEY,JSON.stringify({...s,expires_at:Date.now()+s.expires_in*1000}));}
 async acceptLink(hash){const p=new URLSearchParams(hash.replace(/^#/,''));if(!p.has('access_token'))return false;
  const token=p.get('access_token'),user=await this.request('/auth/v1/user',{token});
  this.storage.setItem(AUTH_KEY,JSON.stringify({access_token:token,refresh_token:p.get('refresh_token'),expires_at:Date.now()+Number(p.get('expires_in')||3600)*1000,user}));return true;
 }
 async token(){let s=this.session;if(!s)throw new Error('Sign in to enable cloud saving.');if(s.expires_at<Date.now()+60000){const fresh=await this.request('/auth/v1/token?grant_type=refresh_token',{body:{refresh_token:s.refresh_token}});s={...fresh,expires_at:Date.now()+fresh.expires_in*1000};this.storage.setItem(AUTH_KEY,JSON.stringify(s));}return s;}
 async remoteState(s){const members=await this.request('/rest/v1/setbook_members?select=user_id&user_id=eq.'+s.user.id,{token:s.access_token});if(!members?.length)throw new Error('Cloud access is not enabled for this account. Your local workouts are unchanged.');const rows=await this.request('/rest/v1/setbook_state?select=revision,payload,updated_at&user_id=eq.'+s.user.id,{token:s.access_token});const remote=rows[0]||null;if(remote)validate(migrate(remote.payload));return remote;}
 backup(data){const key='setbook-recovery-'+Date.now()+'-'+crypto.randomUUID();this.storage.setItem(key,JSON.stringify(data));return key;}
 schedule(){clearTimeout(this.timer);this.say(this.session?'Saved on device · waiting to sync':'Saved on device · cloud not connected');this.timer=setTimeout(()=>this.sync(),3000);}
 async sync(){if(this.busy||!this.session)return;this.busy=true;try{await this.lock(async()=>{
   const s=await this.token();let m=this.meta;
   if(m?.userId&&m.userId!==s.user.id){this.choice=true;this.say('This device belongs to a different cloud account. Sign back in to the original account.');return;}
   // Retry an uncertain upload with exactly the same operation and payload.
   if(m?.pending){const result=await this.request('/rest/v1/rpc/setbook_save',{token:s.access_token,body:m.pending});if(result.saved){m={...m,revision:result.revision,baseline:canonical(m.pending.next_payload),pending:null};this.storage.setItem(META_KEY,JSON.stringify(m));}else{m={...m,pending:null};this.storage.setItem(META_KEY,JSON.stringify(m));}}
   this.remote=await this.remoteState(s);const local=this.getData(),decision=decideSync(local,this.remote,m,s.user.id);
   if(decision==='choose'||decision==='conflict'){this.choice=true;this.say(this.remote?'Review device and online copies before syncing.':'Ready for your first cloud backup. Choose “Use this device”.');return;}
   this.choice=false;
   if(decision==='push')await this.push(local,this.remote?.revision||0,s,m);
   else {if(decision==='equal')this.storage.setItem(META_KEY,JSON.stringify({...m,revision:this.remote.revision,baseline:canonical(local),pending:null}));this.say('Synced with Supabase');}
  });}catch(e){this.say('Not synced · '+e.message);}finally{this.busy=false;this.onStatus();}}
 async push(local,revision,s,m){validate(local);const pending={expected_revision:revision,next_payload:structuredClone(local),operation_id:crypto.randomUUID()};this.storage.setItem(META_KEY,JSON.stringify({...m,userId:s.user.id,enabled:true,pending}));const result=await this.request('/rest/v1/rpc/setbook_save',{token:s.access_token,body:pending});if(!result.saved){this.choice=true;this.say('Another device saved newer changes. Review the copies in Settings.');return;}
  this.storage.setItem(META_KEY,JSON.stringify({userId:s.user.id,enabled:true,revision:result.revision,baseline:canonical(pending.next_payload),pending:null}));this.choice=false;const more=canonical(this.getData())!==canonical(pending.next_payload);this.say(more?'Saved on device · more changes waiting':'Synced with Supabase');if(more){clearTimeout(this.timer);this.timer=setTimeout(()=>this.sync(),3000);}
 }
 async choose(source){if(this.busy)return;this.busy=true;try{await this.lock(async()=>{const s=await this.token(),m=this.meta;if(m?.userId&&m.userId!==s.user.id)throw new Error('Sign in to the account already linked to this device.');const remote=await this.remoteState(s),local=this.getData();if((remote?.revision||0)!==(this.remote?.revision||0)){this.remote=remote;this.choice=true;throw new Error('The online copy changed. Review it again before choosing.');}this.backup(local);
   if(source==='cloud'){if(!remote)throw new Error('No cloud copy exists yet.');const data=validate(migrate(remote.payload));await this.onRestore(data);this.storage.setItem(META_KEY,JSON.stringify({userId:s.user.id,enabled:true,revision:remote.revision,baseline:canonical(data),pending:null}));this.choice=false;this.say('Online copy loaded · local recovery copy saved');}
   else await this.push(local,remote?.revision||0,s,{userId:s.user.id,enabled:true,revision:remote?.revision||0,baseline:m?.baseline||'',pending:null});
  });}catch(e){this.say('Not synced · '+e.message);}finally{this.busy=false;this.onStatus();}}
 async versions(){return this.lock(async()=>{const s=await this.token();return this.request('/rest/v1/setbook_versions?select=revision,created_at&order=revision.desc&limit=50&user_id=eq.'+s.user.id,{token:s.access_token});});}
 async restoreVersion(revision){if(this.busy)return;this.busy=true;try{await this.lock(async()=>{const s=await this.token(),m=this.meta;if(m?.userId!==s.user.id)throw new Error('Connect this device first.');const remote=await this.remoteState(s),rows=await this.request('/rest/v1/setbook_versions?select=payload&user_id=eq.'+s.user.id+'&revision=eq.'+Number(revision),{token:s.access_token});if(!rows[0])throw new Error('Version not found.');const data=validate(migrate(rows[0].payload));this.backup(this.getData());await this.onRestore(data);await this.push(data,remote?.revision||0,s,m);});}catch(e){this.say('Restore stopped · '+e.message);}finally{this.busy=false;this.onStatus();}}
 async signOut(){clearTimeout(this.timer);await this.lock(async()=>{const s=this.session;if(s)await this.request('/auth/v1/logout?scope=local',{method:'POST',token:s.access_token}).catch(()=>{});this.storage.removeItem(AUTH_KEY);this.choice=false;this.say('Signed out · workouts remain on this device');});}
}

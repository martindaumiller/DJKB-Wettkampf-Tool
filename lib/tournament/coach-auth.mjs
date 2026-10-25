import {contactRows} from './operations.mjs';
const enc=new TextEncoder(),fail=(m,status=400)=>Object.assign(Error(m),{status}),nonce=()=>crypto.randomUUID()+crypto.randomUUID();
const hash=async s=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(s))),x=>x.toString(16).padStart(2,'0')).join('');
export function coachEmail(value){const email=String(value||'').trim().toLowerCase();if(email.length>254||!/^[^\s@<>;,]+@[^\s@<>;,]+\.[^\s@<>;,]+$/.test(email))throw fail('Gültige E-Mail-Adresse eingeben');return email;}
export function coachDojos(s,email){return contactRows(s).find(r=>r.email===email)?.dojos||[];}
export function coachUserValid(s,u){return !u?.coachEmail||u.role==='trainer'&&coachDojos(s,u.coachEmail).includes(u.dojo);}
export function coachAccessView(bundle,s){return {contacts:contactRows(s).map(r=>({...r,active:bundle.accounts.some(a=>a.coachEmail===r.email&&a.role==='trainer'),lastMail:[...(bundle.coachMailLog||[])].reverse().find(m=>m.email===r.email)||null})),sender:'noreply@karate-klub-ippon.de',cc:'daumiller@djkb.com'};}
async function coachGateway(env,payload,fetcher){
 if(!env.SDM_MAIL_GATEWAY_URL||!env.SDM_MAIL_GATEWAY_TOKEN)throw fail('Coach-Mailversand noch nicht eingerichtet',503);
 const base=new URL(env.SDM_MAIL_GATEWAY_URL);if(base.protocol!=='https:')throw fail('Mailversand benötigt HTTPS',503);
 // Keep the fixed mail command small; dojo metadata is not used by the gateway.
 const command={id:payload.id,kind:payload.kind,email:payload.email,...(payload.kind==='code'?{code:payload.code,expires:payload.expires}:{})};
 const body=enc.encode(JSON.stringify(command)),encoded=btoa(String.fromCharCode(...body));
 return fetcher(new URL('coach-mail.php',base),{method:'POST',headers:{'Content-Type':'application/json; charset=utf-8','X-SDM-Gateway-Key':env.SDM_MAIL_GATEWAY_TOKEN,'X-SDM-Coach-Payload':encoded},body,cache:'no-store',redirect:'manual',signal:AbortSignal.timeout(15000)});
}
export async function coachMailHealth(env,fetcher=fetch){
 // The invalid kind is rejected before storage or sending by the authenticated gateway.
 const r=await coachGateway(env,{id:crypto.randomUUID(),kind:'health',email:'health@example.test',text:'Übertragung prüfen'},fetcher);
 const text=await r.text();let result;try{if(text.length<=2048)result=JSON.parse(text);}catch{}
 return {gatewayReachable:r.status===400,postBodyReceived:r.status===400&&result?.error==='Empfänger ungültig',gatewayStatus:r.status,mailSent:false};
}
export async function sendCoachMail(env,payload,fetcher=fetch){
 const r=await coachGateway(env,payload,fetcher);
 if(!r.ok)throw fail(r.status===400?'Der Maildienst konnte die Nachricht nicht verarbeiten. Bitte erneut versuchen.':'Mailserver nicht erreichbar. Bitte erneut versuchen.',503);const text=await r.text();if(text.length>2048)throw fail('Mailbestätigung ungültig',502);let result;try{result=JSON.parse(text);}catch{throw fail('Mailbestätigung ungültig',502);}if(result.accepted!==true||result.id!==payload.id)throw fail('Mail wurde nicht bestätigt',502);return result;
}
async function recordDelivery(env,ctx,item){for(let n=0;n<8;n++){const {bundle,revision}=await ctx.loadBundle(env.DB);bundle.coachMailLog=(bundle.coachMailLog||[]).filter(m=>m.id!==item.id);bundle.coachMailLog.push(item);bundle.coachMailLog=bundle.coachMailLog.slice(-100);if(await ctx.commitBundle(env.DB,revision,bundle))return;}/* A delivery log failure never grants a login. */}
export async function requestCoachCode(request,env,a,ctx,fetcher=fetch){
 const email=coachEmail(a.email);if(!env.SDM_MAIL_GATEWAY_URL||!env.SDM_MAIL_GATEWAY_TOKEN)throw fail('Coach-Mailversand noch nicht eingerichtet',503);
 const emailHash=await hash(email),ip=await hash(request.headers.get('cf-connecting-ip')||'local'),now=Date.now(),bytes=crypto.getRandomValues(new Uint32Array(1)),code=String(bytes[0]%100000000).padStart(8,'0'),id=crypto.randomUUID(),expires=now+15*60000,codeHash=await hash(id+'|'+code);let dojos=[];
 for(let n=0;n<8;n++){
  const {bundle,revision}=await ctx.loadBundle(env.DB);bundle.coachAuthLimits=(bundle.coachAuthLimits||[]).filter(l=>l.at>now-600000);if(bundle.coachAuthLimits.filter(l=>l.emailHash===emailHash).length>=3||bundle.coachAuthLimits.filter(l=>l.ip===ip).length>=100)throw fail('Zu viele Anfragen. Bitte in zehn Minuten erneut versuchen.',429);
  dojos=coachDojos(bundle.model,email);bundle.coachChallenges=(bundle.coachChallenges||[]).filter(c=>c.expires>now&&c.emailHash!==emailHash&&!c.used);if(bundle.coachChallenges.length>=200)throw fail('Anmeldung gerade ausgelastet. Bitte später erneut versuchen.',429);
  bundle.coachChallenges.push({id,emailHash,codeHash,dojos,expires,attempts:0,used:false});bundle.coachAuthLimits.push({emailHash,ip,at:now});
  if(await ctx.commitBundle(env.DB,revision,bundle))break;if(n===7)throw fail('Bitte erneut versuchen',409);
 }
 // Same response for unknown and known addresses; only a registration contact receives a code.
 if(dojos.length){let status='sent';try{await sendCoachMail(env,{id,kind:'code',email,code,expires,dojos},fetcher);}catch{status='failed';}await recordDelivery(env,ctx,{id,email,kind:'code',status,at:new Date().toISOString()});}
 return {accepted:true,challenge:id,expires,message:'Wenn die Adresse zur Meldung gehört, erhältst du einen Code. Bitte auch Spam prüfen.'};
}
export async function verifyCoachCode(request,env,a,ctx){
 const email=coachEmail(a.email),emailHash=await hash(email),id=String(a.challenge||''),code=String(a.code||'').replace(/[\s-]/g,'');if(!/^[a-f0-9-]{36}$/.test(id)||!/^\d{8}$/.test(code))throw fail('Achtstelligen Code eingeben',401);const codeHash=await hash(id+'|'+code);
 for(let n=0;n<8;n++){
  const {bundle,revision}=await ctx.loadBundle(env.DB),c=bundle.coachChallenges?.find(c=>c.id===id&&c.emailHash===emailHash);if(!c||c.used||c.expires<=Date.now()||c.attempts>=5)throw fail('Code ungültig oder abgelaufen. Neuen Code anfordern.',401);
  const dojos=coachDojos(bundle.model,email).filter(d=>c.dojos.includes(d));if(c.codeHash!==codeHash||!dojos.length){c.attempts++;if(await ctx.commitBundle(env.DB,revision,bundle))throw fail('Code ungültig oder abgelaufen.',401);continue;}
  if(dojos.length>1&&!a.dojo)return {chooseDojo:dojos};const dojo=a.dojo||dojos[0];if(!dojos.includes(dojo))throw fail('Dojo gehört nicht zu dieser E-Mail-Adresse',403);
  let user=bundle.accounts.find(u=>u.role==='trainer'&&u.coachEmail===email&&u.dojo===dojo);if(!user){user={id:crypto.randomUUID(),name:email+' · '+dojo,role:'trainer',dojo,tatami:null,coachEmail:email};bundle.accounts.push(user);}
  const raw=nonce(),csrf=nonce();bundle.sessions=bundle.sessions.filter(s=>s.expires>Date.now());bundle.sessions.push({key:await hash(raw),userId:user.id,csrf,expires:Date.now()+43200000});c.used=true;delete c.codeHash;
  if(await ctx.commitBundle(env.DB,revision,bundle,{actor:user.name,action:'coach-login',body:{dojo}}))return {ok:true,sessionToken:raw,user:{name:user.name,role:'trainer',dojo}};
 }
 throw fail('Anmeldung inzwischen geändert. Bitte erneut versuchen.',409);
}
export async function inviteCoach(env,bundle,s,email,ctx,fetcher=fetch){email=coachEmail(email);const dojos=coachDojos(s,email);if(!dojos.length)throw fail('E-Mail-Adresse zuerst beim Dojo hinterlegen');const recent=(bundle.coachMailLog||[]).some(m=>m.email===email&&m.kind==='invite'&&m.status==='sent'&&Date.parse(m.at)>Date.now()-300000);if(recent)throw fail('Einladung wurde bereits verschickt. In fünf Minuten erneut möglich.',429);const id=crypto.randomUUID();try{await sendCoachMail(env,{id,kind:'invite',email,dojos},fetcher);await recordDelivery(env,ctx,{id,email,kind:'invite',status:'sent',at:new Date().toISOString()});return {accepted:true};}catch(e){await recordDelivery(env,ctx,{id,email,kind:'invite',status:'failed',at:new Date().toISOString()});throw e;}}

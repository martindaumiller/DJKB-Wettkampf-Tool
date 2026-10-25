import * as C from './core.mjs';

export function streamClock(s,u,a,now=Date.now()){
  const t=s.tatamis.find(t=>t.id===(u.role==='table'?u.tatami:a.tatami));
  if(!t||u.role==='table'&&a.tatami!==undefined&&a.tatami!==u.tatami)throw Object.assign(Error('Nur eigene Tatami'),{status:403});
  const seconds=Number(a.seconds);if(!Number.isInteger(seconds)||seconds<0||seconds>604800)throw Error('Aufnahmezeit in Sekunden: 0 bis 604800');
  s.recordings??=[];
  let recording=s.recordings.find(r=>r.id===t.recordingId);
  if(a.newRecording||!recording){recording={id:C.uid(),tatami:t.id,url:t.stream||'',created:new Date(now).toISOString(),anchors:[]};s.recordings.push(recording);t.recordingId=recording.id;}
  recording.anchors.push({at:new Date(now).toISOString(),seconds,actor:u.name});recording.origin=now-seconds*1000;
  return {recordingId:recording.id};
}
export function mark(s,u,b,kind,note='',now=Date.now()){
  const t=s.tatamis.find(t=>t.id===C.tatami(s,b));const r=s.recordings?.find(r=>r.id===t?.recordingId);
  const f=b.teamFights?.findLast(f=>f.status==='live'||f.status==='done');
  const marker={id:C.uid(),at:new Date(now).toISOString(),tatami:t.id,recordingId:r?.id||null,seconds:r?Math.max(0,Math.floor((now-r.origin)/1000)):null,group:b.group,bout:b.id,kind,note:String(note||'').trim().slice(0,300),actor:u.name,aka:C.ent(s,b.aka)?.name||'',shiro:C.ent(s,b.shiro)?.name||'',akaEntry:b.aka,shiroEntry:b.shiro,...(kind.startsWith('team-')&&f?{individual:f.index+1,akaMember:f.akaMember,shiroMember:f.shiroMember,aka:f.akaName,shiro:f.shiroName}:{})};
  s.streamMarkers??=[];s.streamMarkers.push(marker);return marker;
}
export function playbackURL(url,seconds){
  if(seconds===null||seconds===undefined)return null;
  try{const u=new URL(url);if(['youtube.com','www.youtube.com','m.youtube.com','youtu.be','www.youtube-nocookie.com'].includes(u.hostname)){let id=u.hostname==='youtu.be'?u.pathname.slice(1):u.searchParams.get('v')||u.pathname.match(/^\/(?:embed|live)\/([^/]+)/)?.[1];if(id&&/^[\w-]{11}$/.test(id))return 'https://www.youtube.com/watch?v='+id+'&t='+seconds+'s';}return null;}catch{return null;}
}
export function streamView(s,u){
  if(!u&&!s.event.published)return {recordings:[],streamMarkers:[]};
  const allowed=t=>u?.role!=='table'||t===u.tatami;
  return {recordings:(s.recordings||[]).filter(r=>allowed(r.tatami)).map(({anchors,origin,...r})=>r),streamMarkers:(s.streamMarkers||[]).filter(m=>allowed(m.tatami)).map(({actor,note,...m})=>({...m,...(u?{actor,note}:{}),url:playbackURL(s.recordings?.find(r=>r.id===m.recordingId)?.url,m.seconds)}))};
}

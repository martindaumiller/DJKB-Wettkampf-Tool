import { importJSON } from './core.mjs';

export function previewMailbox(state, payload) {
  if (!Array.isArray(payload?.records) || payload.records.length > 500) {
    throw Error('Ungültige Antwort der Postfachanbindung');
  }
  let staged = structuredClone(state);
  const data = [], items = [], report = {people:0,entries:0,teams:0,duplicates:0,warnings:[]};
  for (const record of payload.records) {
    const next = structuredClone(staged);
    const item = {source:String(record.source || ''),dojo:String(record.data?.dojo || ''),received:String(record.data?.received_at || '')};
    try {
      const result = importJSON(next, record.data);
      staged = next;
      data.push(record.data);
      for (const key of ['people','entries','teams','duplicates']) report[key] += result[key];
      report.warnings.push(...result.warnings);
      items.push({...item,ok:true,report:result});
    } catch (e) {
      items.push({...item,ok:false,error:e.message});
    }
  }
  return {data,items,report,files:Number(payload.files || 0),mail:payload.mail || {},
    warnings:Array.isArray(payload.warnings)?payload.warnings.map(String):[]};
}

export async function fetchMailbox(env, fetcher = fetch) {
  if (!env.SDM_MAIL_GATEWAY_URL || !env.SDM_MAIL_GATEWAY_TOKEN) {
    throw Object.assign(Error('Postfachanbindung ist noch nicht eingerichtet'), {status:503});
  }
  const url = new URL(env.SDM_MAIL_GATEWAY_URL);
  if (url.protocol !== 'https:') throw Error('Postfachanbindung benötigt HTTPS');
  const response = await fetcher(url, {headers:{'X-SDM-Gateway-Key':env.SDM_MAIL_GATEWAY_TOKEN},
    redirect:'manual',signal:AbortSignal.timeout(25000)});
  if (!response.ok) throw Object.assign(Error('Postfachanbindung nicht erreichbar'),{status:502});
  let bytes=0, chunks=[];
  for await (const chunk of response.body) {
    bytes += chunk.byteLength;
    if (bytes > 1800000) { await response.body.cancel().catch(()=>{}); throw Error('Postfachantwort zu groß'); }
    chunks.push(chunk);
  }
  const joined = new Uint8Array(bytes); let at=0;
  for (const chunk of chunks) { joined.set(chunk,at); at+=chunk.byteLength; }
  return JSON.parse(new TextDecoder().decode(joined));
}

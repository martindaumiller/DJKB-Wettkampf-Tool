import http from 'node:http';
import https from 'node:https';
import { readFile, stat, realpath, mkdir, readdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import { gzipSync, brotliCompressSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { networkInterfaces } from 'node:os';
import { tournamentAPI } from '../lib/tournament/api.mjs';
import { openDatabase } from './sqlite.mjs';
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.pdf':'application/pdf','.webmanifest':'application/manifest+json'};
const etag=bytes => '"' + createHash('sha256').update(bytes).digest('base64url').slice(0,24) + '"';
export async function createTournamentServer({root, dataDirectory, accounts, hostname='127.0.0.1', port=8080, tls=null, allowedHosts=[]}) {
  const publicRoot=await realpath(path.join(root,'public'));
  const db=openDatabase(path.join(dataDirectory,'tournament.sqlite'));
  const env={DB:db,SDM_DIRECT_ACCOUNTS:JSON.stringify(accounts)};
  const hosts=new Set(['localhost','127.0.0.1','[::1]',...allowedHosts,...Object.values(networkInterfaces()).flat().filter(Boolean).map(n=>n.address)]);
  const assets=new Map();
  const headers={'X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','X-Frame-Options':'SAMEORIGIN'};
  let writes=Promise.resolve(), closed=false, snapshotting=null;
  // Serialize mutations only. Reads continue between commands; SQLite batches are atomic.
  function serial(fn) { const result=writes.then(fn,fn); writes=result.catch(()=>{}); return result; }
  async function snapshot() {
    if (snapshotting) return snapshotting;
    snapshotting=(async()=>{
      const dir=path.join(dataDirectory,'backups'); await mkdir(dir,{recursive:true});
      const name='wettkampf-'+new Date().toISOString().replace(/[:.]/g,'-')+'.sqlite';
      await db.snapshot(path.join(dir,name));
      const files=(await readdir(dir)).filter(x=>/^wettkampf-.*\.sqlite$/.test(x)).sort();
      for (const stale of files.slice(0,-24)) await unlink(path.join(dir,stale));
      return name;
    })().finally(()=>{snapshotting=null;});
    return snapshotting;
  }
  async function answer(req,res) {
    if (!['GET','HEAD','POST'].includes(req.method)) {res.writeHead(405,headers).end();return;}
    let url;
    try {url=new URL(req.url,(tls?'https://':'http://')+req.headers.host);} catch {res.writeHead(400).end();return;}
    if (!hosts.has(url.hostname)) {res.writeHead(421,headers).end('Unbekannter Host');return;}
    if (req.headers.origin && req.headers.origin!==url.origin) {res.writeHead(403,headers).end('Fremder Ursprung');return;}
    if (url.pathname==='/health') {res.writeHead(200,{...headers,'Content-Type':'application/json','Cache-Control':'no-store'}).end(JSON.stringify({ok:true,mode:'local-sqlite',internetRequired:false}));return;}
    if (/^\/(?:zentrum\/)?api\//.test(url.pathname)) {
      let body;
      if(req.method==='POST') {
        const parts=[];let size=0;
        for await (const part of req) {size+=part.length;if(size>2000000){res.writeHead(413,headers).end('Anfrage zu groß');return;}parts.push(part);}
        body=Buffer.concat(parts);
      }
      const target=new URL(url);target.pathname=target.pathname.replace(/^\/zentrum/,'');
      const request=new Request(target,{method:req.method==='HEAD'?'GET':req.method,headers:req.headers,body});
      const run=()=>tournamentAPI(request,env,null);
      const result=req.method==='POST'?await serial(run):await run();
      let bytes=Buffer.from(await result.arrayBuffer());
      const out={...headers,...Object.fromEntries(result.headers)};
      // HTTP LAN transport is explicit (--lan). Auth, CSRF and origin checks remain active.
      if (!tls && out['set-cookie']) out['set-cookie']=out['set-cookie'].replace('; Secure;',';');
      if (req.method==='GET' && result.ok && !out['set-cookie'] && out['content-type']?.includes('application/json')) {
        let value=JSON.parse(bytes);
        if (value && typeof value==='object' && !Array.isArray(value)) { delete value.serverTime; if(value.network) delete value.network.serverTime; }
        bytes=Buffer.from(JSON.stringify(value));
        out.etag=etag(bytes);out['x-server-time']=String(Date.now());out.vary='Cookie, If-None-Match, Accept-Encoding';out['cache-control']='private, no-cache';
        if(req.headers['if-none-match']===out.etag) {res.writeHead(304,out).end();return;}
      }
      if(bytes.length>700 && /gzip/.test(req.headers['accept-encoding']||'')) {bytes=gzipSync(bytes,{level:1});out['content-encoding']='gzip';}
      out['content-length']=String(bytes.length);
      res.writeHead(result.status,out).end(req.method==='HEAD'?undefined:bytes);return;
    }
    if(req.method==='POST'){res.writeHead(405,headers).end();return;}
    let decoded;
    try {decoded=decodeURIComponent(url.pathname);}catch {res.writeHead(400,headers).end();return;}
    if (decoded.includes('\\') || decoded.split('/').some(x=>x.startsWith('.')&&x!=='')) {res.writeHead(404,headers).end();return;}
    const file=path.resolve(publicRoot,'.'+decoded+(decoded.endsWith('/')?'index.html':''));
    if(!file.startsWith(publicRoot+path.sep)){res.writeHead(404,headers).end();return;}
    let real;try{real=await realpath(file);}catch{res.writeHead(404,headers).end('Nicht gefunden');return;}
    if(!real.startsWith(publicRoot+path.sep)){res.writeHead(404,headers).end();return;}
    const info=await stat(real);
    let entry=assets.get(real);
    if(!entry || entry.modified!==info.mtimeMs) {
      const raw=await readFile(real), type=types[path.extname(real)]||'application/octet-stream';
      entry={modified:info.mtimeMs,raw,type,etag:etag(raw)};
      if (/text|json|svg|manifest/.test(type)&&raw.length>700) {entry.gzip=gzipSync(raw);entry.br=brotliCompressSync(raw);}
      assets.set(real,entry);
    }
    const out={...headers,'Content-Type':entry.type,ETag:entry.etag,'Cache-Control':real.endsWith('.html')||real.endsWith('sw.js')?'no-cache':'public, max-age=3600',Vary:'Accept-Encoding'};
    if(req.headers['if-none-match']===entry.etag){res.writeHead(304,out).end();return;}
    const enc=req.headers['accept-encoding']||'', bytes=entry.br&&enc.includes('br')?entry.br:entry.gzip&&enc.includes('gzip')?entry.gzip:entry.raw;
    if(bytes===entry.br)out['Content-Encoding']='br';else if(bytes===entry.gzip)out['Content-Encoding']='gzip';
    out['Content-Length']=String(bytes.length);res.writeHead(200,out).end(req.method==='HEAD'?undefined:bytes);
  }
  const handler=(req,res)=>{answer(req,res).catch(e=>{console.error('Anfrage fehlgeschlagen:',e.message);if(!res.headersSent)res.writeHead(500,headers);res.end('Interner Fehler');});};
  const server=tls?https.createServer(tls,handler):http.createServer(handler);
  server.requestTimeout=15000;server.headersTimeout=10000;
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,hostname,resolve);});
  await snapshot();
  const timer=setInterval(()=>snapshot().catch(e=>console.error('Sicherung fehlgeschlagen:',e.message)),60000);timer.unref();
  return {server,db,port:server.address().port,snapshot,async inject(input,options={}) {
    const url=new URL(input),request={url:url.pathname+url.search,method:options.method||'GET',headers:Object.fromEntries(new Headers({...options.headers,host:url.host})),async *[Symbol.asyncIterator](){if(options.body)yield Buffer.from(options.body);}};
    let status=200,responseHeaders={},body=null;
    const response={headersSent:false,writeHead(code,h={}){status=code;responseHeaders=h;this.headersSent=true;return this;},end(value){body=value??null;return this;}};
    await answer(request,response);
    return new Response([204,304].includes(status)?null:body,{status,headers:responseHeaders});
  },async close() {
    if(closed)return;closed=true;clearInterval(timer);
    await new Promise(resolve=>server.close(resolve));await writes;await snapshot();db.close();
  }};
}

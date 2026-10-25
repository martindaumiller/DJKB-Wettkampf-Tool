import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createTournamentServer} from './http.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),dataDirectory=path.join(root,'data');
let accounts;try{accounts=JSON.parse(await readFile(path.join(dataDirectory,'accounts.json'),'utf8'));}catch{console.error('Zuerst npm run setup ausführen. Es gibt keine voreingestellten Passwörter.');process.exit(1);}
const lan=process.argv.includes('--lan'),hostname=lan?'0.0.0.0':'127.0.0.1',port=Number(process.env.PORT||8080);
let tls=null;
if(process.env.TLS_CERT && process.env.TLS_KEY)tls={cert:await readFile(process.env.TLS_CERT),key:await readFile(process.env.TLS_KEY)};
await import('../scripts/prepare.mjs');
const app=await createTournamentServer({root,dataDirectory,accounts,hostname,port,tls,allowedHosts:(process.env.ALLOWED_HOSTS||'').split(',').filter(Boolean)});
console.log('DJKB Wettkampf Tool: '+(tls?'https':'http')+'://localhost:'+app.port);
if(lan) console.log('LAN aktiv. Hallengeräte verwenden die IP dieses Rechners. HTTP nur im vertrauenswürdigen Hallennetz; für Kamera/PWA an fremden Geräten HTTPS verwenden.');
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>app.close().then(()=>process.exit(0)));

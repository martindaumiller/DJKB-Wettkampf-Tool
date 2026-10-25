import {readdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';import {createHash} from 'node:crypto';
const root=path.resolve('public'),files=[];
async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const full=path.join(dir,entry.name),relative=path.relative(root,full).replaceAll('\\','/');if(entry.isDirectory()){if(entry.name!=='zentrum')await walk(full);}else if(/\.(html|css|js|svg|json|pdf)$/.test(entry.name)&&!['sw.js','precache.json'].includes(relative))files.push(relative);}}
await walk(root);
const digest=createHash('sha256');for(const name of files.sort())digest.update(name).update(await readFile(path.join(root,name)));
const version='djkb-public-'+digest.digest('hex').slice(0,12);
const worker="const CACHE="+JSON.stringify(version)+",FILES="+JSON.stringify(files)+";\n"+
"self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES.map(p=>new URL(p,self.registration.scope).href)))));\n"+
"self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('djkb-public-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));\n"+
"self.addEventListener('fetch',e=>{const u=new URL(e.request.url),base=new URL(self.registration.scope);if(e.request.method!=='GET'||u.origin!==base.origin||!u.pathname.startsWith(base.pathname))return;let p=u.pathname.slice(base.pathname.length);if(p.endsWith('/')||p==='')p+='index.html';if(!FILES.includes(p))return;const canonical=new URL(p,base).href;e.respondWith(caches.match(canonical).then(cached=>cached||fetch(e.request)));});\n";
await writeFile(path.join(root,'sw.js'),worker);console.log('Offline-Demo: '+files.length+' Dateien, '+version);

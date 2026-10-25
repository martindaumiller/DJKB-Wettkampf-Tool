await import('./prepare.mjs');
import {mkdir,cp,readFile,writeFile,readdir,stat,rm} from 'node:fs/promises';
import path from 'node:path';import {createHash} from 'node:crypto';
const root=process.cwd(),out=path.join(root,'release/strato'),archive=path.join(out,'archiv-2026');
// Only the generated release directory inside this checkout is replaced.
if(out!==path.resolve(root,'release','strato'))throw Error('Ungültiger Releaseordner');
await rm(out,{recursive:true,force:true});
await mkdir(archive,{recursive:true});
for(const name of ['index.html','projekt.html','sw.js','assets','demo','ergebnisse'])await cp(path.join(root,'public',name),path.join(archive,name),{recursive:true});
await writeFile(path.join(out,'index.php'),"<?php\nheader('Location: ./archiv-2026/', true, 302);\nexit;\n");
await writeFile(path.join(out,'index.html'),'<!doctype html><html lang="de"><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=./archiv-2026/"><title>SDM 2026 · Ergebnisse</title><a href="./archiv-2026/">Ergebnisse, Siegerliste und Demo öffnen</a></html>');
await writeFile(path.join(out,'HTACCESS-EINFUEGEN.txt'),'# Vor alte SDM-Startseiten-Weiterleitungen einfügen; sonstige Regeln erhalten.\nDirectoryIndex index.php index.html\n<IfModule mod_rewrite.c>\nRewriteEngine On\nRewriteRule ^$ archiv-2026/ [R=302,L]\n</IfModule>\n');
const files=[];
async function walk(dir){for(const e of await readdir(dir,{withFileTypes:true})){const full=path.join(dir,e.name);if(e.isDirectory())await walk(full);else{const data=await readFile(full);files.push({path:path.relative(out,full).replaceAll('\\','/'),bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')});}}}
await walk(out);await writeFile(path.join(out,'SHA256.json'),JSON.stringify(files,null,2));
console.log(JSON.stringify({directory:out,files:files.length,bytes:files.reduce((n,f)=>n+f.bytes,0),productionChanged:false}));

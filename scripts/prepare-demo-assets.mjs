import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd(),src=path.join(root,'public/zentrum'),out=path.join(root,'public/demo/renderer');
const pending=['broadcast-graphics.js','overlay-preview.html'],seen=new Set();
await mkdir(out,{recursive:true});
while(pending.length){
 const file=pending.shift();if(seen.has(file))continue;seen.add(file);
 if(!/^[a-zA-Z0-9_.-]+$/.test(file))throw Error('Ungültiger Modulpfad');
 let text=await readFile(path.join(src,file),'utf8');
 for(const match of text.matchAll(/(?:from\s*|src=)["']\.\/([^"'?#]+)(?:[^"']*)["']/g)){if(/\.(?:js|css)$/.test(match[1]))pending.push(match[1]);}
 text=text.replaceAll('../assets/mark.svg','../../assets/mark.svg').replaceAll('./djkb-sued.svg','../../assets/mark.svg');
 await writeFile(path.join(out,file),text);
}
console.log('Demomodule vorbereitet: '+seen.size);

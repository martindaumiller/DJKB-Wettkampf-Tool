import {mkdir,writeFile,access} from 'node:fs/promises';
import {randomBytes,pbkdf2Sync,randomUUID} from 'node:crypto';
import path from 'node:path';
const dir=path.resolve('data');await mkdir(dir,{recursive:true});
try{await access(path.join(dir,'accounts.json'));console.error('Bereits eingerichtet. Vorhandene Zugänge bleiben erhalten.');process.exit(1);}catch(e){if(e.code!=='ENOENT')throw e;}
const definitions=[{name:'leitung',role:'admin'},...Array.from({length:5},(_,i)=>({name:'tisch'+(i+1),role:'table',tatami:i+1}))];
const credentials=[],accounts=definitions.map(d=>{
  const password=randomBytes(18).toString('base64url'),salt=randomBytes(24).toString('hex');
  credentials.push(d.name+': '+password);
  return {...d,id:randomUUID(),salt,hash:pbkdf2Sync(password,salt,100000,32,'sha256').toString('hex')};
});
await writeFile(path.join(dir,'accounts.json'),JSON.stringify(accounts,null,2),{mode:0o600,flag:'wx'});
await writeFile(path.join(dir,'zugangsdaten.txt'),'PRIVATE ZUGÄNGE – nicht veröffentlichen\n'+credentials.join('\n')+'\n',{mode:0o600,flag:'wx'});
console.log('Zugänge erstellt: data/zugangsdaten.txt. Geschützt aufbewahren. Danach npm start oder npm start -- --lan.');

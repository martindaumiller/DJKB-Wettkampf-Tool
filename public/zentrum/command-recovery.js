export const uncertainResponse=e=>e?.uncertain===true||!Number.isInteger(e?.status)||e.status===0||e.status>=500;
export const emergencyStop=p=>p?.type==='production'&&p.op==='medical'&&p.enabled===true;
const canRemember=p=>['bout','fieldReview'].includes(p?.type)&&typeof p.commandId==='string'&&!/(?:password|access|token|secret|csrf)/i.test(JSON.stringify(p));
export function commandLabel(p){if(p.type==='fieldReview')return 'Gruppenabschluss';if(p.type==='bout')return ({score:'Wertung',penalty:'Verwarnung',timer:'Zeitnahme',judges:'Kata-Wertung',finish:'Kampfergebnis',start:'Begegnungsstart',teamFight:'Team-Einzelkampf',technical:'Technikwertung',undo:'Rücknahme'}[p.action]||'Tischeingabe');return 'Eingabe';}
// One unresolved command per tab. Replays use byte-identical JSON and the same
// command ID; they never create a fresh score. No offline command queue.
export class ConfirmedCommands{
 constructor({send,storage=null,key='sdm-pending-command-v53',onChange=()=>{}}){this.send=send;this.storage=storage;this.key=key;this.onChange=onChange;this.pending=null;this.busy=false;
  try{const p=JSON.parse(storage?.getItem(key)||'null');if(p?.schema===1&&typeof p.context==='string'&&typeof p.raw==='string'&&canRemember(JSON.parse(p.raw)))this.pending={...p,uncertain:true};}catch{}
 }
 save(){try{if(this.pending?.remember)this.storage?.setItem(this.key,JSON.stringify(this.pending));else this.storage?.removeItem(this.key);}catch{}this.onChange(this);}
 async submit(payload,context){if(this.pending)throw Object.assign(Error('Zuerst die ausstehende Eingabe prüfen.'),{uncertain:true});this.pending={schema:1,raw:JSON.stringify(payload),context,created:Date.now(),remember:canRemember(payload),uncertain:false,label:commandLabel(payload)};this.save();return this.execute(context);}
 async execute(context){if(this.busy)throw Error('Bestätigung wird bereits geprüft.');if(!this.pending||this.pending.context!==context)throw Error('Ausstehende Eingabe gehört zu einem anderen Zugang oder Wettkampf. Dort den Stand prüfen.');
  const p=this.pending;this.busy=true;this.onChange(this);try{
   for(let attempt=0;attempt<2;attempt++)try{const result=await this.send(JSON.parse(p.raw));this.pending=null;this.save();return result;}catch(e){if(!uncertainResponse(e)&&!p.uncertain){this.pending=null;this.save();throw e;}p.uncertain=true;this.save();if(attempt===1||!uncertainResponse(e))throw Object.assign(Error(p.label+': Bestätigung fehlt. Bitte prüfen; nicht erneut werten.'),{uncertain:true,cause:e});}
  }finally{this.busy=false;this.onChange(this);}
 }
 clear(acknowledged=false){if(this.busy)throw Error('Prüfung läuft.');if(!acknowledged)throw Error('Aktuellen Stand zuerst prüfen.');this.pending=null;this.save();}
}

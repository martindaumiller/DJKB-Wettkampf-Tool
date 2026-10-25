import {remainingAt} from '../../public/zentrum/clock-sync.js';

const names={score:'Wertung',penalty:'Verwarnung',timer:'Zeitnahme',setTime:'Zeitkorrektur',correctScore:'Punktekorrektur',removePenalty:'Verwarnungskorrektur',teamFight:'Team-Eingabe',technicalStep:'Technikwertung',repeatTechnique:'Technikwiederholung',technicalRepeat:'Wiederholung',kataFlag:'Kata-Auswahl',kataRepeat:'Kata-Wiederholung'};
const lastAction=b=>b.actions?.findLast(x=>x.before&&!x.undone);
export function undoAvailability(b){
 const last=lastAction(b),allowed=b.status==='live'&&last?.before.status==='live'&&!['start','reopen'].includes(last.action);
 return {allowed:!!allowed,label:allowed?(names[last.action]||'Letzte Eingabe'):''};
}
export function recordBoutAction(b,actor,a,before,now=Date.now()){
 const timed=['score','penalty','timer'].includes(a.action)||a.action==='teamFight'&&a.op!=='start';
 const clockAt=timed&&Number.isFinite(b.timer?.changedAt)?Math.min(now,b.timer.changedAt):now;
 b.actions??=[];b.actions.push({id:crypto.randomUUID(),actor,at:new Date(now).toISOString(),clockAt,action:a.action,before:a.action==='undo'?null:before});b.actions=b.actions.slice(-10);
}
function stopped(timer,at,now){return {...timer,remaining:remainingAt(timer,Math.max(at,timer.since||0)),since:null,changedAt:now};}
export function undoBoutAction(b,now=Date.now()){
 const last=lastAction(b);if(!undoAvailability(b).allowed)throw Error('Keine rücknehmbare Eingabe. Begegnungsstart und abgeschlossene Ergebnisse über die Wettkampfleitung ändern.');
 const logs=b.actions,version=b.version,previous=structuredClone(last.before),recorded=Number.isFinite(last.clockAt)?last.clockAt:Date.parse(last.at),at=Math.min(now,Number.isFinite(recorded)?recorded:now);
 if(previous.timer)previous.timer=stopped(previous.timer,at,now);
 for(const f of previous.teamFights||[])if(f.status==='live'&&f.timer)f.timer=stopped(f.timer,at,now);
 const live=previous.teamFights?.find(f=>f.status==='live');if(live?.timer)previous.timer=structuredClone(live.timer);
 // Replace the snapshot completely: introduced score hints, repeat flags or
 // team fights must disappear when their creating action is undone.
 for(const key of Object.keys(b))if(!['actions','version'].includes(key)&&!Object.hasOwn(previous,key))delete b[key];
 Object.assign(b,previous);b.actions=logs;b.version=version;last.undone=true;
}

export function timerEventTime(timer,value,now=Date.now()){
 if(value===undefined)return now; // Existing deployed clients remain compatible.
 if(!Number.isFinite(value)||value<now-3000||value>now+150)throw Error('Zeitbefehl zu spät oder Uhr nicht abgeglichen. Stand prüfen und erneut drücken.');
 const at=Math.min(now,Math.round(value));
 if(at<Math.max(timer.since||0,timer.changedAt||0))throw Error('Zeitbefehl überholt. Aktuellen Stand prüfen.');
 return at;
}

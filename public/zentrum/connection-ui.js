export class ConnectionHealth{
 constructor(){this.failures=0;this.firstFailure=0;}
 success(){this.failures=0;this.firstFailure=0;}
 fail(now=Date.now()){this.failures++;this.firstFailure||=now;return now-this.firstFailure>=15000||this.failures>=4;}
 text(last,now=Date.now()){const old=now-this.firstFailure>=15000||this.failures>=4;return (old?'Verbindung unterbrochen · letzter Stand bleibt sichtbar':'Verbindung wird erneuert · letzter Stand bleibt sichtbar')+(last?' · '+new Date(last).toLocaleTimeString('de-DE'):'')+' · Eingaben pausiert';}
}
export function offlineShell(){return '<section class="card connection-start"><h1>DJKB Wettkampf Tool</h1><p>Hallenserver nicht erreichbar. Verbindung zum Hallennetz und Server prüfen. Unbestätigte Eingaben nicht neu erfassen.</p><button data-connection-retry>Jetzt erneut verbinden</button></section>';}

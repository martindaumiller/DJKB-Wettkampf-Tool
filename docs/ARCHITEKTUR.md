# Architektur

## Eine schreibende Instanz

Alle Wettkampfgeräte verwenden denselben lokalen Node.js-Prozess und dieselbe SQLite-Datei. Der Server bindet standardmäßig an 127.0.0.1; LAN wird ausdrücklich aktiviert. Es gibt keinen Rückgriff auf den bisherigen Cloud-Dienst.

Browser -> lokaler HTTP/HTTPS-Handler -> bestehende Rechte-/Befehlsprüfung -> SQLite-Transaktion.

Der D1-kompatible Adapter in `server/sqlite.mjs` erhält den geprüften Wettkampfkern, ersetzt aber die Cloud-Datenbank durch SQLite. Die Mutation wird vor Ausgabe der Erfolgsantwort committed. WAL und FULL-Synchronisation verringern Datenverlust bei Prozess-/Stromausfällen; sichere Stromversorgung und getrennte Backups bleiben notwendig.

## Konflikte und verlorene Antworten

Jeder Tischbefehl hat eine ID. Die Speicherung von Befehl, Quittung, Prüfprotokoll und Modell erfolgt gemeinsam. Wiederholung desselben Befehls liefert dieselbe Quittung. Andere Daten mit derselben ID werden verworfen. Veraltete Begegnungsversionen und fremde Tischrechte bleiben gesperrt.

`ConfirmedCommands` behält bei einem unsicheren Ergebnis maximal einen offenen Befehl pro Tab. Weitere Eingaben sind gesperrt. Das verhindert versehentliche Doppelwertung; es ist keine allgemeine Offlinewarteschlange. Ein komplett isolierter Tisch darf den Turnierbaum nicht eigenständig fortschreiben.

## Effiziente Übertragung

Statische Dateien: Dateiversion -> ETag -> Brotli/Gzip -> Browsercache.

Lesende API: Authentifizierung und Berechtigungsprüfung -> autorisierter JSON-Stand -> ETag -> 304 bei Gleichheit. Flüchtige Serverzeit wird als Header übertragen und vom Client wieder eingesetzt. Private Cacheeinträge leben nur im Modulgedächtnis des Tabs und werden vor jedem Schreibzugriff gelöscht. Service Worker dürfen keine API-, Konto- oder Teilnehmerkontakte zwischenspeichern.

Die bestehende beschränkte Bildschirmansicht überträgt nur benötigte Tatamidaten. Für alle Verwaltungsansichten ist ein vollständiges Delta-/Push-Protokoll noch eine Weiterentwicklung, keine bereits zugesicherte Eigenschaft.

## Öffentliche Seite

Die statische Archivseite enthält ausschließlich freigegebene Ergebnisse. Die Standalone-Demo enthält erfundene Namen und ein gezeichnetes Kameratestbild. localStorage/BroadcastChannel teilen nur diese Simulation im selben Browser.

`sw.js` enthält eine explizite Liste öffentlicher Dateien und eine inhaltsabhängige Cacheversion. API-Routen, Fremdursprünge und nicht gelistete Pfade werden nicht abgefangen. Eine neue Version aktiviert sich erst nach Ende alter kontrollierter Sitzungen; laufende Seiten werden nicht ungefragt mit neuen Modulen vermischt.

## Video

Kamera -> lokaler Rechner/OBS -> optional Streaminganbieter.

Die Ergebniseinblendung kann lokal als Browserquelle genutzt werden. Eine dargestellte Vorschau startet keinen Internetlivestream. Zentraler Videoempfang kann das Hallennetz belasten, auch wenn die Internetverbindung unbenutzt bleibt. Rechenleistung, WLAN-Kapazität, Kamera-/Audiolatenz und Encoder müssen mit dem tatsächlichen Aufbau getestet werden.

Die alte Onlineoberfläche, E-Mail-/Pushanbindungen und externe Registrierungsformulare sind keine Voraussetzung für den lokalen Kern. SMTP/IMAP, automatische Internetveröffentlichung und ein failoverfähiger zweiter Schreibserver werden nicht automatisch eingerichtet.

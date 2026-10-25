# DJKB Wettkampf Tool

[Öffentliches Repository](https://github.com/martindaumiller/DJKB-Wettkampf-Tool) · [Testläufe](https://github.com/martindaumiller/DJKB-Wettkampf-Tool/actions)

Lokaler Betrieb für Kata und Kumite: Wettkampfleitung, fünf Tische, Poolplanung, Hallenanzeigen und Streamgrafiken. Entstanden aus der Süddeutschen Meisterschaft 2026 in Nürnberg.

**Grundprinzip:** Der Hallenserver ist die gemeinsame Datenquelle. Der Wettkampf benötigt keine Verbindung zu Cloudflare, ChatGPT oder einem Internetserver. Öffentliche Ergebnisse und Videoübertragung sind separate Aufgaben.

Version 0.3.0 ist eine überprüfbare technische Grundlage. Eine Freigabe für ein nächstes Turnier setzt den vollständigen Probelauf auf den tatsächlichen Geräten voraus. Unabhängiges Community-Projekt; keine offizielle Softwarefreigabe des DJKB.

## Schnellstart

Voraussetzung: **Node.js 24 oder neuer** vor der Veranstaltung installieren. Keine npm-Abhängigkeiten und keine Paketdownloads zum Starten.

```sh
npm run setup
npm start
```

Danach http://localhost:8080/ öffnen. Das Wettkampfzentrum liegt unter http://localhost:8080/zentrum/index.html.

Für andere Hallengeräte:

```sh
npm start -- --lan
```

Auf den Geräten `http://LAN-IP-DES-SERVERS:8080/zentrum/index.html` verwenden. Unter Windows kann `Start-DJKB.cmd` genutzt werden. Betriebssystem-Firewall und Netzwerkfreigabe bewusst für das eigene Hallennetz einrichten.

Die Einrichtung erzeugt zufällige, unterschiedliche Zugänge für `leitung` und `tisch1` bis `tisch5`. Sie stehen in `data/zugangsdaten.txt`. Es gibt keine veröffentlichten Standardpasswörter. Vorhandene Zugänge werden beim erneuten Setup nicht überschrieben.

Standardmäßig bindet der Server ausschließlich an Loopback. `--lan` aktiviert den Zugriff im Hallennetz. HTTP ist nur für ein vertrauenswürdiges, isoliertes Hallennetz vorgesehen. HTTPS: `TLS_CERT` und `TLS_KEY` auf vertrauenswürdige Zertifikatsdateien setzen. Eigene DNS-Namen über `ALLOWED_HOSTS` (kommagetrennt) erlauben. Niemals private Schlüssel in Git speichern.

## Ansichten ausprobieren

- `/`: Ergebnis- und Projektseite.
- `/demo/`: vereinfachte Tischsimulation mit Kata/Kumite, Zeitnahme und Szenenwahl.
- `/demo/?view=display`: Hallenanzeige zur selben Simulation.
- `/demo/?view=stream`: Streambild mit animiertem Testbild und Ergebniseinblendung.
- `/demo/renderer/overlay-preview.html`: weitere Einblendungen.
- `/zentrum/index.html`: vollständige übernommene Turnieroberfläche mit Anmeldung.

Die öffentliche Demo arbeitet mit fiktiven Daten, localStorage und BroadcastChannel. Mehrere Tabs **desselben Browsers und Ursprungs** teilen den Zustand. Sie simuliert keine Netzwerkverteilung über verschiedene Geräte und entscheidet keine echten Wettkämpfe. Für mehrere Geräte wird der Hallenserver verwendet.

## Vollständige Turnierprobe

Die öffentliche Turnierprobe unter `/demo/tool/public/zentrum/index.html` verwendet die Originaloberfläche und denselben Wettkampfkern. Zehn fiktive Gruppen zeigen Kata-Flaggen, Kata-Punkte mit fünf/sieben Kampfrichtern, Kihon-Ippon, Jiyu-Ippon, Jiyu-Kumite und Teams auf fünf Tatamis. Rollen, Gruppen/Pools, Teams, Auslosung, Freigaben, Korrekturen, Anzeigen und Drucklisten lassen sich damit prüfen. Die Schreibzugriffe werden mit Web Locks zwischen Tabs serialisiert; Befehls-ID und Begegnungsversion schützen gegen Wiederholung und veraltete Eingaben.

Die Probe teilt ihre Beispieldaten nur im selben Browser. Für mehrere Geräte, echte Konten, Mail, Onlinevideo und externe Dienste wird der vollständige lokale Hallenserver verwendet. Keine echten Teilnehmerdaten in die öffentliche Probe importieren.

Kata besitzt in beiden Vorschauen und im Wettkampfkern keine Zeitnahme. Das bereitgestellte DJKB-Stützpunkt-Süd-Logo ist wieder eingebunden; es fällt nicht unter die MIT-Lizenz des Codes.

## Betrieb

1. Veranstaltungsdatum, Ausschreibung, Alters-/Kyu-Gruppen und Gebühren prüfen.
2. Meldungen als JSON über die Leitung importieren. Teams und Ausnahmen prüfen.
3. Gruppen und Pools planen, auslosen, Tatamis zuordnen und freigeben.
4. Tischzugänge verteilen. Anzeige-/Zeitnehmerlinks in der Leitung erstellen.
5. Kata-/Kumitewertungen erfassen; Gruppenabschluss und Freigaben durchführen.
6. Ergebnisse und Papierlisten regelmäßig exportieren.

**Die Konfiguration im übernommenen Kern ist weiterhin die SDM 2026.** Datum, Gruppen, Altersberechnung und Regelvarianten dürfen für ein anderes Turnier nicht ungeprüft übernommen werden. Einzelheiten: [Konfiguration](docs/KONFIGURATION.md).

## Ohne Internet, mit unterbrochenem Hallennetz

| Ausfall | Verhalten |
| --- | --- |
| Internet/WAN getrennt | Tische, Leitung und Anzeigen arbeiten am lokalen Hallenserver weiter. |
| Verbindung eines Tischs zum Hallennetz getrennt | Letzter Stand bleibt sichtbar. Wertungen pausieren, fehlende Bestätigung prüfen. |
| Antwort nach einer Wertung verloren | Derselbe Befehl wird mit identischer ID erneut geprüft. Keine neue Wertung anlegen. |
| Hallenserver neu gestartet | SQLite lädt gespeicherte Daten und Sitzungen. Offene Bestätigungen kontrollieren. |
| Server oder Stromversorgung ausgefallen | Gedruckte Listen verwenden; Sicherung auf vorbereitetem Ersatzserver wiederherstellen. |

Es gibt **keine automatische Zusammenführung gleichzeitig beschriebener Offline-Turnierkopien** und keine Speicherung beliebig vieler Wertungen an isolierten Tischen. Genau ein Server bleibt schreibende Instanz.

Die öffentliche Ergebnis-/Demoseite speichert ihre statischen Dateien per Service Worker. Das funktioniert über HTTPS oder localhost nach vollständigem Erstladen. Ein gewöhnlicher HTTP-Aufruf über eine fremde LAN-IP ist dafür kein sicherer Kontext. Der lokale Hallenbetrieb selbst benötigt keinen Service Worker.

## Sparsame Datenübertragung

- Statische Dateien erhalten ETags und werden mit Brotli/Gzip komprimiert.
- Authentifizierte Lesestände werden nach der Rechteprüfung mit einem ETag verglichen. Bei unverändertem Stand wird ein HTTP-304 ohne Datenkörper zurückgegeben.
- Laufende Uhren werden aus dem gespeicherten Startzeitpunkt lokal gezeichnet; keine Netzwerkanfrage je Bild.
- Hallenanzeigen verwenden die vorhandenen beschränkten Anzeigeansichten.
- Schreibbefehle bleiben kleine JSON-Nachrichten mit Befehls-ID und Versionsschutz.
- ETags sparen Übertragungsvolumen, **keine** serverseitige Berechnung des berechtigten Lesestands. Es gibt noch kein vollständiges ereignisbasiertes Delta-Protokoll für alle Verwaltungsansichten.

Siehe [Architektur](docs/ARCHITEKTUR.md) und [Hallenbetrieb](docs/HALLENBETRIEB.md).

## Speicherung und Sicherung

`data/tournament.sqlite` mit WAL und `synchronous=FULL`; Transaktionen schützen zusammengehörige Änderungen. Mindestens alle 60 Sekunden und beim geregelten Start/Ende wird über die SQLite-Backup-API eine lesbare Sicherung erstellt; die letzten 24 automatischen Sicherungen bleiben erhalten. Backupfehler werden in der Serverkonsole gemeldet.

Diese Dateien liegen zunächst auf **demselben Rechner**. Zusätzlich regelmäßig auf ein getrenntes Laufwerk sichern. Eine USV und ein vorbereiteter Ersatzrechner schützen gegen andere Fehlerklassen als eine Datenbanktransaktion.

[Wiederherstellung und Ausfallprobe](docs/HALLENBETRIEB.md).

## Testen

```sh
npm test
node scripts/prepare-demo-assets.mjs
node scripts/prepare-offline.mjs
npm run package
```

Tests prüfen Wettkampfregeln, Rechte, Teamzuordnung, Konflikte, parallele Schreibvorgänge, idempotente Befehle, SQLite-Neustart/Sicherung, HTTP-Handler, Cachetrennung und Demozustand. Der HTTP-Handler wird in dieser Entwicklungsumgebung ohne echte Socketverbindung getestet; ausgehende lokale Verbindungen sind dort gesperrt. Ein Browser-/Gerätetest und ein mehrstündiger Hallenlasttest sind damit nicht ersetzt.

## Ergebnisse und STRATO

Ergebnisdaten und Sieger-PDFs gehören in `public/ergebnisse/`; sie werden **nicht in Git aufgenommen**. Import aus dem freigegebenen Ergebnismaterial, niemals aus privaten Teilnehmerdatensätzen. Ohne solche Dateien ist die öffentliche Ergebnisübersicht ein ergänzbares Veranstaltungstemplate; die interaktive Demo funktioniert unabhängig davon.

`npm run package` erzeugt ein statisches STRATO-Paket in `release/strato/`. Es enthält die Archivseite mit Siegerliste und die unabhängige Demo. Es ersetzt weder die vorhandene Online-Wettkampfdatenbank noch den alten API-Proxy. [Veröffentlichungsanleitung](docs/VEROEFFENTLICHUNG.md).

## Mitentwickeln

Beiträge über Issues und Pull Requests: [CONTRIBUTING.md](CONTRIBUTING.md). Prioritäten: schnellerer rollenbezogener Zustandsabgleich, generische Turnierkonfiguration, Hardwaretests, auswertbare Verbindungs-/Lastdiagnose und ein kontrollierter Ergebnisexport zur öffentlichen Website.

MIT für den Projektcode. Eingebettete PDF-Bibliotheken und Noto Sans besitzen eigene freie Lizenzen; siehe [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md). Kampfrichter-Gestikgrafiken, reale Kontakt-/Bankdaten, Zugangsdaten und private Teststream-Verweise sind nicht Bestandteil dieses Quellpakets.

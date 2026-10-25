# Veröffentlichung

## GitHub

Das öffentliche Repository ist eingerichtet: https://github.com/martindaumiller/DJKB-Wettkampf-Tool

Quellcode, Lizenz, Dokumentation und Tests werden dort gepflegt. Einstieg:

```sh
git clone https://github.com/martindaumiller/DJKB-Wettkampf-Tool.git
cd DJKB-Wettkampf-Tool
npm run setup
npm start
```

Änderungen als Branch und Pull Request vorbereiten. Der GitHub-Workflow führt die Tests bei Pushes und Pull Requests aus. `data/`, echte Ergebnisdateien, Datenbanken, ZIPs, Umgebungsdateien und Schlüssel sind ausgeschlossen.

STRATO ist von diesem Quellrepository getrennt. Die Nürnberger Ergebnisseite wurde am 25.10.2026 über STRATO WebFTP veröffentlicht: https://karate-klub-ippon.de/sdm/. Die Hauptadresse führt per HTTP 302 zum Archiv. Suche, Disziplinfilter, Kumite-/Kata-Demo und der Zustandsabgleich zwischen Demotabs wurden im Browser geprüft.

## STRATO: Nürnberger Homepage

Öffentliche Adresse: `https://karate-klub-ippon.de/sdm/`.

Die Domain ist intern auf `/WordPress_01` eingestellt. Der aktive Webspace-Pfad für SDM ist deshalb **`/WordPress_01/sdm/`**, nicht `/sdm/` direkt unter dem Webspace-Stamm. Das Archiv liegt in `/WordPress_01/sdm/archiv-2026/`.

Vor der Aktivierung wurden `.htaccess`, `index.html` und `index.php` separat als ZIP gesichert. Die Aktivierung erfolgte durch eine zusätzliche erste RewriteRule für die Hauptadresse und `index.html`/`index.php`. Die bisherigen Routing- und Schutzregeln bleiben dahinter erhalten. Formulare, Anmeldungen, APIs und das bisherige Wettkampfzentrum wurden nicht ersetzt.

Das statische Paket wird aus freigegebenen Ergebnisdaten erzeugt:

```sh
node scripts/prepare-demo-assets.mjs
node scripts/prepare-offline.mjs
npm run package
```

1. Die Domainzuordnung im Hosting prüfen. Bestehende Startdateien und `.htaccess` im aktiven SDM-Verzeichnis sichern.
2. Den neuen Ordner `release/strato/archiv-2026/` nach `/WordPress_01/sdm/archiv-2026/` hochladen. Ein vorhandener anderer Archivstand darf nicht ungeprüft überschrieben werden.
3. Direkt `/sdm/archiv-2026/` öffnen. Ergebniszahlen, Suche, alle PDFs, Demo und mobile Darstellung prüfen.
4. Erst danach die vorbereiteten `index.php`/`index.html` im SDM-Stamm aktivieren. Die vorhandene `.htaccess` auf Startseitenweiterleitungen prüfen. Den beiliegenden Fragmenttext vor alte Startseitenregeln einfügen und sonstige Regeln erhalten.
5. Root-Aufruf `/sdm/` prüfen. Der temporäre HTTP-302-Rückweg soll zum Archiv führen. Formulare, bisherige `zentrum/`-Dateien, Mailkonfiguration, Anmeldungen und alte API bleiben erhalten.
6. Bei Problemen ausschließlich die gesicherten Startdateien und Routingregeln wiederherstellen.

Das Paket enthält keine STRATO-Zugangsdaten. Die Manifestdatei `SHA256.json` nennt Dateigrößen und Prüfsummen. Ein ZIP auf dem Webspace abzulegen aktiviert die Website nicht; Dateien müssen entpackt/übertragen werden.

## Trennung der Dienste

STRATO liefert die Ergebnis-/Demoseite. Der neue lokale Node-Server läuft auf dem Hallenrechner. Shared Hosting startet den Node-Hallenserver nicht durch Hochladen des statischen Pakets.

Automatisches Spiegeln laufender Turnierdaten ins Internet ist eine geplante Erweiterung. Der vorliegende Stand veröffentlicht bewusst einen freigegebenen Ergebnisexport; es werden keine privaten SQLite-Datenbanken hochgeladen.

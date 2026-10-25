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

STRATO ist von diesem Quellrepository getrennt. Die Nürnberger Ergebnisseite wurde am 25.10.2026 über STRATO WebFTP veröffentlicht: https://karate-klub-ippon.de/sdm/. Die Hauptadresse führt per HTTP 302 auf /sdm/archiv-2026-v2/. Version 0.3.0 mit originalem DJKB-Logo, vollständiger Turnierprobe und korrigiertem Wanderpokal ist live. TV Bushido Tamm gewinnt mit 39 Punkten, punktgleich mit KD Sportfreunde Reichenberg. Kata-Aufruf, Flaggenentscheidung, Punktewertung ohne Uhr, Suche und der PDF-Download wurden im Browser geprüft. Die heruntergeladene Sieger-PDF ist bytegenau identisch mit der freigegebenen Datei.

## STRATO: Nürnberger Homepage

Öffentliche Adresse: `https://karate-klub-ippon.de/sdm/`.

Die Domain ist intern auf `/WordPress_01` eingestellt. Der aktive Webspace-Pfad für SDM ist deshalb **`/WordPress_01/sdm/`**, nicht `/sdm/` direkt unter dem Webspace-Stamm. Der aktuelle Archivstand liegt in `/WordPress_01/sdm/archiv-2026-v2/`. Das bisherige Archiv bleibt auf dem Webspace als Rückweg erhalten; seine öffentlichen Links führen zur neuen Fassung.

Vor der Aktivierung wurden `.htaccess`, `index.html` und `index.php` separat als ZIP gesichert. Die Aktivierung erfolgte durch eine zusätzliche erste RewriteRule für die Hauptadresse und `index.html`/`index.php`. Die bisherigen Routing- und Schutzregeln bleiben dahinter erhalten. Formulare, Anmeldungen, APIs und das bisherige Wettkampfzentrum wurden nicht ersetzt.

Das statische Paket wird aus freigegebenen Ergebnisdaten erzeugt:

```sh
node scripts/prepare-demo-assets.mjs
node scripts/prepare-offline.mjs
npm run package
```

1. Die Domainzuordnung im Hosting prüfen. Bestehende Startdateien und `.htaccess` im aktiven SDM-Verzeichnis sichern.
2. Den generierten Ordner `release/strato/archiv-2026/` unter einem neuen Versionsnamen bereitstellen. Für 0.3.0 wurde er als `/WordPress_01/sdm/archiv-2026-v2/` hochgeladen; vorhandene Archivstände bleiben als Rückweg erhalten.
3. Den neuen Archivpfad direkt öffnen. Ergebniszahlen, Suche, PDFs, Demo und Darstellung prüfen.
4. Erst danach die vorbereiteten `index.php`/`index.html` im SDM-Stamm aktivieren. Die vorhandene `.htaccess` auf Startseitenweiterleitungen prüfen. Den beiliegenden Fragmenttext vor alte Startseitenregeln einfügen und sonstige Regeln erhalten.
5. Root-Aufruf `/sdm/` prüfen. Der temporäre HTTP-302-Rückweg soll zum Archiv führen. Formulare, bisherige `zentrum/`-Dateien, Mailkonfiguration, Anmeldungen und alte API bleiben erhalten.
6. Bei Problemen ausschließlich die gesicherten Startdateien und Routingregeln wiederherstellen.

Das Paket enthält keine STRATO-Zugangsdaten. Die Manifestdatei `SHA256.json` nennt Dateigrößen und Prüfsummen. Ein ZIP auf dem Webspace abzulegen aktiviert die Website nicht; Dateien müssen entpackt/übertragen werden.

## Bereits geteilte Archivlinks

Die alte Adresse `/sdm/archiv-2026/` und ihre Unterpfade führen per HTTP 302 zur neuen Fassung. Nur die alte `sw.js` bleibt erreichbar: `docs/archive-worker-migration.js` ersetzt dort den überholten Offline-Worker, öffnet für alte Archivclients den neuen Pfad und meldet sich anschließend ab. Wettkampfdaten und andere Caches werden dabei nicht gelöscht. Das wurde mit einem zuvor gecachten Archivtab geprüft.

Die Routingergänzung vor den bisherigen Regeln lautet:

```apache
RewriteEngine On
RewriteRule ^(?:index\.(?:html|php))?$ /sdm/archiv-2026-v2/ [R=302,L,NE,QSA]
RewriteRule ^archiv-2026/sw\.js$ - [L]
RewriteRule ^archiv-2026(?:/(.*))?$ /sdm/archiv-2026-v2/$1 [R=302,L,NE,QSA]
```

Alle bisherigen Routing- und Schutzregeln stehen unverändert dahinter. Zum Zurückschalten dienen der alte Archivordner und die gesicherte Routingdatei.

## Trennung der Dienste

STRATO liefert die Ergebnis-/Demoseite. Der neue lokale Node-Server läuft auf dem Hallenrechner. Shared Hosting startet den Node-Hallenserver nicht durch Hochladen des statischen Pakets.

Automatisches Spiegeln laufender Turnierdaten ins Internet ist eine geplante Erweiterung. Der vorliegende Stand veröffentlicht bewusst einen freigegebenen Ergebnisexport; es werden keine privaten SQLite-Datenbanken hochgeladen.

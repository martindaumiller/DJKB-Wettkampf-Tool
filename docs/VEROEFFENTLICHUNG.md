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

STRATO ist von diesem Quellrepository getrennt. Der Upload zur Nürnberger Homepage wurde aus der eingeschränkten Arbeitsumgebung noch nicht ausgeführt; dafür ist ein erreichbarer Hostingzugang erforderlich.

## STRATO: Nürnberger Homepage

Ziel: `https://karate-klub-ippon.de/sdm/`.

Das statische Paket wird aus freigegebenen Ergebnisdaten erzeugt:

```sh
node scripts/prepare-demo-assets.mjs
node scripts/prepare-offline.mjs
npm run package
```

1. Bestehende `/sdm/index.php`, `index.html` und `.htaccess` herunterladen und lokal sichern.
2. Den neuen Ordner `release/strato/archiv-2026/` nach `/sdm/archiv-2026/` hochladen. Ein vorhandener anderer Archivstand darf nicht ungeprüft überschrieben werden.
3. Direkt `/sdm/archiv-2026/` öffnen. Ergebniszahlen, Suche, alle PDFs, Demo und mobile Darstellung prüfen.
4. Erst danach die vorbereiteten `index.php`/`index.html` im SDM-Stamm aktivieren. Die vorhandene `.htaccess` auf Startseitenweiterleitungen prüfen. Den beiliegenden Fragmenttext vor alte Startseitenregeln einfügen und sonstige Regeln erhalten.
5. Root-Aufruf `/sdm/` prüfen. Der temporäre HTTP-302-Rückweg soll zum Archiv führen. Formulare, bisherige `zentrum/`-Dateien, Mailkonfiguration, Anmeldungen und alte API bleiben erhalten.
6. Bei Problemen ausschließlich die gesicherten Startdateien und Routingregeln wiederherstellen.

Das Paket enthält keine STRATO-Zugangsdaten. Die Manifestdatei `SHA256.json` nennt Dateigrößen und Prüfsummen. Ein ZIP auf dem Webspace abzulegen aktiviert die Website nicht; Dateien müssen entpackt/übertragen werden.

## Trennung der Dienste

STRATO liefert die Ergebnis-/Demoseite. Der neue lokale Node-Server läuft auf dem Hallenrechner. Shared Hosting startet den Node-Hallenserver nicht durch Hochladen des statischen Pakets.

Automatisches Spiegeln laufender Turnierdaten ins Internet ist eine geplante Erweiterung. Der vorliegende Stand veröffentlicht bewusst einen freigegebenen Ergebnisexport; es werden keine privaten SQLite-Datenbanken hochgeladen.

# Konfiguration

Der Quellstand übernimmt die SDM 2026. Er ist noch kein vollständig generischer Turniereditor.

| Einstellung | Ort / Bearbeitung |
| --- | --- |
| Veranstaltung, Datum, Standardwerte | `lib/tournament/core.mjs`, `init()`; anschließend neue leere Datenbank verwenden bzw. eine geprüfte Migration durchführen |
| Gruppen, Alter, Kyu, Disziplin | `lib/tournament/groups.json` |
| Tagesplan und Phasen | `public/zentrum/day-plan.json`, `lib/tournament/group-plan.mjs` |
| Altersberechnung | `core.mjs`, `age()`; SDM-Stichtag 24.10.2026 bewusst ersetzen und Tests anpassen |
| Standardgebühren und Meldeschluss | `fees.mjs`, `management.mjs`, `invoices.mjs` und Veranstaltungswerte |
| Private Rechnungsdaten | Im Leitungsbereich konfigurieren; keine Bank-/Adressdaten im Repository hinterlegen |
| Lokale Zugänge | `npm run setup`, anschließend geschützte Dateien unter `data/` |
| Port | Umgebungsvariable `PORT`, Standard 8080 |
| Eigene DNS-Namen | `ALLOWED_HOSTS`, kommagetrennt |
| HTTPS | `TLS_CERT`, `TLS_KEY` auf lokale Zertifikatsdateien |
| Öffentliche Ergebnisse | `public/ergebnisse/results.json` und freigegebene PDF-Dateien |
| Streamziele | Zuschauer-/Embed-Links je Tatami in der Leitung; keine Streamschlüssel in URLs oder Quellcode |

Bei einer Datum-/Regeländerung auch Altersgrenzen, Teamzulassung, Gebührenfristen und alle repräsentativen Wettkampfabläufe testen. Bestehende echte Turnierdaten nicht durch Austausch des Initialzustands migrieren.

Alte SDM-Formular-, Mail- und Pushverweise in übernommenen Hilfetexten sind historische Integrationsstellen. Für einen eigenständigen Einsatz eigene Registrierung/Kommunikation einrichten oder diese Bereiche deaktivieren. Mailversand, Push, externe Anmeldung und YouTube sind optional und im lokalen Grundbetrieb nicht konfiguriert.

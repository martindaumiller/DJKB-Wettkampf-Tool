# Hallenbetrieb und Ausfallprobe

## Aufbau

- Hallenserver, Leitung und Regie nach Möglichkeit per Ethernet an einen Switch anschließen.
- Für Tischgeräte einen eigenen Zugangspunkt oder ein eigenes SSID/VLAN verwenden; Zuschauerverkehr getrennt halten.
- Server-IP reservieren und auf allen Geräten dieselbe Adresse verwenden. Nicht einzelne Geräte auf die alte Cloud-URL umleiten.
- Server und Netzwerktechnik an USV anschließen. Energiesparen, automatische Neustarts und Ruhezustand vor Ort prüfen.
- Ersatzrechner mit derselben Node-Version und Quellversion bereithalten. Papierlisten und Exporte vor der Veranstaltung erzeugen.
- Den privaten Ordner `data/` schützen. Windows-Dateirechte richten sich nach dem Betriebssystem; POSIX-Modi allein ersetzen dort keine ACL-Prüfung.

## Abnahme vor Ort

1. Alle fünf Tische gleichzeitig anmelden. Pro Tisch eine vollständig durchgespielte Kata-/Kumitegruppe verwenden.
2. Anzeigen auf separaten Geräten prüfen; die Vorschau im selben Browser ist dafür kein Ersatz.
3. Ein Kamerabild je geplantem Stream mit Ton verwenden. Mindestens 30 Minuten mit der vorgesehenen gleichzeitigen Videolast laufen lassen.
4. Den WAN-/Internetzugang trennen. Lokale Tische müssen weiter speichern und Anzeigen müssen den bestätigten Stand zeigen.
5. Die Netzwerkverbindung genau eines Tischs trennen. Keine neue Eingabe als bestätigt anzeigen. Nach Rückkehr die offene Befehlsquittung prüfen; keine Doppelwertung.
6. Server geregelter Neustart, danach Prozessabbruch mit synthetischen Testdaten. Die zuletzt bestätigten Werte, Auslosung und Berechtigungen prüfen.
7. Backup auf einem Ersatzrechner wiederherstellen, Gesamtstände vergleichen und eine Gruppe abschließen. Die ursprüngliche Serverinstanz dabei ausgeschaltet lassen.
8. Ergebnisse, Drucklisten, Namensumlaute und Kata-Gleichstände kontrollieren. Keine realen Teilnehmerdaten für Lasttests verwenden.

## Wiederherstellung

1. Server beenden. Niemals eine laufende Datenbankdatei einfach ersetzen.
2. Den gesamten vorhandenen `data/`-Ordner unter anderem Namen sichern.
3. Aus `data/backups/` eine geprüfte SQLite-Sicherung auf den Ersatzrechner übernehmen und als `data/tournament.sqlite` einsetzen.
4. Zum Ersatzrechner gehören die passenden `data/accounts.json` und geschützten Zugänge. Eine Datenbanksicherung allein ersetzt diese Konfiguration nicht.
5. Etwaige alte `tournament.sqlite-wal` und `tournament.sqlite-shm` nicht mit einer anderen Datenbanksicherung mischen; den neuen Datenordner verwenden.
6. Genau einen Server starten. Auf den Tischen wieder anmelden, Stand/Begegnung/letzte Bestätigung prüfen und erst nach gemeinsamer Freigabe weiterarbeiten.

Automatische Sicherungen auf demselben Datenträger schützen nicht vor Hardwareverlust. Kopien auf getrennten Datenträger übertragen.

## Bandbreite für Streams

Planrechnung: Anzahl × (Video-Mbit/s + Audio-Mbit/s) × Reservefaktor.

Beispiel: 5 × (3,00 + 0,16) × 1,50 = 23,7 Mbit/s stabil nutzbarer Upload. Das ist eine Planannahme, keine Netzgarantie. Schwankungen, Protokolloverhead und andere Nutzer kommen hinzu. Den echten Encoder messen; Speedtest-Spitzenwerte allein genügen nicht.

Bei Engpässen zuerst Auflösung/Bitrate/Streamzahl reduzieren oder lokal aufzeichnen. Der Wettkampf darf nicht vom Videoupload abhängen.

## HTTPS und Browserfunktionen

Service Worker und Kamerazugriff sind an sichere Browserkontexte gebunden. localhost gilt als sicher; eine normale HTTP-LAN-IP gewöhnlich nicht. Für Kamera/PWA auf entfernten Geräten vertrauenswürdiges HTTPS einsetzen. Keine Sicherheitswarnungen routinemäßig umgehen.

Quellen: [MDN Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API), [OBS Browser Source](https://obsproject.com/kb/browser-source), [SQLite Backup](https://sqlite.org/backup.html).

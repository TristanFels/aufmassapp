# Prüfbericht 0.2.1 · Benannte individuelle Aufmaße

Stand: 02.11.2026. Umsetzung gemäß `tasks/003-named-measurements.md`.

## Automatisiert geprüft

- `npm test`: 126 Tests in 6 Dateien bestanden (Vitest/fake-indexeddb).
- `npm run build`: TypeScript-Prüfung, Vite-Produktions-Build und Erzeugung der PWA-App-Shell erfolgreich.
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e`: 14 Tests bestanden, mobile Chromium-Konfiguration 390 × 844, Touch aktiviert.
- `git diff --check`: keine Whitespace-Fehler.

Die Datenprüfungen decken Aufmaßtrennung, Einzelkorrekturen, Projektgesamtsummen ohne Doppelzählung, getrennte Varianten, leere Aufmaße, Namen/Kategorien, Archivschutz, Katalogänderungen und eingefrorene Snapshots ab. Je Aufmaß/Artikel gilt das Mengenlimit 1.000.000; größere sichere Projektgesamtsummen bleiben möglich.

Eine echte Dexie-Version-2-Datenbank wird in Tests nach Version 3 migriert, geschlossen und wieder geöffnet. Buchungs-IDs, Mengen, Importnamen, Katalogänderungen, Favoriten, Einstellungen und letzter Projektzugriff bleiben erhalten. Ein absichtlich fehlerhafter zweiter Projektbezug erzwingt einen Upgrade-Abbruch; das alte Schema und sämtliche alten Daten bleiben unverändert. Bestehende Version-1-Datenbanken sind ebenfalls geprüft.

JSON-Tests prüfen vollständigen Roundtrip einschließlich leerer Aufmaße und eigener Artikel, alte Schemata 1/2, kollidierende IDs, ungültige Referenzen, negative Einzelsummen trotz positiver Projektsumme, unbekannte Felder und vollständigen Rollback bei Schreibfehlern. CSV-Tests prüfen Mengen je Aufmaß/Projekt, Varianten, BOM, Trennzeichen, Maskierung und Formelschutz.

Browserprüfungen prüfen Projektverwaltung, Katalogpflege, alle vier Navigationspunkte, beide Aufmaßeinstiege, Wiederöffnen/Umbenennen/Kategoriepflege, explizite Addition und getrennte Gesamtkorrektur, JSON auf frischem Browserprofil, Aufmaß-/Baustellen-CSV, Exportabstand, Offline-Neustart, fehlenden horizontalen Überlauf und `/aufmassapp/` für Manifest, Icons und Service Worker. Der dabei gefundene Fehler mit doppelten React-Schlüsseln beim Zurückwechseln in die Verwaltung ist behoben und durch den erfolgreichen Navigationsablauf abgedeckt. Tests warten vor dem Schließen auf abgeschlossene Speicherung.

## Noch manuell auf echtem iPhone zu prüfen

1. Online-Update einer bestehenden 0.2-Installation mit vorher extern gesicherten Testdaten; „Bisheriges Aufmaß“, alle Mengen, Favoriten und Einstellungen vergleichen. Safari und installierte PWA getrennt betrachten.
2. Installation, angebotener Service-Worker-Wechsel und Offline-Kaltstart im Flugmodus nach vollständiger Erstinstallation.
3. Touchbedienung, Nummerntastatur, Scrollen, Safe Areas und Hoch-/Querformat; Namen/Kategorien und beide Mengenabläufe.
4. JSON/CSV über „Dateien“ tatsächlich extern speichern und wieder auswählen; CSV in der verwendeten Tabellen-App prüfen, JSON auf frischem Profil wiederherstellen.

Ausführliche manuelle Funktionsabnahme folgt wie vereinbart nach weiteren Gestaltungsrunden. Chromium und fake-indexeddb ersetzen keinen iOS-Gerätetest. Kein Merge und keine Live-Veröffentlichung sind Bestandteil dieses Prüfberichts. Räume, Aufmaßvorlagen, Kombinationen und automatische Wippenzuordnung sind nicht implementiert.

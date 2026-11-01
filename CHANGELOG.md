# Änderungsprotokoll

## 0.1.1 · Erkennbare Projektimporte

- Jeder Projektimport bekommt den frei änderbaren Namenszusatz „(Import)“; bereits belegte Namen werden mit „(Import 2)“, „(Import 3)“ usw. unterschieden, auch bei archivierten Projekten.
- Erneuter Export/Import stapelt keine Importzusätze; lange Namen halten das Namenslimit weiterhin ein.
- Atomare Namenswahl auch bei gleichzeitigen Importen, zusätzliche Daten-/Namensprüfungen und angepasster Browser-Abnahmetest.
- Bestehende Projektnamen bleiben unverändert; keine Datenmigration.

## 0.1.0 · Technische Basis

- React-, TypeScript- und Vite-Grundgerüst mit iPhone-orientierter Oberfläche und Navigation für Projekte, Artikel-Platzhalter und Einstellungen.
- Projektverwaltung mit Anlegen, Öffnen, Umbenennen, Archivieren und Reaktivieren sowie Schnellzugriff auf das zuletzt geöffnete Projekt.
- Automatische lokale Persistenz über Dexie/IndexedDB, stabile Projekt-IDs, Zeitstempel und Schema-Versionierung.
- Versionierter Einzelprojekt-JSON-Export und validierter, atomarer Import. ID-Kollisionen erzeugen eine neue Projektkopie; bestehende Projekte werden nicht überschrieben.
- Gespeicherte Designwahl System/Hell/Dunkel mit Reaktion auf Betriebssystemwechsel.
- PWA-Manifest, Icons und Offline-App-Shell mit kontrolliertem Update-Verhalten; GitHub-Pages-Unterpfad berücksichtigt.
- Automatisierte Daten- und Browserprüfungen sowie GitHub-Actions-Prüfung und Pages-Deployment-Workflow.
- Installations-, Architektur-, Deployment- und manuelle iPhone-Testanleitung.

Der tatsächliche iPhone-Installationstest und die Live-Veröffentlichung sind gesonderte Abnahmeschritte. Materialerfassung und alle weiteren Inkremente sind nicht Bestandteil dieser Version.

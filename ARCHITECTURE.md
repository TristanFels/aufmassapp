# Architektur · Version 0.1

## Geltungsbereich

Implementiert wird ausschließlich [Entwicklungsauftrag 001](tasks/001-foundation.md). [REQUIREMENTS.md](docs/REQUIREMENTS.md) beschreibt den langfristigen Umfang; [DATA_MODEL.md](docs/DATA_MODEL.md) bleibt ein Entwurf für spätere Erweiterungen. Bei Abweichungen begrenzt der engere Entwicklungsauftrag das aktuelle Inkrement.

React und TypeScript bilden die Oberfläche, Vite erstellt statische Dateien. IndexedDB mit Dexie speichert Projekte und Einstellungen lokal. `vite-plugin-pwa` erzeugt Manifest und Service Worker. Es gibt keinen Anwendungsserver, keine Anmeldung und keine Remote-Datenhaltung.

## Schichten und Zuständigkeiten

- `src/app/`: Navigation, Ansichten und Designanbindung. Ansichten rufen Operationen der Datenzugriffsschicht auf; sie verändern keine Dexie-Tabellen unmittelbar.
- `src/domain/`: Projekt- und Einstellungs-Typen, Versionsangaben und Validierung des öffentlichen JSON-Formats.
- `src/data/`: versioniertes Datenbankschema, Projektoperationen, Einstellungen und atomarer Import.
- `src/platform/`: browserabhängige Funktionen wie Datei-Download und PWA-Lebenszyklus.
- Tests prüfen Fach-/Datenoperationen mit Vitest und `fake-indexeddb` sowie die gebaute Anwendung mit Playwright.

Die konkrete Zuordnung einzelner UI-Hilfen darf innerhalb dieser Grenzen kompakt bleiben. Es werden keine leeren Module oder Tabellen für spätere Funktionen angelegt. Künftige Aufmaßbuchungen und Summen müssen getrennte Fachoperationen erhalten; es gibt in 0.1 noch keine Materialdaten, Mengenlogik oder Änderungshistorie.

## Persistenz und Versionierung

Projekte verwenden unveränderliche, zufällig erzeugte IDs statt des Namens als Identität. Ein Projekt speichert `id`, `name`, `status`, `createdAt`, `updatedAt` und `schemaVersion`. Statuswerte sind aktiv oder archiviert. Änderungen werden erst nach erfolgreicher IndexedDB-Operation als gespeichert behandelt; Fehler müssen sichtbar bleiben.

Die Dexie-Datenbank beginnt mit Schema-Version 1 und getrennten Tabellen für Projekte und Einstellungen. Das zuletzt geöffnete Projekt und die Designwahl werden als Einstellungen gespeichert. Das Design ist standardmäßig `system`; `light` und `dark` übersteuern die Betriebssystemvorgabe. Bei `system` wird auf Änderungen von `prefers-color-scheme` reagiert.

Datenbankversion, Projektschema und App-Version sind eigenständige Konzepte. Spätere Schemaänderungen benötigen explizite Dexie-Migrationen und Migrationstests. Ein unbekanntes zukünftiges Schema darf nicht durch stilles Weglassen von Daten als Version 1 eingelesen werden. Vor riskanten Migrationen muss ein Sicherungs-/Wiederherstellungskonzept ergänzt werden; Version 0.1 implementiert keine Snapshot-Verwaltung.

## JSON-Projektsicherung

Der Export umfasst Metadaten zum Dateiformat, Schema/App-Version und Erstellungszeitpunkt sowie genau ein Projekt. Einstellungen und weitere Projekte gehören nicht dazu. Der Import behandelt die Datei als nicht vertrauenswürdige Eingabe: JSON-Syntax, Struktur, Versionen, Pflichtfelder, Status, IDs und Zeitstempel werden vor dem Schreiben geprüft. Nicht unterstützte Felder oder Versionen werden abgelehnt, um Datenverlust durch unbemerkte Teilimporte zu vermeiden.

Die Speicherung erfolgt in einer IndexedDB-Transaktion. Ohne vorhandene ID wird die Projektidentität wiederhergestellt. Bei vorhandener ID wird eine neue ID erzeugt; die vorhandene Instanz wird niemals überschrieben. Eine gescheiterte Validierung oder Transaktion darf keine Teiländerung hinterlassen. Erweiterter Import mit Vorschau, Zusammenführen oder Ersetzen gehört nicht zu diesem Inkrement.

Seit Version 0.1.1 erhält jeder importierte Projektname „(Import)“ bzw. die nächste freie Nummer „(Import 2)“ usw. Die Namenswahl berücksichtigt aktive und archivierte Projekte, Groß-/Kleinschreibung und kanonisch gleiche Unicode-Schreibweisen. Namensprüfung und Einfügen laufen in derselben Schreibtransaktion, sodass parallele Imports unterscheidbare Namen erhalten. Vorhandene generierte Zusätze werden entfernt, bevor der neue Zusatz gewählt wird; lange Basisnamen werden Unicode-sicher auf das bestehende Namenslimit gekürzt. Status und Zeitstempel bleiben erhalten. Dafür sind weder eine Schemaänderung noch eine Datenmigration nötig; vorhandene Projekte bleiben unverändert.

## Offline und Updates

Der Service Worker hält ausschließlich die statische App-Shell und deren lokale Assets vor. Projekte bleiben in IndexedDB und werden nicht als Netzwerkantworten gecacht. Der erste erfolgreiche Onlineaufruf muss die App-Shell vollständig zwischenspeichern; eine Bereitschaftsanzeige hilft bei der Offline-Abnahme. Der Entwicklungsserver ist kein Nachweis für den Produktions-Service-Worker.

Updates werden angekündigt und ausdrücklich ausgelöst. Ein Update darf kein unerwartetes Neuladen mit ungespeicherten Formulareingaben verursachen. Vor dem Bestätigen einer Aktualisierung offene Änderungen speichern oder verwerfen. Das Aktivieren des neuen Workers und der anschließende Reload ersetzen keine Datenmigration; Datenbankschemaänderungen bleiben gesondert zu behandeln.

Offlinefähigkeit gilt nach erfolgreicher Erstinstallation und solange der Browser den lokalen Speicher erhält. iOS kann Browser-/PWA-Speicher entfernen. Eine lokale Datenbank ist daher kein externes Backup. Regelmäßiger JSON-Export und ein testweiser Import sind erforderlich.

## GitHub Pages

Für dieses Repository lautet der Basis- und Scope-Pfad `/aufmassapp/`. `VITE_BASE_PATH` ermöglicht eine explizite Anpassung; Vite-Assets, Manifest und Service Worker müssen immer denselben Pfad verwenden. Für eine Root-Veröffentlichung ist `/` zu setzen. Hash-Navigation vermeidet serverseitige SPA-Fallback-Anforderungen auf Pages.

Der Actions-Workflow installiert exakt aus dem Lockfile, führt Tests und Build aus und lädt `dist/` als Pages-Artefakt hoch. Deployment ist auf `main` begrenzt, Pull Requests werden nur validiert. `dist/` wird nicht versioniert. Repository-/Pages-Einstellungen und Geräteabnahme sind in der [README](README.md) dokumentiert.

## Tests und Grenzen

Vitest mit `fake-indexeddb` prüft Projektlebenszyklus, Wiederöffnen einer Datenbank, letzte Projektauswahl, JSON-Roundtrip, ID-Kollisionen, fehlerhafte Formate und Designpersistenz. Playwright prüft den Produktions-Build einschließlich Pages-Unterpfad und Offline-Navigation. Beide ergänzen sich: eine IndexedDB-Nachbildung beweist kein iOS-Verhalten, und ein Browsertest ersetzt keinen Standalone-Kaltstart auf dem iPhone.

Nicht überprüfte Gerätefunktionen sind ausdrücklich im manuellen Abnahmeplan festgehalten. Es wird keine universelle Aufbewahrungsgarantie für Browserdaten oder automatische Cloud-Sicherung zugesagt.

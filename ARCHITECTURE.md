# Architektur · Version 0.2

## Geltungsbereich

Version 0.2 baut auf [Entwicklungsauftrag 001](tasks/001-foundation.md) auf und ergänzt den freigegebenen Umfang aus [Entwicklungsauftrag 002](tasks/002-measurement.md). [REQUIREMENTS.md](docs/REQUIREMENTS.md) beschreibt das langfristige Produkt; [DATA_MODEL.md](docs/DATA_MODEL.md) bleibt ein Entwurf für spätere Stufen. Materialkombinationen, Bereichsbäume, Planung, automatische Wippenzuordnung, Preise, Firmenartikelnummern, PDF, umfassende Backups und Cloud-Synchronisierung werden nicht vorgezogen.

React und TypeScript bilden die Oberfläche, Vite erstellt statische Dateien. IndexedDB mit Dexie speichert Projekte, Katalog, Buchungen und Einstellungen lokal. `vite-plugin-pwa` erzeugt Manifest und Service Worker. Es gibt keinen Anwendungsserver, keine Anmeldung und keine Remote-Datenhaltung.

## Schichten und Zuständigkeiten

- `src/app/`: Navigation, Projekt-/Katalogansichten und Designanbindung. Ansichten rufen Repository-Operationen auf und verändern keine Dexie-Tabellen unmittelbar.
- `src/domain/project.ts`: Projektmodell, App-/Schema-Versionen und Validierung der JSON-Projektsicherung.
- `src/domain/material.ts`: konkrete Artikelvarianten, eingefrorene Artikelstände, Mengenbuchungen, Validierung und Aggregation.
- `src/domain/csv.ts`: frameworkunabhängiger CSV-Export mit Maskierung und Schutz gegen Tabellenformeln.
- `src/domain/importName.ts`: eindeutige, wiedererkennbare Importnamen.
- `src/data/`: versioniertes Dexie-Schema, Projekt-/Materialoperationen, Startkatalog und atomarer Import.
- `src/platform/`: browserabhängiger PWA-Lebenszyklus.
- Tests prüfen Daten-/Fachoperationen mit Vitest und `fake-indexeddb` sowie die gebaute App mit Playwright.

Es werden keine leeren Tabellen oder Module für spätere Funktionen angelegt. Aufmaßsummen sind von gespeicherten Buchungen abgeleitet; eine spätere gezielte Korrekturhistorie kann darauf aufbauen, ohne jetzt eine Historienoberfläche oder Undo/Redo einzuführen.

## Lokales Datenmodell

### Projekte und Einstellungen

Ein Projekt speichert unveränderliche zufällige `id`, `name`, `status`, `createdAt`, `updatedAt` und `schemaVersion`. Status ist `active` oder `archived`. Projektmetadaten behalten Schema 1. Einstellungen enthalten den letzten Projektzugriff und die Designwahl `system`, `light` oder `dark`. `system` bleibt Standard und folgt laufenden Änderungen von `prefers-color-scheme`.

### Katalog

Ein `Article` steht in dieser Stufe bereits für eine konkrete zählbare Variante: ID, Name, Kategorie, Hersteller, Serie, Farbe, Einheit `Stück`, Aktiv-/Favoritenstatus, Revision und Zeitstempel. Namen sind keine Materialidentität. Gleichnamige Artikel mit anderer Ausführung haben verschiedene IDs.

Der öffentliche Startkatalog enthält 22 stabile IDs aus der gelieferten Liste. Passende Ausführungen sind Gira/System 55/Reinweiß glänzend; Herdanschlussdose und Tellerleuchte bleiben neutral. Es werden keine Artikelnummern oder Preise erfunden. Der Seed ergänzt transaktional nur fehlende IDs und überschreibt weder eigene Artikel noch Bearbeitungen, Favoriten oder Deaktivierungen.

Name und Kategorie können weiter gepflegt werden. Sobald Buchungen eine Variante referenzieren, dürfen Hersteller, Serie und Farbe nicht mehr verändert werden. Eine andere reale Ausführung wird als neuer Artikel angelegt. Deaktivieren löscht keine Daten: Es verhindert neue Erfassungen und Erhöhungen, lässt bestehende Summen aber sichtbar und nach unten korrigierbar.

### Buchungen und Summen

Jede tatsächliche Mengenänderung erzeugt eine `MeasurementEntry` mit stabiler ID, `projectId`, `articleId`, eingefrorenem `articleSnapshot`, ganzzahligem `delta`, Typ `add` oder `correction` und Zeitstempel. Ein unveränderter Gesamtwert erzeugt keine Nullbuchung.

Die erste Erfassung eines Artikels in einem Projekt friert seinen Namen, Kategorie, Einheit, Ausführungsmerkmale und Revision ein. Folgebuchungen derselben Projekt-/Artikelkombination verwenden denselben Stand. Katalogänderungen verwandeln somit keine bestehenden Aufmaße rückwirkend in andere Materialien oder Beschreibungen.

Die Materialliste summiert Deltas nach stabiler Artikel-ID, niemals nach Anzeigenamen. +1 und numerisches Hinzufügen erzeugen positive Deltas. Minus und „Gesamtmenge ändern“ berechnen eine zusätzliche Korrektur gegenüber der aktuellen Summe; ältere Buchungen bleiben unverändert. Summen müssen ganzzahlig zwischen 0 und 1.000.000 liegen. Verschiedene Ausführungen werden nicht zusammengefasst. Bei Menge null bleiben die Buchungen für Sicherung und Nachvollziehbarkeit vorhanden; CSV lässt Nullzeilen aus.

Jede Mengenoperation prüft Projektstatus, Artikel und aktuelle Summe in derselben Schreibtransaktion wie das Einfügen der Buchung und die Aktualisierung des Projektzeitstempels. Archivierte Projekte erlauben keine Mengenänderung. Projektbenennung, Anzeige und Export bleiben wie bisher möglich.

## Datenbankmigration

Datenbankversion 1 enthält `projects` und `settings`. Version 2 ergänzt `articles` und `measurements` samt Indizes für Projekt-/Artikelbezüge. Bestehende Projekte und Einstellungen werden nicht umgeschrieben oder entfernt; insbesondere bleiben Designwahl und letzter Projektzugriff erhalten. Die Datenbank wird bei einem Fehler nicht gelöscht oder neu angelegt.

App-Version, Dexie-Datenbankversion, Projektmetadatenschema und JSON-Sicherungsschema sind getrennte Konzepte. Version 0.2 verwendet Datenbankversion 2 und Sicherungsschema 2, während Projektmetadaten weiterhin Schema 1 haben. Spätere Änderungen benötigen explizite Migrationen und Tests, statt alte Felder stillschweigend zu verwerfen.

Vor einem Upgrade wird eine extern gespeicherte JSON-Sicherung empfohlen. Alte Dateien aus 0.1/0.1.1 sichern nur Projektmetadaten, weil dort keine Materialerfassung existierte. Die neue Projektdatei ersetzt kein vollständiges App-Backup, insbesondere für noch unbenutzte eigene Katalogartikel.

## Versionierte Projekt-JSON-Datei

Der Export verwendet `format: baustellenaufmass-project`, `schemaVersion: 2`, App-Version und Exportzeitpunkt sowie genau ein Projekt, seine `measurements` und ausschließlich referenzierte `articles`. Dazu zählen auch Artikel mit auf null korrigiertem Buchungsverlauf. Der übrige Katalog, andere Projekte und die Designwahl werden nicht exportiert.

Vor dem Schreiben werden JSON-Syntax, Größe, exakte Struktur, unterstützte Versionen, IDs, Zeitstempel, Status, Artikel-/Buchungsfelder, Referenzen, eingefrorene Variantenstände und gültige nicht negative Gesamtsummen geprüft. Unbekannte Felder werden abgelehnt statt unbemerkt verworfen. Das bisherige Sicherungsschema 1 aus 0.1/0.1.1 wird weiterhin als Projekt ohne Materialdaten akzeptiert.

Der Import übernimmt Projekt, erforderliche Artikel und Buchungen in einer IndexedDB-Transaktion. Eine Projekt-ID-Kollision erzeugt eine neue Projekt-ID; bestehende Projekte werden nie überschrieben. Eine vorhandene Artikel-ID wird nur bei gleichen Beschreibungs-/Ausführungsfeldern und mindestens gleich neuer lokaler Revision wiederverwendet; lokale Aktiv-/Favoritenzustände werden dabei nicht überschrieben. Bei einem Artikelkonflikt wird eine neue ID vergeben. Importierte Buchungen erhalten neue IDs. Alle betroffenen Verweise einschließlich Snapshot-IDs werden konsistent umgesetzt, ohne vorhandene Datensätze zu überschreiben. Fehler dürfen keine teilweise importierten Projekte, Artikel oder Buchungen hinterlassen.

Die Namensregel aus 0.1.1 bleibt erhalten: „(Import)“, danach die nächste freie Nummer „(Import 2)“ usw. Aktive und archivierte Namen werden unter Berücksichtigung von Groß-/Kleinschreibung und kanonischem Unicode geprüft. Vorhandene generierte Zusätze werden nicht gestapelt; lange Basisnamen werden Unicode-sicher gekürzt. Namenswahl und Speicherung erfolgen atomar. Erweiterter Import mit Vorschau, Zusammenführen oder Ersetzen gehört nicht zu 0.2.

## CSV-Materialliste

CSV entsteht lokal aus den aggregierten eingefrorenen Projektständen, nicht aus nachträglich bearbeiteten Katalognamen. Spalten: Bezeichnung, Kategorie, Hersteller, Serie, Farbe, Einheit und Menge. Format ist UTF-8 mit BOM, Semikolon und CRLF. Textfelder sind doppelt maskiert; ein führendes Apostroph neutralisiert Formelanfänge `=`, `+`, `-` und `@`, auch nach führendem Leerraum. Nullsummen werden nicht ausgegeben. CSV ist eine Materialliste und kein Import-/Backupformat.

## Offline, Updates und GitHub Pages

Der bestehende Service Worker hält ausschließlich die statische App-Shell und lokale Assets vor. Projekte, Katalog und Buchungen liegen in IndexedDB, nicht im Netzwerkcache. Nach dem ersten vollständigen Onlineaufruf zeigt die App Offlinebereitschaft an. Updates werden angekündigt und ausdrücklich bestätigt; vor dem Reload müssen offene Formulare gespeichert oder verworfen werden.

Basis- und Scope-Pfad bleiben `/aufmassapp/`. `VITE_BASE_PATH` erlaubt die Anpassung an eine Root-Veröffentlichung (`/`); Vite-Assets, Manifest und Worker müssen übereinstimmen. Hash-Navigation vermeidet serverseitige SPA-Rewrites. Der vorhandene Actions-Workflow, das Pages-Artefakt und die Berechtigungen bleiben erhalten; `dist/` wird nicht versioniert. Die [README](README.md) dokumentiert alle Pages-Einstellungen.

Offlinefähigkeit setzt eine vollständige Erstinstallation und erhaltenen Browser-/PWA-Speicher voraus. iOS kann lokale Daten entfernen. JSON-Dateien deshalb extern speichern und testweise wiederherstellen. Ein Geräte-/Ursprungswechsel überträgt IndexedDB nicht automatisch.

## Prüfung und noch erforderliche Abnahme

Die automatisierten Prüfungen umfassen Projektlebenszyklus, Katalogpflege, wiederholbaren Seed, stabile Variantenidentität, Buchungen/Korrekturen, Mengenaggregation, CSV-Maskierung, Datenbankmigration und JSON-Roundtrips samt Konflikten und Fehlerfällen. Playwright prüft die Produktions-App unter dem Pages-Unterpfad und Offlineverhalten. Die tatsächlich ausgeführten Ergebnisse stehen im Änderungsbericht; diese Architektur behauptet keinen bereits bestandenen neuen Lauf.

`fake-indexeddb` beweist kein iOS-Verhalten, und Chromium ersetzt keinen installierten iPhone-Kaltstart. Der manuelle Plan in der README ergänzt Upgrade von 0.1, Touch-/Tastaturbedienung, Dateiauswahl, CSV in der Ziel-App und JSON-Wiederherstellung auf frischer Installation. Eine universelle Aufbewahrungsgarantie oder automatische Cloud-Sicherung wird nicht zugesagt.

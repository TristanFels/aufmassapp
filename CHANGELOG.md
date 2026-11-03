# Änderungsprotokoll

## 0.2.1 · Benannte individuelle Aufmaße

- Vier Hauptmenüpunkte: Projekt, Aufmaß, Artikel, Einstellungen. Projektaktion „Aufmaß erfassen“ führt zur Aufmaßverwaltung.
- Mehrere Aufmaße je Baustelle mit frei änderbarem Namen und optionaler Kategorie; später wieder öffnen und ergänzen.
- Individuelle Erfassung über Suche/Kategorienfilter, Artikelauswahl und Stückzahleingabe; Gesamtmengenkorrektur als getrennter Ablauf. Keine primäre +1/−1-Liste.
- Materialliste/CSV je Aufmaß und gemeinsame Baustellenliste/CSV ohne Doppelzählung; Artikelvarianten bleiben getrennt.
- JSON-Schema 3 sichert sämtliche Aufmaße (auch leere), Buchungen und referenzierte Artikel. Alte Schemata 1/2 bleiben lesbar; Import atomar inklusive aller Referenzumschreibungen.
- Atomare Dexie-Migration 2 → 3: alte Projektbuchungen in „Bisheriges Aufmaß“, alle bisherigen Daten einschließlich Katalogpflege, Favoriten, Einstellungen und Importnamen bleiben erhalten.
- Export-Schaltflächen mit flexiblem Abstand auch auf iPhone-Breite. Anforderungen, Datenmodell, Arbeitsregeln und neuer Auftrag 003 aktualisiert.
- Copilot-Nachbesserungen: Migration prüft Katalog-/Snapshot-Konsistenz; Mengenänderungen und Umbenennen erhalten monotone Aufmaßzeitstempel und gültige Sicherungen auch bei vorausliegenden Importzeitstempeln.
- Sicherungsprüfung gruppiert Buchungen statt wiederholter Historien-Scans; Kategorienfilter wieder mit voller Panelbreite, 48-Pixel-Touchhöhe und 16-Pixel-Schrift. Regressionen und Abschlussprüfungen im Prüfbericht dokumentiert.
- Räume, Aufmaßvorlagen, Materialkombinationen und automatische Wippen bleiben ausdrücklich verschoben. Reale iPhone-Abnahme ist weiterhin offen.


## 0.2.0 · Einfaches Materialaufmaß und lokaler Katalog

- Bearbeitbarer Offline-Katalog mit 22 gelieferten Standardartikeln; Gira/System 55/Reinweiß glänzend für passende Varianten, Herdanschlussdose und Tellerleuchte neutral. Keine erfundenen Artikelnummern oder Preise.
- Eigene Artikel, Kategorien, Suche, einfache globale Favoriten und Deaktivieren/Reaktivieren. Wiederholbarer Seed ergänzt nur fehlende Einträge und erhält lokale Bearbeitungen.
- Projektbezogene Erfassung mit +1, ganzzahligem Hinzufügen, Minus und ausdrücklich getrennter Gesamtmengenkorrektur; keine negativen Summen. Mengenänderungen archivierter Projekte gesperrt.
- Jede tatsächliche Mengenänderung als eigene Buchung mit eingefrorenem Projekt-/Artikelstand; Mengen nach Varianten-ID aggregiert. Verwendete Hersteller-/Serien-/Farbidentität vor nachträglichem Umdeuten geschützt.
- Lokaler Materiallisten-CSV-Export mit UTF-8-BOM, Semikolon, Maskierung und Schutz gegen Formelinterpretation.
- Projekt-JSON-Sicherungsschema 2 mit referenzierten Artikeln und Buchungen; atomarer Import mit konsistenten Kollisionsreferenzen, ohne vorhandene Daten zu überschreiben. Importnamenregel aus 0.1.1 und Lesen alter Sicherungsdateien bleiben erhalten.
- Additive IndexedDB-Migration auf Version 2; vorhandene Projekte und Einstellungen bleiben erhalten. Externe Projektsicherung vor dem App-Upgrade empfohlen.
- Dokumentation um Mengenregeln, Datenmodell, Sicherungsgrenzen sowie manuelle iPhone-Abnahme für Katalog, CSV, JSON-Wiederherstellung und Upgrade erweitert. Pages-Konfiguration bleibt erhalten.

Neue automatisierte Prüfergebnisse stehen im jeweiligen Implementierungsbericht. Tatsächliche iPhone- und Upgrade-Abnahme sowie Live-Bereitstellung werden dadurch nicht als bestätigt erklärt. Automatische Wippen, Kombinationen, Bereiche, Planung, Preise, Firmenartikelnummern, PDF und Synchronisierung bleiben spätere Stufen.

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

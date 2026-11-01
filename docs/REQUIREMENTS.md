# Baustellenaufmaß – Anforderungsspezifikation

**Version:** 0.1 (konsolidierter Entwurf)  
**Stand:** 01.11.2026  
**Status:** Fachliche Beschlüsse konsolidiert; technische Detailentscheidungen offen  
**Zielplattform:** Offlinefähige iPhone-PWA, Veröffentlichung über GitHub Pages  
**Umsetzung:** Schrittweise, mit Codex und Tests je Ausbaustufe

## 1. Ziel und Geltungsbereich

Langfristig nutzbare, modular erweiterbare Anwendung für Materialaufmaß, Materialbedarfs-/Fortschrittsverwaltung und Beschaffungsplanung im Elektrohandwerk. Erste fachliche Oberfläche: Schalter und Steckdosen. Spätere Erweiterungen: allgemeines Materialaufmaß, weitere Spezialmodule und lokal importierter Firmenartikelstamm aus PDF. Alle Module teilen dieselbe Datenbasis.

**Abgrenzung:** Die 30 Entscheidungen beschreiben den angestrebten Gesamtumfang, **nicht** den Lieferumfang des ersten Inkrements. Keine automatische Cloud-Synchronisierung und kein Backend in Version 0.x. Firmen-PDF-Import ist eine spätere Entwicklungsstufe.

## 2. Konsolidierte Anforderungsliste

| ID | Bereich | Verbindliche Anforderung |
|---|---|---|
| A01 | Projektbereiche | Material kann mit oder ohne Raum-/Bereichszuordnung erfasst werden; gemischte Nutzung pro Projekt. |
| A02 | Erfassung | Einzelartikel und vordefinierte Materialkombinationen sind parallel nutzbar. |
| A03 | Artikelkatalog | Vorbereiteter Standardartikelkatalog; Artikel und Kombinationen vom Nutzer ergänzbar und bearbeitbar. |
| A04 | Varianten | Mehrere Hersteller, Serien/Schalterprogramme und Farben je Projekt möglich. |
| A05 | Voreinstellungen | Projektstandard für Schalterprogramm/Farbe; optionaler Bereichsstandard; gezielte Einzelabweichungen. |
| A06 | Mengen | Tippen für +1, Plus/Minus und numerische Eingabe; Addition bei Erfassung vs. Bearbeiten des Gesamtwerts klar unterscheiden. |
| A07 | Suche/Favoriten | Individuell anpassbare Favoriten-Touchfelder, Kategorien und Artikelsuche. |
| A08 | Kombinationen | Feste und intelligente, anhand des Schalterprogramms aufgelöste Materialkombinationen; fehlende Zuordnungen melden. |
| A09 | Planung | Gesamtbedarf, verbaut, offen sowie im Auto, aus Lager, bestellen pro Artikel. |
| A10 | Beschaffung | Automatischer Bestellvorschlag, manuell überschreibbare Planmenge, Warnung bei Fehlmenge und Überplanung. |
| A11 | Dateiformate | JSON für editierbaren Projektimport/-export; CSV und PDF für Materiallisten. |
| A12 | Exportlisten | Aufmaß-, Materialbedarfs-/Fortschritts- und Beschaffungslisten; Filter nach Gesamtprojekt und ausgewählten Bereichen. |
| A13 | Fortschritt/Reservierung | Baufortschritt bereichsbezogen, Beschaffung grundsätzlich projektweit; optionale raumbezogene Reservierungen. |
| A14 | Baumstruktur | Frei definierbare, beliebig verschachtelte Projektbereiche; auch Projekte ohne Unterstruktur. |
| A15 | Bereichserfassung | Material auf jeder Hierarchieebene oder unzugeordnet erfassbar; Aggregation über Unterbereiche ohne Doppelzählung. |
| A16 | Projektverwaltung | Aktive/archivierte Projekte, Reaktivierung, Duplizieren und Projektvorlagen. |
| A17 | Speichern | Lokales automatisches Speichern, lokale Wiederherstellungspunkte, App-interne Erinnerungen an externe JSON-Backups. |
| A18 | Backups | Sowohl Einzelprojekt-JSON als auch vollständiges App-JSON mit Projekten, Artikeln, Kombinationen, Favoriten und Einstellungen. |
| A19 | Import | Beim Import Ergänzen oder Ersetzen wählbar; Vorschau, Konfliktbehandlung und Sicherheitsbestätigung. |
| A20 | Navigation | Startseite mit aktiven Projekten und Schnellzugriff zuletzt bearbeitet; Hauptnavigation Projekte, Artikelkatalog, Einstellungen; Projektbereiche Aufmaß, Materialplanung, Export. |
| A21 | Module | Mehrere spezialisierte Eingabeoberflächen je Projekt auf gemeinsamer Materialliste. |
| A22 | Historie | Schnelle Summenbearbeitung, gleichzeitig nachvollziehbarer Erfassungs-/Änderungsverlauf. |
| A23 | Korrekturen | Mehrstufiges Rückgängig/Wiederholen; gezielte Korrektur alter Erfassungen, protokolliert. |
| A24 | Firmen-PDF | Firmeninterne Materialliste später ausschließlich lokal einlesen, auswerten und speichern; keine Veröffentlichung in GitHub Pages. |
| A25 | Backup-Datenschutz | Firmeninterner Artikelstamm standardmäßig aus Sicherungen ausgeschlossen, nur per expliziter Auswahl einschließbar. |
| A26 | Export-Datenschutz | Interne Artikelnummern/geschützte Informationen in allen Exportarten standardmäßig ausschließen, nur explizit einschließen; allgemeine Mengen bleiben erhalten. |
| A27 | Offline/Sync | Anfangs lokal und offline, manueller JSON-Datenaustausch; Architektur für spätere optionale Synchronisierung vorbereiten. |
| A28 | Design | Heller, dunkler und systemabhängiger Modus; manuelle Überschreibung in Einstellungen. |
| A29 | Layouts | Mehrere frei anpassbare Favoritenlayouts, speicherbar und innerhalb des Projekts umschaltbar. |
| A30 | Layout-Vorlagen | Globale Favoritenlayout-Vorlagen, die als unabhängig bearbeitbare Projektkopien übernommen werden. |

## 3. Fachliches Datenmodell (vorläufig)

- **Projekt**: stabile ID, Name, Status (aktiv/archiviert), Zeitstempel, Projektstandard-Schalterprogramm, ausgewählte Aufmaßmodule, Einstellungen.
- **Bereich**: stabile ID, `projectId`, optionale `parentId` (Baum), Name, optionale Vorgabe für Schalterprogramm/Farbe.
- **Artikel**: stabile ID, allgemeine Bezeichnung, Einheit, Kategorie, Hersteller/Serie/Farbe soweit einschlägig, optionale Artikelnummer; getrennte geschützte Firmendaten-Zuordnung.
- **Artikelvariante**: konkrete kauf-/zählbare Materialidentität; gleich benannte, aber tatsächlich unterschiedliche Ausführungen sind getrennt.
- **Kombinationsvorlage**: stabile ID, fester oder parametrisierter Typ, enthaltene Artikel/Regeln und Mengen.
- **Aufmaßbuchung**: stabile ID, `projectId`, optionale `areaId`, Modul, Zeitstempel, konkrete Varianten-/Vorlagenauflösung, Mengenänderung; Grundlage für Verlauf und Aggregation.
- **Materialplan**: projektweite Mengen zu verbaut, Auto, Lager und geplanter Bestellung; Bereichsfortschritt und optionale Reservierungen separat verwaltet.
- **Favoritenlayout**: globale Vorlage oder eigenständige Projektkopie; Feldreihenfolge, Belegung, optional Größe/Anordnung.
- **Historieneintrag / Wiederherstellungspunkt**: nachvollziehbare Änderung mit Bezug zur betroffenen Entität und technischem Transaktionskontext.
- **Export-Metadaten**: Schema-/App-Version, Erstellungsdatum, Exportart und Kennzeichnung entfernter geschützter Daten.

**Aggregationsregel:** Gesamtmenge eines Bereichs = dessen direkte Buchungen plus Buchungen aller Nachfahren, jede Buchung genau einmal. Projektgesamtmenge umfasst außerdem unzugeordnete Buchungen. Unterschiedliche reale Artikelvarianten nicht fälschlich zusammenführen.

**Vorlagenregel:** Bereits erfasste Kombinationen referenzieren eine nachvollziehbare, unveränderliche konkrete Komponentenauflösung (oder entsprechenden Snapshot); spätere Vorlagenänderungen aktualisieren alte Buchungen nicht stillschweigend.

## 4. Materialplanung (vorläufige Rechenregeln)

- `OffenerBedarf = max(0, Gesamtbedarf - BereitsVerbaut)`.
- `Bestellvorschlag = max(0, OffenerBedarf - ImAuto - AusLager)`.
- `GeplanteBestellung` ist separat speicherbar und darf bewusst vom Vorschlag abweichen.
- `Deckung = ImAuto + AusLager + GeplanteBestellung`.
- `Fehlmenge = max(0, OffenerBedarf - Deckung)`.
- `Überplanung = max(0, Deckung - OffenerBedarf)`.
- Bereits verbaute Menge über Bedarf: eigene Warnung; keine stille Unterdrückung des Widerspruchs.
- **Wichtig:** Ob Auto-/Lager-Mengen reine Planwerte oder tatsächliche Bestandsbewegungen abbilden, ist noch zu präzisieren. Reservierungen dürfen dieselbe Menge nicht mehrfach zuordnen.
- Bei Bereichsfiltern projektweite Auto-/Lager-/Bestellwerte nicht unzulässig einem einzelnen Raum zuschlagen. Ohne Bereichszuordnung erfasste Positionen separat sichtbar halten.

## 5. Technische Architektur (Empfehlung, noch nicht als Beschluss finalisiert)

- **Frontend:** TypeScript, React, Vite; mobile-first, barrierearm bedienbare große Touchflächen.
- **Datenbank:** IndexedDB mit Repository-/Datenzugriffsschicht, möglicherweise Dexie; Datenmigrationen und versionierte Schemas.
- **Geschäftslogik:** Framework-unabhängige TypeScript-Module für Mengen, Kombinationen, Aggregation, Import/Export, Privatsphäre.
- **Offline:** Service Worker, gezielter App-Shell-Cache, kontrolliertes Update- und Reload-Verhalten, Offline-Tests auf iPhone.
- **Bereitstellung:** GitHub Pages nur für statische App-Dateien; alle Firmen- und Projektdaten lokal, keine internen PDF-/JSON-Dateien im Repository.
- **Tests:** Unit-Tests für Materialregeln und Aggregationen; Integrationstests für IndexedDB, Import und Migration; E2E-/Browser-Tests; reale iPhone-Tests.
- **Sync-Vorbereitung:** unveränderliche IDs, Änderungsmetadaten und getrennte Datenzugriffsschicht; keine Synchronisierung in erster Version.
- **Dateien:** UTF-8-CSV mit dokumentiertem Spaltenschema; PDF lokal generiert; JSON mit Schema-Version und Validierung.

## 6. Datensicherheit und Datenschutz

1. Jede bestätigte Bearbeitung wird lokal gespeichert; bei Speicherfehlern muss eine sichtbare Meldung erscheinen.
2. Lokale Snapshots sind kein externes Backup. Erinnerungen werden innerhalb der App angezeigt; zuverlässige Hintergrund-Pushs werden nicht vorausgesetzt.
3. Einzelprojekt- und App-JSON sind importierbar, validierbar und versioniert.
4. Ergänzen und Ersetzen sind getrennte, ausdrücklich bestätigte Importmodi; Konflikte anhand IDs statt Namen erkennen.
5. Firmeninterne Daten bekommen eine explizite Kennzeichnung auf Feld-/Datensatzebene, nicht nur eine versteckte Anzeige.
6. Alle Exportpfade (JSON, CSV, PDF, auch Referenzen und Metadaten) müssen geschützte Felder standardmäßig entfernen.
7. Für Projekt-JSON ohne Firmendaten müssen Mengen und allgemeine Artikelidentitäten erhalten bleiben. Fehlende Firmenzuordnungen beim Reimport anzeigen.
8. Vor jeder riskanten Datenmigration, Wiederherstellung oder Ersetzung: Sicherung empfehlen bzw. passende Sicherheitsmaßnahme erzwingen.
9. Offline-PWA-Speicher kann durch Geräteeinstellungen, Browserbereinigung oder Probleme verlorengehen; externer Export ist zwingend vorzusehen.

## 7. Festgestellte Spezifikationslücken und Konfliktrisiken

| Priorität | Thema | Konkret zu entscheiden/prüfen |
|---|---|---|
| Hoch | Materialidentität | Wie unterscheiden wir gleiche Artikel mit anderer Serie/Farbe bzw. gleiche universell nutzbare Einsätze? Eindeutige Varianten-IDs. |
| Hoch | Historie und Undo | Welche Vorgänge sind transaktional und wie wird ein älterer Eintrag korrigiert, wenn spätere Buchungen auf ihn folgen? |
| Hoch | Kombinationsänderung | Wie werden Komponenten-Snapshots gespeichert und wie wirken Korrekturen auf die Einzelartikel? |
| Hoch | Planungsmengen | Definition 'im Auto', 'aus Lager', reserviert, bereits verbaut; Schutz vor Doppelzählung. |
| Hoch | Importkonflikte | Verhalten bei gleichen IDs mit unterschiedlichen Versionen; Merge-Regeln, Vorabvorschau, Atomizität/Rollback. |
| Hoch | Datenschutz | Trennung öffentlicher vs. firmeninterner Felder auch in lokalen Backups, Exporten und Referenzen. |
| Mittel | Änderungsaufbewahrung | Historiengröße, lokale Snapshot-Aufbewahrung, Speichergrenzen iOS. |
| Mittel | Layouts | Konkrete Regeln für Feldgrößen, Reihenfolge, globale Änderungen und Projektkopien. |
| Mittel | PDF-Import | Text-PDF vs. Scan; Qualitätssicherung der extrahierten Firmenartikel; spätere Ausbaustufe. |
| Mittel | Exportfilter | Bei gefilterten Beschaffungslisten projekweite Mengen nicht als Bereichswerte ausweisen. |
| Mittel | Backup-Praxis | Erinnerungstakt, App-Snapshot-Intervall, Löschgrenzen und iCloud-Exportablauf. |
| Mittel | Offline-Updates | Cache-Versionierung, Datenbankmigration, Recovery bei unterbrochenem Upgrade. |

## 8. Stufenplan (Zielumfang, zu verfeinern)

### Inkrement 0.1 – Solides Grundgerüst

- React/TypeScript/Vite/PWA, Grundnavigation und Hell/Dunkel/System.
- Projekte erstellen, benennen, öffnen und auflisten; zuletzt verwendetes Projekt.
- IndexedDB-Persistenz mit Versionierung.
- Einfacher Projekt-JSON-Export/-Import zur manuellen Absicherung.
- GitHub-Pages-Deployment, Installations-/Offline-Test auf iPhone.

**Abnahme:** Projekt wird erstellt, offline geändert, nach App-Neustart wiedergefunden und aus JSON auf einer frischen Installation wiederhergestellt; App startet offline nach vollständiger Installation.

### Inkrement 0.2 – Nutzbares einfaches Aufmaß

- Grundartikelkatalog Schalter/Steckdosen, Kategorien, Suche, erste Favoriten.
- +1 / +/- / Zahleneingabe, Zusammenfassung gleicher Artikelvarianten.
- Anzeige und Bearbeitung der aktuellen Materialliste.
- Erster CSV-Export.

**Abnahme:** Ohne Netz können Artikel wiederholt erfasst/korrigiert und nach Neustart korrekt summiert sowie als CSV ausgegeben werden.

### Inkrement 0.3 – Projektbaum und Materialkombinationen

- Frei verschachtelte Bereiche und unzugeordnete Buchungen.
- Feste Kombinationen, Varianten sowie Projekt-/Bereichsstandard.
- Später intelligente Kombinationen und geprüfte Artikelzuordnungen als separates Teilinkrement.
- Globale Layoutvorlagen, Projektkopien in einem weiteren Teilinkrement.

**Abnahme:** Summen pro Bereich/Unterbaum/Projekt stimmen, Kombinationen werden ohne Doppelerfassung aufgelöst; Änderungen an Vorlagen verändern alte Buchungen nicht.

### Inkrement 0.4 – Materialplanung

- Verbaufortschritt nach Bereich; projektweite Beschaffung, Bestellvorschlag/Override.
- Reservierungen optional als Folgeinkrement.
- Warnungen für Fehlmenge, Überplanung und Inkonsistenzen.

**Abnahme:** Rechenfälle inkl. Überplanung und manuellen Overrides bestehen automatisierte Tests.

### Inkrement 0.5 – Nachvollziehbarkeit und sichere Datenbewegung

- Verlauf, Undo/Redo, gezielte Korrektur alter Buchungen.
- Snapshots, Backup-Erinnerungen, vollständige App-Sicherung.
- Importvorschau/Ergänzen/Ersetzen mit Validierung und Konfliktregeln.
- PDF-Export und flexible Listenfilter.

**Abnahme:** Wiederherstellung, Undo/Redo, Importkonflikte, Exportfilter und Datenschutz sind getestet.

### Ab Version 1.x / 2.x – Erweiterungen

- Generisches Aufmaßmodul und weitere Spezialmodule auf gemeinsamer Materialbasis.
- Lokal eingelesener Firmenartikelstamm aus PDF mit Artikelzuordnung; Schutz in allen Exportwegen.
- Optionale spätere Synchronisierung erst nach eigenständiger Architektur- und Sicherheitsentscheidung.

**Reihenfolge:** Die Grenzen der Inkremente dürfen anhand der Tests angepasst werden. Datenmodell, Migrationskonzept und Vertraulichkeitskennzeichnung müssen bereits früh berücksichtigt werden, auch wenn die Oberflächenfunktionen später folgen.

## 9. Nächste konkrete Aufgaben vor Codex-Implementierung

1. Fachliches Datenmodell mit IDs, Beziehungen, Variantenidentität und Buchungstransaktionen formalisieren.
2. Kritische Rechen- und Konfliktfälle als tabellarische Akzeptanztests schreiben.
3. Entscheidungen zu Import-Merge, Änderungsverlauf und Bestand/Reservierung treffen.
4. Technische Architektur mit genauer Paketstruktur, Testwerkzeugen, PWA-Cache/Migration finalisieren.
5. Für Inkrement 0.1 ein eigenständiges Codex-Ticket mit Abnahmekriterien und Nicht-Zielen formulieren.
6. Nur Test-/Beispieldaten in das öffentliche GitHub-Repository aufnehmen.

## 10. Status

Die fachlichen Entscheidungen A01–A30 sind **vom Nutzer festgelegt**. Der vorliegende Text ist die konsolidierte **Spezifikation v0.1**, kein abschließend freigegebenes technisches Pflichtenheft. Das Architekturkonzept ist ein Vorschlag; offene Risiken sind explizit benannt. Die Implementierung beginnt nach Abnahme des ersten Inkrements.

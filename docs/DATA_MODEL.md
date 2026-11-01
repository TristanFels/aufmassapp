# Baustellenaufmaß – Fachliches und technisches Datenmodell

**Version:** 0.2 (Architekturentwurf)  
**Stand:** 01.11.2026  
**Status:** Zur fachlichen Prüfung, keine Implementierung  
**Bezug:** Anforderungsspezifikation v0.1, Anforderungen A01–A30

## 1. Entwurfsziele

- Eine gemeinsame Datenbasis für alle künftigen Aufmaßmodule.
- Jeder Materialbedarf ist exakt einer konkreten Artikelvariante zuordenbar.
- Eine Erfassung gehört entweder zu einem Projektbereich (beliebiger Tiefe) oder ist unzugeordnet.
- Änderungen an Artikelstamm und Kombinationsvorlagen ändern historische Erfassungen nicht unbemerkt.
- Projekte lassen sich offline, versioniert und sicher exportieren/importieren.
- Firmeninterne Informationen bleiben von allgemeinen Artikeldaten isoliert.

## 2. Kernobjekte

| Objekt | Pflichtfelder (vereinfacht) | Zweck |
|---|---|---|
| Project | id, name, status, createdAt, updatedAt | Baustelle, globaler Kontext |
| Area | id, projectId, parentId?, name, sortOrder | Hierarchische Untergliederung |
| Program | id, manufacturer, series, color? | Schalterprogramm und Ausführung |
| Article | id, name, categoryId, unit, status | Allgemeiner Materialbegriff |
| ArticleVariant | id, articleId, manufacturer?, series?, color?, partCode? | Konkreter, unterscheidbarer Artikel |
| CompanyArticleMapping | id, variantId, companyCode, sourceId, confidential=true | Geschützte firmeninterne Zuordnung |
| CombinationTemplate | id, name, mode=fixed/adaptive, revision | Wiederverwendbare Materialkombination |
| CombinationComponentRule | templateId, selector, quantity | Komponente bzw. Auswahlregel |
| MeasurementEntry | id, projectId, areaId?, moduleId, sourceType, quantity, createdAt | Fachlicher Aufmaßeintrag |
| MeasurementComponent | entryId, variantId, quantityPerUnit, variantSnapshot | Aufgelöste, eingefrorene Bestandteile |
| MeasurementEvent | id, entryId, action, before?, after?, timestamp, transactionId | Änderungs-/Korrekturverlauf |
| ProgressEntry | id, projectId, areaId?, variantId, installedQuantity | Verbaute Materialmenge |
| ProcurementPlan | id, projectId, variantId, carQty, warehouseQty, orderQtyOverride? | Projektweite Beschaffungsplanung |
| Reservation | id, projectId, areaId, variantId, quantity, source | Optionale Zuordnung aus Beschaffungs-/Bestandsmengen |
| FavoriteLayout | id, projectId?, sourceTemplateId?, name, config | Globale Vorlage oder unabhängige Projektkopie |
| BackupSnapshot | id, createdAt, scope, schemaVersion, data | Lokaler Wiederherstellungspunkt |

**Stabile Kennungen:** UUID-artige IDs; Namen allein sind niemals Primärschlüssel. Alle veränderlichen Objekte erhalten Änderungszeitstempel und eine Schema-/Revisionsstrategie.

## 3. Beziehungen (logisch)

```text
Project 1 ── n Area (parentId ermöglicht beliebige Tiefe)
Project 1 ── n MeasurementEntry 0..1 ── Area
MeasurementEntry 1 ── n MeasurementComponent ── 1 ArticleVariant
Article 1 ── n ArticleVariant
ArticleVariant 1 ── n CompanyArticleMapping (geschützt)
CombinationTemplate 1 ── n CombinationComponentRule
Project 1 ── n ProgressEntry
Project 1 ── n ProcurementPlan
Project 1 ── n Reservation
Project 1 ── n FavoriteLayout; globale Layouts haben kein projectId
```

## 4. Fachliche Invarianten

1. **Variantenidentität:** Aggregation ausschließlich nach `variantId`, nicht nach Anzeigename. Universelle Einsätze dürfen dieselbe Varianten-ID in unterschiedlichen Programmen behalten.
2. **Bäume:** Jeder Bereich hat höchstens einen Parent desselben Projekts. Zyklen sind verboten.
3. **Direkt und indirekt:** Eine Aufmaßbuchung gehört genau einem Bereich oder keinem. Die Baumaggregation zählt eine Buchung genau einmal.
4. **Kombinationen:** Beim Erfassen einer Vorlage werden die konkret ausgewählten Komponenten mit Mengen und relevanten Artikeleigenschaften eingefroren. Spätere Vorlagenänderungen verändern bestehende Einträge nicht.
5. **Historie:** Änderungen erhalten einen eigenen protokollierten Vorgang; das Protokoll wird für reguläre Korrekturen nicht überschrieben.
6. **Undo/Redo:** Erfolgt über kompensierende Operationen bzw. transaktionale Änderungen mit referenzierter ursprünglicher Aktion; keine verdeckte Löschung des Verlaufs.
7. **Fortschritt:** Verbaute Mengen müssen zu den gleichen konkreten Varianten aggregieren wie das Aufmaß; Mengen oberhalb des Bedarfs werden ausdrücklich als Warnung ausgewiesen.
8. **Beschaffung:** Auto-/Lager-/Bestellmengen sind zunächst Planmengen, keine automatische Lagerbestandsführung.
9. **Schutz:** Firmenbezogene Feldwerte werden in Exportdaten anhand einer expliziten Klassifizierung herausgefiltert, nicht allein in der UI ausgeblendet.
10. **Import:** Eingehende Daten validieren, Änderungen vollständig vorbereiten, Vorschau zeigen und soweit möglich atomar anwenden.

## 5. Mengenberechnung

Für ein Projekt und eine konkrete `variantId`:

- `bedarf = Summe(entry.quantity × component.quantityPerUnit)`.
- `verbaut = Summe(progress.installedQuantity)`.
- `offen = max(0, bedarf - verbaut)`.
- `bestellVorschlag = max(0, offen - auto - lager)`.
- `bestellung = override ?? bestellVorschlag`.
- `deckung = auto + lager + bestellung`.
- `fehlmenge = max(0, offen - deckung)`.
- `ueberplanung = max(0, deckung - offen)`.

**Hinweis:** Die Entscheidung, ob eine Anpassung im Aufmaß eine Erfassung ersetzt, ergänzt oder als neue Buchung dokumentiert wird, wird in der Bedienlogik eindeutig abgebildet. Kein stilles Überschreiben.

## 6. Beispiel: Kombination und Einzelartikel

- Aufmaßbuchung K1: 3 × „2-fach-Steckdosenkombination“
- Aufgelöste Komponenten K1: je Kombination 2 × Variante V-STECKDOSE und 1 × Variante V-RAHMEN2
- Aufmaßbuchung E1: 2 × Einzelartikel V-STECKDOSE
- Projektsummen: `V-STECKDOSE = 3 × 2 + 2 = 8`, `V-RAHMEN2 = 3`
- Spätere Änderung der Kombinationen-Vorlage lässt K1 und dessen eingefrorene Komponenten unverändert.

## 7. Datenbank- und Modulgrenzen

Empfohlene Verantwortlichkeiten:

```text
src/
  app/                 Navigation, Startlogik, Theme
  features/
    projects/          Projektübersicht, Archiv, Vorlagen
    measurement/       Aufmaß-UI, Buchungen, Undo/Redo
    catalog/           Artikel, Varianten, Programme, Kombinationen
    planning/          Fortschritt, Beschaffung, Reservierung
    exports/           JSON/CSV/PDF, Privacy-Filter
    settings/          Darstellung, Sicherungserinnerungen
  domain/              Fachmodelle, Berechnungen, Validierung
  data/                IndexedDB-Repositories, Transaktionen, Migrationen
  platform/            Offline/PWA/Dateizugriff
  tests/               Unit-, Integrations- und E2E-Tests
```

Komponenten und Views dürfen nicht unmittelbar die Datentabellen verändern; Änderungen laufen über fachliche Services/Operationen.

## 8. Einführung in Entwicklungsstufen

**0.1:** Projekt, Bereich noch nicht zwingend, Datenbank, JSON-Projektsicherung, Navigation, Theme und Offline-App. Datensatz-Versionen und feste IDs von Beginn an.

**0.2:** Artikel/Varianten, einfache Aufmaßbuchungen, Mengenaggregation und CSV. Noch keine intelligente Kombinationslogik.

**0.3:** Baumstruktur, Kombinationen-Snapshots, Schalterprogramme und Bereichsstandards.

**0.4:** Verbaufortschritt und Beschaffungsplanung mit Warnungen.

**0.5:** vollständiger Verlauf, Undo/Redo, Recovery-Snapshots, erweiterter Import und PDF.

**Später:** allgemeines Aufmaßmodul, lokaler Firmen-PDF-Stamm und optionale Synchronisierung.

## 9. Offene Entscheidungen / Prüfungen

- Ist ein Aufmaß-Eintrag als eigenständige Buchung mit Änderungshistorie zu behandeln oder als projekt-/bereichsbezogener Mengenzähler mit Journal? Empfohlen: Buchungen + berechnete Summen.
- Wie werden „bereits verbaut“ und Reservierungen erfasst, wenn Projektbereiche verschoben werden?
- Wie werden gleichnamige, aber nicht identische Artikel beim JSON-Merge behandelt?
- Welche exakte Funktion soll „Projekt duplizieren“ gegenüber „Als Vorlage übernehmen“ haben?
- Wie werden lokale Wiederherstellungspunkte begrenzt und nach Datenschutzanforderungen bereinigt?
- Welche Navigations- und Bedienregeln gelten für die aktive Bereichsauswahl in mehreren Aufmaßmodulen?

## 10. Erste verbindliche Abnahmetests für 0.1

1. Neues Projekt anlegen, App vollständig schließen, offline öffnen: Projekt unverändert vorhanden.
2. Projekt umbenennen, archivieren, reaktivieren: Zustand über Neustart erhalten.
3. JSON-Projektdatei exportieren, lokale Testdaten entfernen, Datei importieren: gleicher Projektstand.
4. Unterbrochener oder fehlerhafter Import: bestehende Daten bleiben unverändert.
5. Ohne Internet nach Erstinstallation starten: Oberfläche und Projektliste funktionieren.
6. Ausgewähltes Hell-/Dunkel-/Systemdesign bleibt beim Neustart erhalten.
7. GitHub-Repository enthält ausschließlich App-Code und unkritische Testdaten.

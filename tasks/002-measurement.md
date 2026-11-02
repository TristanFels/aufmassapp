# Entwicklungsauftrag 002: Einfaches Aufmaß und bearbeitbarer Katalog

**Zielversion:** 0.2

**Status:** Umsetzung gemäß Nutzerentscheidung; Startliste aus Bild und Ergänzung übernommen.

**Ausgangspunkt:** Basisversion 0.1 und erkennbare Importnamen aus 0.1.1.

Dieses Dokument begrenzt Version 0.2 gemäß den besprochenen Entscheidungen. Es ersetzt nicht rückwirkend den Auftrag 001. Artikelnummern, Preise und nicht mitgeteilte Produktspezifikationen werden nicht erfunden. Die Mengen im Beispielbild werden nicht in neue Projekte oder in den Standardkatalog übernommen.

## Bestätigte Entscheidungen

- Der Nutzer liefert eine zunächst grobe Liste der in jeder Wohnung benötigten Standardartikel. Sie ist kein endgültig abgeschlossener Katalog.
- Ausgangsausführung der genannten Standardartikel: **Gira, System 55, Reinweiß glänzend**. Diese Angaben sind fachliche Merkmale der Startartikel; ein Firmenartikelstamm ist dafür nicht erforderlich.
- Artikel lassen sich unmittelbar in der App anlegen, bearbeiten und deaktivieren. Dafür sind weder Programmierung noch manuelle Dateiablage oder ein neues GitHub-Pages-Deployment nötig.
- Der Katalog wird lokal gespeichert und steht projektübergreifend auf demselben Gerät zur Verfügung. Eigene Ergänzungen müssen bei App-Updates erhalten bleiben und offline nutzbar sein.
- Hersteller-/Serien-/Farbunterschiede dürfen nicht anhand gleicher Anzeigenamen zusammengefasst werden. Stabile Artikel-/Varianten-IDs identifizieren die tatsächlich gezählte Ausführung.
- Firmeninterne Artikelnummern, Preise, Bezugsquellen und ein detaillierter Firmenmaterialkatalog werden später gepflegt. Sie sind keine Voraussetzung für das erste Aufmaß.
- Automatische Materialzuordnungen sind eine spätere Funktion: Wird ein Ausschalter erfasst, soll künftig eine normale Standardwippe mit ausgewählt werden. Die konkrete Wippe soll danach gegen eine besondere Ausführung austauschbar sein.

## Umfang von Version 0.2

1. Den Artikel-Platzhalter durch einen kleinen Startkatalog und einfache Katalogpflege ersetzen: Artikel anlegen, bearbeiten und deaktivieren; Kategorien und Suche, erste einfache Favoriten.
2. Einfache Materialerfassung direkt im Projekt, zunächst ohne Raum-/Bereichsstruktur und ohne automatische Zusatzartikel.
3. Einzelne Aufmaßbuchungen speichern und Summen pro konkreter Artikelvariante anzeigen. Fachoperationen liegen außerhalb der Ansichten und schreiben über die Datenzugriffsschicht.
4. Bedienung für +1, Plus/Minus und numerische Mengen vorsehen. „Weitere Menge hinzufügen“ und „Gesamtmenge ändern“ müssen eindeutig unterscheidbar sein. Eine Summenkorrektur wird als zusätzliche Korrekturbuchung gespeichert; keine stille Änderung alter Buchungen und keine negative Projektsumme.
5. Projektmaterialliste und ersten CSV-Export ergänzen.
6. Projekt-JSON so erweitern, dass Aufmaßdaten und die dafür benötigten selbst angelegten Artikel/Varianten auf einem anderen Gerät wiederhergestellt werden können. Keine vollständige App-Sicherung vorziehen.
7. Versionierte Datenbankmigration und Importkompatibilität für 0.1/0.1.1 vorsehen. Bestehende Projekte, Designwahl und Schnellzugriff bleiben erhalten; bestehende Datenbanken nicht löschen oder neu anlegen.

## Startkatalog

Alle Positionen werden einzeln in Stück erfasst. Schalter sind Einsätze; Wippen, Abdeckungen und Rahmen werden separat gezählt. Steckdosen werden als eigenständige Position ohne Rahmen geführt. Eine automatische Zuordnung erfolgt nicht.

| Kategorie | Startartikel |
| --- | --- |
| Rahmen | Einfachrahmen; Doppelrahmen; Dreifachrahmen; Vierfachrahmen |
| Schalter und Taster | Ausschalter-Einsatz; Kreuzschalter-Einsatz; Serienschalter-Einsatz; Taster-Einsatz |
| Wippen und Abdeckungen | Wippe; Serienschalterwippe; Blindabdeckung |
| Steckdosen | Steckdose; Steckdose mit Klappdeckel |
| Anschlüsse | Herdanschlussdose |
| Multimedia und Kommunikation | Multimedia-Enddose; Multimedia-Durchgangsdose; SAT-Stichdose; SAT-Enddose; Multimedia-Abdeckung; Unterputz-TAE-Dose; TAE-Abdeckung |
| Leuchten | Tellerleuchte Ø mindestens 25 cm |

Insgesamt 22 Positionen. Gira/System 55/Reinweiß glänzend gilt als Ausgangsausführung der passenden Schalterprogramm-Artikel; bei Herdanschlussdose und Tellerleuchte bleiben nicht bekannte Hersteller-/Serien-/Farbangaben leer. Einsätze mit sichtbarer Abdeckung werden nicht automatisch kombiniert. Technische Ausführungen wie Anschlusszahl oder Dämpfung der Multimedia-/SAT-Dosen werden nicht geraten; der Katalog kann später um konkrete Varianten ergänzt werden.

## Konkrete technische Regeln

- Eine Katalogzeile steht für genau eine konkrete zählbare Variante; stabile UUIDs und Revisionen, keine Zusammenfassung nach Namen. Änderungen an Hersteller, Serie oder Farbe nach erfolgter Verwendung werden abgewiesen; dafür einen neuen Artikel anlegen. Namens-/Kategoriepflege bleibt möglich; bereits erfasste Snapshots bleiben unverändert.
- Favoriten sind einfache lokale Katalogmarkierungen, keine frei konfigurierbaren Layouts. Deaktivierung entfernt keine Datensätze.
- Stückmengen sind ganze Zahlen von 0 bis 1.000.000. Jede bestätigte Änderung legt eine Buchung mit Differenz an; das Setzen einer Gesamtsumme berechnet die Differenz innerhalb derselben Transaktion. Keine negativen Summen, auch bei parallelen Änderungen. Archivierte Projekte erlauben keine neuen Mengenänderungen.
- Datenbankversion 2 ergänzt Artikel und Buchungen; bestehende Projekte und Einstellungen werden beibehalten. Bestehendes Projektschema 1 bleibt lesbar. Neue Projekt-JSON-Dateien verwenden Dateischema 2 und enthalten nur referenzierte Artikel plus Buchungen mit konkreten Snapshots. Dateischema 1 aus Version 0.1/0.1.1 bleibt importierbar.
- Import validiert vor dem Schreiben Struktur, Referenzen, Mengen und Versionen. Projekt-ID-Kollisionen erzeugen Kopien. Buchungs-IDs werden neu vergeben; bei kollidierender Artikel-ID mit abweichenden Artikeldaten wird eine neue ID vergeben und jede Referenz einschließlich Snapshot umgeschrieben. Ein identischer vorhandener Artikel wird ohne Überschreiben lokaler Einstellungen wiederverwendet. Alles erfolgt atomar; die Importnamensregel aus 0.1.1 bleibt bestehen.
- CSV ist UTF-8 mit BOM, Semikolon und korrekt maskierten Feldern. Spalten: Bezeichnung, Kategorie, Hersteller, Serie, Farbe, Einheit, Menge. Als Tabellenformeln interpretierbare Textwerte werden geschützt. Keine Firmenkennungen oder Preise.

## Schutz bestehender Aufmaße

- Das Deaktivieren eines Katalogartikels darf vorhandene Erfassungen und deren Summen nicht entfernen. Es verhindert nur neue Auswahlen im normalen Erfassungsablauf.
- Katalogpflege darf eine bereits erfasste Variante nicht rückwirkend in ein anderes reales Material verwandeln. Andere Ausführungen erhalten eigene Kennungen; alte Referenzen bleiben auflösbar.
- Name, Menge und Ausführung müssen auch nach JSON-Export und Import nachvollziehbar bleiben. Das genaue Sicherungsschema und die Konfliktregeln für referenzierte Artikel sind vor der Implementierung festzulegen.
- Seed-Daten werden wiederholbar ergänzt; Updates dürfen eigene Artikel und bewusste Bearbeitungen oder Deaktivierungen nicht überschreiben.

## Später: Standardwippe und Austausch

Die automatische Wippenzuordnung wird in der Kombinationsstufe umgesetzt, nicht in Version 0.2 hart im Artikel- oder Buchungscode verdrahtet. Beispiel für die spätere Bedienung:

1. Ausschalter auswählen.
2. Die Kombination schlägt den Einsatz und eine passende normale Wippe vor.
3. Der Nutzer kann die Wippe bei dieser Erfassung austauschen.

Die endgültige Komponentenauflösung muss pro Erfassung festgehalten werden. Das spätere Ändern einer Standardzuordnung darf bereits erfasste Mengen oder Ausführungen nicht unbemerkt ändern. Unterschiedliche Wippen bleiben unterscheidbare Varianten. Konkrete besondere Wippen und die genaue Austauschbedienung werden erst mit dieser späteren Stufe festgelegt.

## Grenzen

Keine automatische Wippen-/Komponentenzuordnung, Materialkombinationen, Bereichsbäume, Beschaffungs-/Fortschrittsplanung, Preise oder Firmenartikelnummernverwaltung. Kein Firmen-PDF-Import, PDF-Export, vollständiges App-Backup, Cloud-Sync oder frei gestaltbare Favoritenlayouts. Ausführliche Historienoberfläche, Undo/Redo und gezielte Bearbeitung alter Buchungen bleiben spätere Schritte.

## Geplante Abnahme

- Startartikel sind ohne Netz verfügbar; ein eigener Artikel kann offline angelegt, bearbeitet, deaktiviert und nach Neustart wiedergefunden werden.
- Wiederholte Erfassung und Korrekturen ergeben die erwarteten Summen; unterschiedliche Varianten bleiben getrennt.
- Deaktivierte Artikel verlieren ihre bestehenden Aufmaßbuchungen nicht.
- +1 und numerisches Hinzufügen ändern die Menge wie angezeigt; das Setzen der Gesamtsumme lässt sich davon klar unterscheiden.
- JSON stellt das Projekt einschließlich eigener referenzierter Artikel und Aufmaßdaten in einer frischen Datenbank wieder her; ungültige Dateien verändern keine Daten.
- Migration und wiederholter Start/Seed erhalten bestehende 0.1-Projekte und eigene Katalogänderungen.
- CSV enthält die erwarteten Varianten und Mengen, ist korrekt maskiert und für Excel geeignet.
- Daten-, Mengen-, Migration-, Import-/Export- und Browser-/Offline-Tests sowie Produktions-Build bestehen. iPhone-Touchbedienung, Tastatur, Dateiexport und Offline-Kaltstart werden zusätzlich auf einem echten Gerät abgenommen.

## Weiterhin bewusst offen

Konkrete Artikelnummern, Preise, besondere Wippen und technische Detailausführungen werden erst mit späteren Nutzereingaben ergänzt. Keine Herstellerdaten oder Kombinationen allein anhand eines ähnlichen Artikelnamens ableiten.

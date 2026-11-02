# Entwicklungsauftrag 002: Einfaches Aufmaß und bearbeitbarer Katalog

**Zielversion:** 0.2

**Status:** Entwurf; die vom Nutzer angekündigte Startartikelliste steht noch aus.

**Ausgangspunkt:** Basisversion 0.1 und erkennbare Importnamen aus 0.1.1.

Dieses Dokument hält die besprochenen Entscheidungen fest. Die konkrete Startliste wird hier ergänzt, bevor der Startkatalog implementiert wird. Es werden keine Artikel, Artikelnummern oder Preise erfunden. Dieser Entwurf verändert die Anwendung noch nicht und ersetzt nicht rückwirkend den Auftrag 001.

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

Die genaue Startartikelgliederung und Einheit werden anhand der angekündigten Liste konkretisiert. Insbesondere muss klar sein, ob eine Bezeichnung einen Einsatz, eine Abdeckung/Wippe, einen Rahmen oder eine vollständige Einheit meint. Die bisher vorgeschlagene Einheit für den kleinen Startkatalog ist Stück; dies ist noch keine Freigabe beliebiger Mengentypen.

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

## Noch zu ergänzen

Die angekündigte Startliste mit eindeutiger Bedeutung jedes Artikels. Ohne diese Liste wird der erste Produktkatalog nicht mit geratenen Bezeichnungen befüllt. Anschließend werden die verbleibenden technischen Details des Sicherungsschemas und der Artikelkonflikte im Auftrag konkretisiert.

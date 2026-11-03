# Entwicklungsauftrag 003: Benannte individuelle Aufmaße

**Zielversion:** 0.2.1 (Erweiterung von 0.2, kein Vorziehen des Projektbaums)

**Status:** Implementiert und automatisiert geprüft; reale iPhone-Abnahme offen. Ergebnisse: [Prüfbericht](../docs/VALIDATION-0.2.1.md).

## Verbindlicher Umfang

- Untere Navigation mit **Projekt**, **Aufmaß**, **Artikel**, **Einstellungen**.
- Projektverwaltung (Anlegen, Öffnen, Umbenennen, Archivieren/Reaktivieren) bleibt erhalten. „Aufmaß erfassen“ öffnet die Aufmaßverwaltung des Projekts; Materialerfassung findet unter „Aufmaß“ statt.
- Mehrere eigenständige Aufmaße pro Projekt mit frei wählbarem, nachträglich änderbarem Namen und optionaler Kategorie. Über die Hauptnavigation erst Projekt, dann Aufmaß auswählen oder erstellen. Bestehende Aufmaße jederzeit öffnen, ergänzen und korrigieren.
- Zunächst nur individuelles Aufmaß: Suche/Kategorienfilter → aktiven Standardartikel oder eigenen Artikel auswählen → Stückzahl eingeben → hinzufügen → Aufmaßliste darunter sehen. Eigene Artikel weiterhin direkt im Katalog anlegen. Keine vorgegebene +1/−1-Liste als primäre Oberfläche.
- „Weitere Stückzahl hinzufügen“ und „Gesamtmenge bearbeiten“ sind getrennte Abläufe; Korrekturen bleiben Differenzbuchungen. Archivierte Projekte sind für Mengen- und Aufmaßänderungen gesperrt.
- Materialliste und CSV je Aufmaß sowie gemeinsame Liste und CSV je Baustelle. Jede Buchung genau einmal summieren; reale Varianten ausschließlich nach stabiler Artikel-ID trennen.
- JSON-Schema 3 enthält Projekt, alle benannten Aufmaße (auch leere), sämtliche Buchungen und benötigte Artikel. Referenzen, IDs, Versionen, Snapshots und Mengen vor Schreibbeginn prüfen. Schema 1 und 2 bleiben importierbar. Projektkollisionen erzeugen Kopien mit bisheriger Importkennzeichnung; Artikelkonflikte werden ohne Überschreiben lokaler Daten aufgelöst.
- Dexie-Version 3 migriert vorhandene 0.2-Buchungen in ein automatisch angelegtes „Bisheriges Aufmaß“ pro betroffenem Projekt. IDs, Mengen, Projektnamen inklusive Importkennzeichnung, Katalogänderungen, Favoriten und Einstellungen bleiben erhalten. Migration und Import brechen bei Fehlern ohne Teiländerungen ab.
- Abstand zwischen JSON-/CSV-Export unter „Projekt sichern“, auch auf schmalen iPhone-Bildschirmen.
- React, TypeScript, Vite, Dexie/IndexedDB, lokale Offlinefunktion und Pages-Unterpfad samt Manifest und Service Worker erhalten.

## Nicht enthalten

Keine Aufmaßblöcke/Vorlagen, automatische Wippenzuordnung, Materialkombinationen oder Raum-/Bereichsbäume. Auch keine neue Planungs-, Beschaffungs- oder Cloudfunktion.

## Automatisierte Abnahme

1. Zwei Aufmaße desselben Projekts getrennt erfassen und korrigieren; Gesamtsumme korrekt und Varianten getrennt.
2. Änderungen und Namen/Kategorien nach Wiederöffnen unverändert.
3. Echte Versions-2-Datenbank migrieren; alle bisherigen Daten und Mengen erhalten, Migration wiederholbar, fehlerhafter Bestand bleibt vollständig unverändert.
4. JSON-Roundtrip auf frischer DB einschließlich leerer Aufmaße, Korrekturen und eigener Artikel; alte Schemata importieren; ungültige Referenzen und Schreibfehler vollständig zurückrollen.
5. CSV je Aufmaß und Projekt mit korrekten Mengen, Maskierung, Formelschutz und UTF-8-BOM.
6. Browserprüfung für vier Menüpunkte, beide Einstiege, Erfassung, Bearbeitung, Wiederöffnen, Offlinebetrieb, mobile Breite und Exportabstand.
7. Gesamte Testsuite und Produktions-Build ausführen, Ergebnisse dokumentieren; Änderungen als Pull Request bereitstellen, sofern möglich.

## Manuelle Abnahme

Ausführliche fachliche Abnahme nach weiteren Gestaltungsrunden. Reales iPhone bleibt separat zu prüfen: Installation/Update von 0.2 mit vorhandenem Bestand, Offline-Kaltstart, Nummerntastatur/Touch/Scrollen/Safe-Area und Sichern/Importieren über „Dateien“. Automatisierte Tests ersetzen diese Geräteprüfung nicht.

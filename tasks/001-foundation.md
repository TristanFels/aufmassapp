# Entwicklungsauftrag 001: Technische Basisversion 0.1

**Status:** Bereit zur Umsetzung  
**Ziel:** Erste installierbare, lokale und offlinefähige Version der Baustellenaufmaß-App.

## Ausgangslage
Das GitHub-Repository besteht bereits und ist mit Codex verbunden. Die langfristigen Produktanforderungen stehen in `docs/REQUIREMENTS.md` und der vorläufige Datenmodellentwurf in `docs/DATA_MODEL.md`. Die spätere Materialerfassung nutzt *einzelne Aufmaßbuchungen mit aggregierter Summenanzeige* und gezielter Korrektur älterer Buchungen (zusätzliche Entscheidung A31). Das wird jetzt nur architektonisch berücksichtigt, **nicht implementiert**.

## Stack
- React + TypeScript + Vite
- Dexie als IndexedDB-Zugriff
- PWA-Manifest und Service Worker (bevorzugt `vite-plugin-pwa`)
- Vitest und geeignete IndexedDB-Testumgebung für datenbezogene Tests
- Statische Bereitstellung über GitHub Pages

## Funktionaler Umfang dieser Aufgabe
1. Navigationsstruktur: **Projekte**, **Artikel** (vorerst erklärter Platzhalter), **Einstellungen**.
2. Projekte anlegen, umbenennen, archivieren, reaktivieren; aktive und archivierte Projekte getrennt sichtbar.
3. Schnellzugriff auf das zuletzt geöffnete Projekt.
4. Projekt speichern: `id`, `name`, `status`, `createdAt`, `updatedAt`, Versionsinformationen. Alle Änderungen persistieren automatisch in IndexedDB.
5. Einstellungen für Design `system`, `light`, `dark`; Standard `system`; systemweite Wechsel nachvollziehen und Auswahl speichern.
6. Einzelprojekt-Export als versionierte JSON-Datei. Import mit Format-/Schema-Validierung und Fehlerbehandlung. Wenn ein Projekt mit gleicher ID vorhanden ist: in dieser Stufe **nur als neue Kopie mit neuer ID importieren**, keine bestehende Projektinstanz überschreiben. Import atomar vornehmen.
7. Offlinefähige App-Shell; Installationsmanifest, Icons, korrekte relative Pfade und Service Worker.
8. Dokumentation `README.md`, `ARCHITECTURE.md`, `CHANGELOG.md` für Installation, Deployment, Architektur und Tests.
9. Automatisierte Tests der Projektoperationen, JSON-Roundtrips, abgelehnten fehlerhaften Importdateien, Theme-Einstellung.

## Nicht implementieren
Kein Artikelkatalog, keine Materialerfassung, keine Materialkombinationen, keine Bereichsbäume, keine Fortschritts-/Beschaffungsplanung, keine CSV/PDF-Exporte, keine umfassenden Snapshot-Backups, kein Firmen-PDF-Import, keine Cloud-Synchronisation. Keine echten Firmendaten.

## Deployment
- Prüfe zuerst den tatsächlichen Repository-Namen und einen vorhandenen Codebestand.
- Falls Projektseite `https://<account>.github.io/<repo>/`: Vite-Basispfad und PWA-Start-URL/Scope müssen `/<repo>/` entsprechen.
- Falls User-/Organization-Seite mit eigenem Root: entsprechend `/` verwenden.
- Bevorzuge einen reproduzierbaren GitHub-Actions-Build, kein manuelles Einchecken generierter `dist/`-Dateien.
- Existiert bereits eine GitHub-Pages-Konfiguration, respektiere sie und erläutere nötige Änderungen.
- Keine automatische Live-Veröffentlichung behaupten; erforderliche Repository-Einstellungen dokumentieren.

## Abnahmekriterien
- Nach vollständigem Erstaufruf lässt sich die App auf einem iPhone offline öffnen.
- Projekt bleibt nach Reload, Schließen und erneutem Öffnen erhalten.
- Archivierung, Reaktivierung und Umbenennung bleiben persistent.
- Schnellzugriff auf zuletzt geöffnetes Projekt funktioniert.
- Exportierte JSON-Datei lässt sich wieder importieren; ID-Kollision erzeugt Kopie.
- Ungültige JSON-Dateien verändern die Datenbank nicht.
- System/Hell/Dunkel funktioniert und bleibt gespeichert.
- `npm run build` und automatisierte Tests laufen erfolgreich.

## Definition of Done
1. Code mit verständlicher Struktur und Typen.
2. Test- und Build-Kommandos ausgeführt und Ergebnisse berichtet.
3. Installations- und Offline-Testanleitung fürs iPhone vorhanden.
4. Liste aller nicht überprüften Punkte und bewusst verschobenen Funktionen.
5. Änderungen als überprüfbarer Commit oder Pull Request; vor kritischen Änderungen vorhandene Dateien sichern.

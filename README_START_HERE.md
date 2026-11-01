# Baustellenaufmaß – Startpaket für Codex

Dieses Paket enthält **noch keinen fertigen App-Code**, sondern die Anforderungen und einen begrenzten Entwicklungsauftrag für Version 0.1.

## Enthaltene Dateien
- `AGENTS.md` – verbindliche Arbeitsregeln für Codex
- `docs/REQUIREMENTS.md` – 30 bisherige Anforderungen
- `docs/DATA_MODEL.md` – vorläufiges Datenmodell
- `tasks/001-foundation.md` – konkreter Auftrag für Version 0.1 inkl. Abnahmetests

**Zusatzentscheidung A31:** Jede Materialerfassung wird intern als separate Buchung geführt; auf der Oberfläche werden Summen gezeigt. Ältere Buchungen sollen gezielt korrigierbar bleiben. Das wird in `tasks/001-foundation.md` beschrieben und erst in einer späteren Entwicklungsstufe umgesetzt.

## Übernahme ins bestehende GitHub-Repository
1. ZIP entpacken.
2. Dateien/Ordner **in das Stammverzeichnis des bestehenden Repositorys** übernehmen, ohne vorhandene Dateien blind zu überschreiben.
3. Auf GitHub committen.
4. Codex im verbundenen Repository starten und den untenstehenden Auftrag senden.

## Codex-Nachricht zum Kopieren

> Lies zuerst `AGENTS.md`, `docs/REQUIREMENTS.md`, `docs/DATA_MODEL.md` und `tasks/001-foundation.md`. Prüfe den vorhandenen Repository-Inhalt und implementiere **ausschließlich** den in `tasks/001-foundation.md` beschriebenen Umfang von Version 0.1. Achte auf GitHub-Pages-Unterpfade, iPhone-PWA, IndexedDB und Offlinefähigkeit. Führe automatisierte Tests und einen Produktions-Build aus. Stelle die Änderungen als prüfbaren Pull Request bereit, sofern die verwendete Codex-Umgebung das unterstützt. Berichte die Testergebnisse, verbleibende Risiken und konkrete iPhone-Abnahmeschritte. Implementiere keine späteren Features ohne Freigabe.

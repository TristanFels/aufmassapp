# Baustellenaufmaß – Einstieg

Die Anwendung enthält die technische Basisversion 0.1 sowie die Projektimporte aus 0.1.1 und das einfache Aufmaß mit bearbeitbarem Katalog aus 0.2.

Installation, Funktionen, GitHub-Pages-Einstellungen, Sicherung und iPhone-Abnahme stehen in [README.md](README.md). Die Architektur beschreibt [ARCHITECTURE.md](ARCHITECTURE.md).

## Verbindliche Quellen

- `AGENTS.md` – Arbeitsregeln und aktueller Implementierungsumfang.
- `docs/REQUIREMENTS.md` – langfristige Anforderungen.
- `docs/DATA_MODEL.md` – Datenmodellentwurf für die weiteren Stufen.
- `tasks/001-foundation.md` – abgeschlossene Basisversion.
- `tasks/002-measurement.md` – Umfang von 0.2 einschließlich der gelieferten 22 Startartikel.

**Zusatzentscheidung A31:** Jede Materialerfassung ist eine separate Buchung; die Oberfläche zeigt aggregierte Summen. Summenkorrekturen legen zusätzliche Buchungen an. Die gezielte Korrektur alter Buchungen und die ausführliche Historienoberfläche folgen später.

Materialkombinationen und die automatische Standardwippe sind nicht Bestandteil von 0.2. Die gelieferten Beispielmengen sind keine Vorgaben für neue Projekte.

# Arbeitsregeln für Codex – Baustellenaufmaß

## Verbindliche Quellen
- `docs/REQUIREMENTS.md`: langfristige Fachanforderungen A01–A30
- `docs/DATA_MODEL.md`: Entwurf für spätere Datenstrukturen
- `tasks/001-foundation.md`: **einziger Implementierungsumfang des aktuellen Inkrements**
- Bei Widersprüchen die engere Aufgabenabgrenzung aus `tasks/001-foundation.md` für den aktuellen Implementierungsschritt anwenden; fachliche Entscheidungen nicht stillschweigend abändern.

## Vorgehen
1. Bestehenden Repository-Inhalt prüfen. Nichts ohne Not überschreiben.
2. Kurz den geplanten Dateiaufbau und mögliche Konflikte benennen.
3. Kleine, überprüfbare Änderungen umsetzen; keine Funktionen aus späteren Inkrementen vorziehen.
4. Automatisierte Tests und Produktions-Build durchführen. Nicht bestandene oder nicht ausgeführte Tests offen nennen.
5. GitHub-Pages-Unterpfad, Manifest und Service-Worker-Scope berücksichtigen; iPhone-Offlinebetrieb nicht ohne tatsächlichen Gerätetest als bestätigt bezeichnen.
6. Bei Datenänderungen stabile IDs, Schema-Versionierung und spätere Migrationen berücksichtigen; keine stillen Datenverluste.
7. Keine echten Kundendaten, Firmenartikelnummern, vertraulichen PDFs, exportierten Projektdaten, Zugangsdaten oder API-Keys committen.
8. Nicht auf externe APIs/Cloud angewiesen sein; alle Kernfunktionen offline.
9. Keine Überentwicklung: robustes MVP mit verständlicher Struktur statt unnötigen Abstraktionen.
10. Zusammenfassung mit geänderten Dateien, Tests, offenen Punkten und konkretem manuellem iPhone-Testplan liefern.

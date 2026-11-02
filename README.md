# Baustellenaufmaß · Version 0.2

Lokale, für das iPhone ausgelegte Baustellenaufmaß-App als Progressive Web App (PWA). Version 0.2 ergänzt die Projektverwaltung aus [Auftrag 001](tasks/001-foundation.md) um den in [Auftrag 002](tasks/002-measurement.md) beschriebenen bearbeitbaren Artikelkatalog und das einfache Materialaufmaß.

## Funktionen

- Projekte anlegen, öffnen, umbenennen, archivieren und reaktivieren; aktive und archivierte Projekte getrennt anzeigen, zuletzt geöffnetes Projekt direkt aufrufen.
- Lokaler, projektübergreifender Katalog mit 22 Startartikeln, Kategorien, Suche und einfachen globalen Favoriten. Eigene Artikel offline anlegen und bearbeiten; Artikel deaktivieren und reaktivieren.
- Pro Projekt Artikel mit **+1** oder einer ganzen positiven Menge erfassen. **Weitere Menge hinzufügen** erhöht die vorhandene Menge; **Gesamtmenge ändern** ersetzt die angezeigte Summe durch eine zusätzliche Korrekturbuchung. Minus reduziert um eins; Mengen unter null sind ausgeschlossen.
- Materialliste nach stabiler Artikel-/Varianten-ID mit eingefrorenen Bezeichnungen und Ausführungen. Jede tatsächliche Mengenänderung wird als eigene Buchung gespeichert. Archivierte Projekte erlauben weiterhin Anzeige und Export, aber keine Mengenänderung.
- Einzelprojekt als versionierte JSON-Datei einschließlich seiner Aufmaßbuchungen und referenzierten Artikel sichern und wiederherstellen; erster CSV-Export der Materialliste.
- Automatisches lokales Speichern über Dexie/IndexedDB, Designwahl System/Hell/Dunkel und Offline-App-Shell mit Installationsmanifest und Icons.

Materialkombinationen, automatische Wippenzuordnung, Bereichsbäume, Fortschritts-/Beschaffungsplanung, Preise, Firmenartikelnummern, PDF, Snapshot-Backups, Cloud-Synchronisierung und frei gestaltbare Favoritenlayouts sind nicht enthalten. Eine ausführliche Historienoberfläche, Undo/Redo und gezielte Bearbeitung alter Buchungen folgen später.

## Startkatalog und eigene Artikel

Alle Mengen haben zunächst die Einheit **Stück**; zulässig sind ganze Mengen bis 1.000.000. Der Startkatalog übernimmt die vom Nutzer gelieferte Liste ohne erfundene Artikelnummern oder Preise:

| Kategorie | Startartikel |
|---|---|
| Rahmen | Einfachrahmen, Doppelrahmen, Dreifachrahmen, Vierfachrahmen |
| Schalter und Taster | Ausschalter-Einsatz, Kreuzschalter-Einsatz, Serienschalter-Einsatz, Taster-Einsatz |
| Wippen und Abdeckungen | Wippe, Serienschalterwippe, Blindabdeckung |
| Steckdosen | Steckdose, Steckdose mit Klappdeckel |
| Anschlüsse | Herdanschlussdose |
| Multimedia und Kommunikation | Multimedia-Enddose, Multimedia-Abdeckung, Unterputz-TAE-Dose, TAE-Abdeckung, Multimedia-Durchgangsdose, SAT-Stichdose, SAT-Enddose |
| Leuchten | Tellerleuchte Ø mindestens 25 cm |

Die passenden Startartikel sind mit **Gira · System 55 · Reinweiß glänzend** vorbelegt. Herdanschlussdose und Tellerleuchte bleiben hersteller-/serien-/farbneutral, statt diese Merkmale zu erfinden. Einsatz und Wippe sind getrennte Artikel: Die Erfassung eines Schalters erzeugt in 0.2 keine automatische Wippe.

Der Katalog wird im Browser gespeichert. Erneute Starts und App-Updates ergänzen nur fehlende Seed-IDs; bewusste Bearbeitungen, Favoriten und Deaktivierungen werden nicht überschrieben. Änderungen benötigen kein GitHub-Deployment. Deaktivieren entfernt keine vorhandenen Buchungen oder Summen, sondern verhindert neue Erfassungen bzw. Erhöhungen. Bestehende Mengen dürfen weiterhin nach unten korrigiert werden.

Hersteller, Serie und Farbe bestimmen die Ausführung. Sobald ein Artikel in einem Projekt verwendet wurde, sind Änderungen dieser Merkmale gesperrt; für eine andere Ausführung einen neuen Artikel anlegen. Name und Kategorie bleiben bearbeitbar. Bereits erfasste Projekte behalten ihren eingefrorenen Artikelstand; weitere Buchungen desselben Artikels in diesem Projekt verwenden denselben Stand. Gleichnamige unterschiedliche Ausführungen bleiben getrennt.

## Lokal entwickeln

Voraussetzung: Node.js 24 und npm. Im Repository-Verzeichnis ausführen:

```sh
npm ci
npm run dev
```

Die vom Entwicklungsserver ausgegebene Adresse mit dem Unterpfad `/aufmassapp/` öffnen. Der Service Worker wird nur im Produktions-Build verwendet. Für die Offline-Prüfung deshalb den Produktionsstand verwenden:

```sh
npm run build
npm run preview
```

Preview dient der lokalen Prüfung; die öffentliche Bereitstellung erfolgt über GitHub Pages. Service Worker benötigen HTTPS oder einen als sicher behandelten lokalen Entwicklungsursprung. Eine unverschlüsselte LAN-Adresse auf dem iPhone genügt dafür nicht.

## Automatisierte Prüfungen

```sh
npm test
npm run build
npm run test:e2e
```

Vitest-Prüfungen decken Projektoperationen, Katalogpflege/Seeds, Mengenbuchungen und Summen, Artikelidentität, Migration sowie Projekt-JSON und CSV ab. `npm run build` führt die TypeScript-Prüfung und den Vite-Produktions-Build aus. Playwright prüft den Produktionsstand im Browser einschließlich Offlinebetrieb unter dem Pages-Unterpfad. Falls kein geeigneter Browser installiert ist:

```sh
npx playwright install chromium
```

Die Befehle beschreiben die Prüfungen; die tatsächlich ausgeführten Tests und deren Ergebnisse stehen im jeweiligen Änderungsbericht. Browserprüfungen ersetzen keinen Gerätetest in iOS Safari oder als installierte iPhone-PWA.

## GitHub Pages einrichten

Geprüfte Repository-Identität: `TristanFels/aufmassapp`. Vorgesehene Projektseiten-Adresse: `https://tristanfels.github.io/aufmassapp/`. Der vorhandene Workflow steht in [.github/workflows/pages.yml](.github/workflows/pages.yml).

1. Im Repository **Settings → Pages → Build and deployment → Source: GitHub Actions** auswählen. Keine Branch-Veröffentlichung aus `docs/` oder `dist/` einrichten.
2. Unter **Settings → Actions → General** GitHub Actions und die im Workflow verwendeten offiziellen Aktionen erlauben. Der Workflow fordert `contents: read`, für den Deployment-Job außerdem `pages: write` und `id-token: write` an. Organisationsrichtlinien müssen diese Berechtigungen zulassen; allgemeine Schreibrechte für alle Workflows sind nicht nötig.
3. Falls die Umgebung **github-pages** Deployment-Regeln hat, `main` als erlaubten Branch eintragen bzw. die passenden Reviewer freigeben. Ein manuell gestarteter Workflow darf ebenfalls nur von `main` veröffentlichen.
4. Den Pull Request prüfen und nach `main` übernehmen. Der Push startet Tests, Produktions-Build und das Pages-Deployment. Alternativ **Actions → GitHub Pages → Run workflow** auf `main` starten. Pull Requests führen nur die Prüfungen aus und veröffentlichen nichts.
5. Nach erfolgreichem Deployment die von GitHub Pages angezeigte Adresse prüfen. Unter **Settings → Pages** HTTPS aktivieren, soweit die Option angezeigt wird. Die `github.io`-Adresse wird über HTTPS ausgeliefert; für Custom Domains müssen DNS und Zertifikat eingerichtet sein.
6. Auf der veröffentlichten Seite prüfen: Manifest, Icons und `sw.js` werden unter `/aufmassapp/` geladen; nach dem ersten vollständigen Laden wird die Offlinebereitschaft angezeigt. Erst danach offline testen.

Der Standard-Basispfad ist `/aufmassapp/`. Vite-Basis, Manifest-Start-URL, Manifest-Scope und Service-Worker-Scope müssen zusammenpassen. Der Workflow baut ausdrücklich mit `VITE_BASE_PATH: /aufmassapp/`. Bei Umbenennung des Repositorys diesen Wert anpassen. Für eine User-/Organization-Seite im Repository `<account>.github.io` oder eine eigene Domain, auf der die App direkt im Root liegt, den Build mit `VITE_BASE_PATH=/` ausführen und den Workflow entsprechend ändern. Ein Custom-Domain-Umzug ändert den Ursprung und damit den lokalen Datenspeicher: vor dem Wechsel Projekte exportieren und am neuen Ursprung importieren. GitHub Pages leitet IndexedDB-Daten nicht um.

Im Workflow gilt `VITE_BASE_PATH` für den gesamten Build-Job einschließlich Browsertests. Bei lokaler Prüfung eines anderen Basispfads die Variable ebenfalls für Build, Preview und Browsertests setzen, z. B. `export VITE_BASE_PATH=/` vor den Befehlen. Auf der üblichen Projektseite ist keine Überschreibung nötig.

Die Navigation verwendet Hash-URLs; dadurch funktionieren direkte Projektlinks und Reloads ohne serverseitige SPA-Rewrites. Nur die generierten App-Dateien werden als Pages-Artefakt hochgeladen. `dist/`, lokale Datenbanken, exportierte Projekte, Zugangsdaten und Firmendateien werden nicht eingecheckt.

Die vorhandene Pages-Konfiguration bleibt in Version 0.2 erhalten. Änderungen am Code veröffentlichen die App nicht allein. Repository-Einstellungen, Merge und erfolgreicher Deployment-Lauf bleiben erforderlich; eine Live-Veröffentlichung wird hier nicht behauptet.

## Daten, Update und Sicherung

Projekte, Katalog, Buchungen und Einstellungen bleiben lokal im Browserprofil bzw. im Speicher der installierten PWA. GitHub Pages liefert nur statische App-Dateien; es gibt kein Backend und keine automatische Cloud-Synchronisierung. Safari und eine installierte PWA können getrennte Speicher haben. Für die Arbeit stets denselben Einstieg verwenden und Übertragung mit JSON testen.

**Vor dem Wechsel von 0.1/0.1.1 zu 0.2 vorhandene Projekte extern als JSON sichern.** Dann online die Aktualisierung laden und angebotene Aktualisierungen erst nach dem Speichern offener Formulare bestätigen. Die Datenbankmigration ergänzt Katalog und Buchungstabellen; bestehende Projekte, Designwahl und letzter Projektzugriff bleiben erhalten. Bei Migrationsfehlern nicht die Website-Daten löschen: Fehlermeldung festhalten und die externen Sicherungen aufbewahren. Eine 0.1-Sicherung enthält nur Projektmetadaten, da es dort noch keine Aufmaßmengen gab.

### Projekt-JSON

Neue Exporte verwenden Sicherungsschema **2** und enthalten genau ein Projekt, dessen Aufmaßbuchungen und die dafür referenzierten Artikel – auch eigene Artikel und Buchungen mit inzwischen auf null korrigierter Summe. Unbenutzte Katalogartikel, andere Projekte und die Designwahl gehören nicht dazu. Dies ist keine vollständige App-Sicherung. Alte Projektdateien aus 0.1/0.1.1 mit Sicherungsschema 1 bleiben importierbar.

Projekt-JSON-Dateien sind auf 16 MiB begrenzt. Dies berücksichtigt die zusätzlichen Buchungen in Version 0.2. Überschreitet eine Sicherung das Limit, wird dies als Fehler angezeigt und keine unvollständige Datei erzeugt; bestehende Daten bleiben erhalten. CSV ersetzt keine wiederherstellbare JSON-Sicherung.

Der Import validiert Syntax, Schema, Felder, IDs, Referenzen und Mengen vor dem Schreiben und übernimmt alles atomar. Ungültige oder nicht unterstützte Dateien verändern den Bestand nicht. Eine Projekt-ID-Kollision erzeugt eine neue Projektkopie; vorhandene Projekte werden weder überschrieben noch zusammengeführt. Konflikte mit vorhandenen Artikel-/Buchungs-IDs werden mit konsistent umgesetzten Referenzen aufgelöst, ohne bestehende Datensätze zu überschreiben.

Die Namensregel aus 0.1.1 bleibt erhalten: Jeder Import heißt etwa „Baustelle 1 (Import)“, bei belegtem Namen „Baustelle 1 (Import 2)“ usw.; auch archivierte Projekte zählen. Zusätze werden nicht gestapelt, lange Basisnamen auf das 120-Zeichen-Limit gekürzt. Originalprojekte bleiben unverändert; Importnamen lassen sich anschließend frei bearbeiten.

JSON nach dem Export tatsächlich außerhalb des Browsers aufbewahren, auf dem iPhone z. B. in „Dateien“. Projektnamen, Artikeldaten und Mengen können vertraulich sein. Browserbereinigung, privates Surfen, Speicherknappheit oder Geräteverlust können lokale Daten entfernen. Erst eine extern aufbewahrte und testweise importierte Datei ist eine überprüfte Sicherung.

### Material-CSV

Im Projekt **CSV exportieren** wählen. Die Datei enthält Bezeichnung, Kategorie, Hersteller, Serie, Farbe, Einheit und Menge aus dem eingefrorenen Projektstand. Zeilen mit Menge null werden ausgelassen. Format: UTF-8 mit BOM, Semikolon als Trennzeichen, CRLF-Zeilenenden; Textfelder werden in Anführungszeichen gesetzt und enthaltene Anführungszeichen verdoppelt. Formelanfänge wie `=`, `+`, `-` und `@` werden mit einem führenden Apostroph entschärft. CSV ist eine lesbare Materialliste, kein wieder importierbares Projektbackup. Die Darstellung in der auf dem iPhone verwendeten Tabellen-App zusätzlich prüfen.

## Manueller iPhone-Abnahmetest

Mit unkritischen Testprojekten auf der veröffentlichten HTTPS-Adresse durchführen und iOS-Version sowie Ergebnis notieren:

1. **Upgrade von 0.1/0.1.1:** Vorher Projekt-JSON extern sichern, Projektnamen, Archivstatus, Designwahl und letzten Projektzugriff notieren. Online auf 0.2 aktualisieren. Bestehende Projekte und Einstellungen müssen erhalten bleiben; der Katalog muss ohne Zurücksetzen der App erscheinen. Alte JSON-Datei importieren und Projektmetadaten sowie Importnamen prüfen.
2. **Installation und Offline-Kaltstart:** Safari online öffnen, vollständiges Laden und Offlinebereitschaft abwarten. Über **Teilen → Zum Home-Bildschirm** installieren. Aus dem Home-Bildschirm starten, Icon, Safe Areas und Touchflächen in Hoch-/Querformat prüfen. App vollständig schließen, Flugmodus aktivieren, WLAN zusätzlich ausschalten und App neu starten. Oberfläche, Katalog und Projekte müssen vorhanden sein.
3. **Katalogpflege:** Offline eigenen Artikel mit Kategorie, Hersteller, Serie und Farbe anlegen; suchen, Kategorie filtern und als Favorit markieren. Name ändern, deaktivieren, App schließen/öffnen und Zustand prüfen. Reaktivieren. Einen gleichnamigen Artikel mit anderer Ausführung anlegen; beide müssen unterscheidbar bleiben. Ein Deaktivieren oder Bearbeiten der Startartikel muss auch nach Neustart erhalten bleiben.
4. **Mengen:** Projekt öffnen und einen Artikel zweimal mit +1 erfassen: Summe 2. Weitere Menge 3 hinzufügen: Summe 5. Gesamtmenge auf 4 setzen: Summe 4. Minus: Summe 3. Auf null setzen und weiteres Minus versuchen: keine negative Menge. Ungültige oder gebrochene Eingabe darf nicht gespeichert werden. Tastatur und große Touchflächen auf dem iPhone prüfen.
5. **Schutz vorhandener Aufmaße:** Bereits erfassten Artikel im Katalog umbenennen; die Projektliste muss ihren bisherigen Namen/Ausführungsstand behalten. Änderung von Hersteller/Serie/Farbe muss für verwendete Artikel abgelehnt werden. Deaktivieren darf die Menge nicht entfernen und keine neue Erhöhung erlauben. Projekt archivieren: Materialliste und Exporte bleiben zugänglich, Mengenänderungen sind gesperrt; nach Reaktivieren wieder erfassen.
6. **Persistenz:** Offline erfasste Mengen, Katalogänderungen und Projektstatus nach Reload sowie vollständigem Schließen/Öffnen prüfen. Zwischen Projekten wechseln und Schnellzugriff auf das zuletzt geöffnete testen. Hell/Dunkel/System wählen, Neustart prüfen und bei System laufenden iOS-Designwechsel testen.
7. **CSV in Dateien:** Materialliste exportieren, tatsächlich in „Dateien“ speichern und mit der vorgesehenen Tabellen-App öffnen. Umlaute, Semikolon-/Anführungszeichen in Testnamen, Ausführung und Mengen prüfen. Namen mit Formelanfang müssen Text bleiben. CSV ersetzt den JSON-Export nicht.
8. **JSON in frischer Installation:** Projekt mit eigenem Artikel und mehreren Korrekturen als JSON extern sichern. Auf einem zweiten Gerät oder in einem frischen, getrennten Testprofil importieren: Artikelstand, Status und Mengen müssen übereinstimmen. Dieselbe Datei erneut importieren: unterscheidbarer Importname und neue Projektkopie, Original unverändert. Eine kaputte Datei versuchen; kein Teilimport. Keine Website-Daten einer Arbeitsinstallation ohne extern gesicherte und überprüfte Dateien löschen.
9. **App-Update:** Bei einer späteren neuen Bereitstellung online Update-Hinweis prüfen, offene Eingaben zunächst speichern oder verwerfen und Update bestätigen. Mengen, eigene Artikel, Favoriten und Deaktivierungen kontrollieren; danach erneut einen Offline-Kaltstart durchführen.

Ein tatsächlicher iPhone-Offline-, Installations- oder Upgrade-Test ist durch die Cloud-Entwicklung nicht bestätigt. Insbesondere iOS-Dateiauswahl/-download, Standalone-Kaltstart, PWA-Speicher und Tabellen-App-Verhalten müssen auf dem Gerät abgenommen werden.

Weitere Struktur- und Versionshinweise: [ARCHITECTURE.md](ARCHITECTURE.md), [CHANGELOG.md](CHANGELOG.md).

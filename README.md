# Baustellenaufmaß · Version 0.2.1

Lokale, für das iPhone ausgelegte Baustellenaufmaß-App als Progressive Web App (PWA). Version 0.2.1 erweitert den Katalog und die Materialerfassung aus [Auftrag 002](tasks/002-measurement.md) um [benannte individuelle Aufmaße](tasks/003-named-measurements.md). Die Hauptnavigation lautet Projekt, Aufmaß, Artikel, Einstellungen.

## Funktionen

- Projekte anlegen, öffnen, umbenennen, archivieren und reaktivieren; aktive und archivierte Projekte getrennt anzeigen, zuletzt geöffnetes Projekt direkt aufrufen.
- Lokaler, projektübergreifender Katalog mit 22 Startartikeln, Kategorien, Suche und einfachen globalen Favoriten. Eigene Artikel offline anlegen und bearbeiten; Artikel deaktivieren und reaktivieren.
- Mehrere benannte Aufmaße je Projekt mit optionaler Kategorie anlegen, wieder öffnen und umbenennen. Unter „Aufmaß“ ein Projekt und dann ein Aufmaß wählen; alternativ im Projekt „Aufmaß erfassen“ öffnen.
- Im individuellen Aufmaß Artikel über Suche/Kategorienfilter auswählen, eine zusätzliche Stückzahl eingeben und hinzufügen. Die Liste darunter zeigt die bisherigen Mengen. **Gesamtmenge bearbeiten** öffnet eine getrennte Korrektureingabe; alte Buchungen bleiben erhalten.
- Materialliste und CSV je Aufmaß; gemeinsame Materialliste aller Aufmaße in der Aufmaßverwaltung, Projekt-CSV unter „Projekt sichern“. Jede Buchung zählt genau einmal.
- Materialliste nach stabiler Artikel-/Varianten-ID mit eingefrorenen Bezeichnungen und Ausführungen. Jede tatsächliche Mengenänderung wird als eigene Buchung gespeichert. Archivierte Projekte erlauben weiterhin Anzeige und Export, aber keine Mengenänderung.
- Einzelprojekt als versionierte JSON-Datei einschließlich seiner Aufmaßbuchungen und referenzierten Artikel sichern und wiederherstellen; erster CSV-Export der Materialliste.
- Automatisches lokales Speichern über Dexie/IndexedDB, Designwahl System/Hell/Dunkel und Offline-App-Shell mit Installationsmanifest und Icons.

Materialkombinationen, automatische Wippenzuordnung, Bereichsbäume, Fortschritts-/Beschaffungsplanung, Preise, Firmenartikelnummern, PDF, Snapshot-Backups, Cloud-Synchronisierung und frei gestaltbare Favoritenlayouts sind nicht enthalten. Eine ausführliche Historienoberfläche, Undo/Redo und gezielte Bearbeitung alter Buchungen folgen später.

## Startkatalog und eigene Artikel

Alle Mengen haben zunächst die Einheit **Stück**; zulässig sind ganze Mengen bis 1.000.000 je Artikel und Aufmaß. Projektsummen können darüber liegen. Der Startkatalog übernimmt die vom Nutzer gelieferte Liste ohne erfundene Artikelnummern oder Preise:

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

Die tatsächlich ausgeführten Tests und offenen Geräteprüfungen stehen im [Prüfbericht 0.2.1](docs/VALIDATION-0.2.1.md). Browserprüfungen ersetzen keinen Gerätetest in iOS Safari oder als installierte iPhone-PWA.

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

**Vor dem Update auf 0.2.1 vorhandene Projekte extern als JSON sichern.** Dann online die Aktualisierung laden und angebotene Aktualisierungen erst nach dem Speichern offener Formulare bestätigen. Die versionierte Migration auf Dexie-Schema 3 ordnet alle vorhandenen 0.2-Buchungen eines Projekts einem „Bisheriges Aufmaß“ zu. Projekte ohne Buchungen bleiben ohne Aufmaß. Projektdaten einschließlich Importnamen, Buchungs-IDs und Snapshots, Katalogpflege, Favoriten, Einstellungen und letzter Projektzugriff bleiben erhalten. Der gesamte Upgrade läuft atomar; bei Fehlern bleiben auch Schema und alte Daten unverändert. Bei Migrationsfehlern nicht die Website-Daten löschen: Fehlermeldung festhalten und die externen Sicherungen aufbewahren. Eine 0.1-Sicherung enthält nur Projektmetadaten, da es dort noch keine Aufmaßmengen gab.

### Projekt-JSON

Neue Exporte verwenden Sicherungsschema **3** und enthalten genau ein Projekt, alle benannten Aufmaße einschließlich leerer Aufmaße, deren Buchungen und die dafür referenzierten Artikel – auch eigene Artikel und Buchungen mit inzwischen auf null korrigierter Summe. Unbenutzte Katalogartikel, andere Projekte und die Designwahl gehören nicht dazu. Dies ist keine vollständige App-Sicherung. Alte Projektdateien mit Sicherungsschema 1 und 2 bleiben importierbar. Schema-2-Buchungen werden beim Import einem „Bisheriges Aufmaß“ zugeordnet.

Projekt-JSON-Dateien sind auf 16 MiB begrenzt. Dies berücksichtigt die zusätzlichen Buchungen in Version 0.2. Überschreitet eine Sicherung das Limit, wird dies als Fehler angezeigt und keine unvollständige Datei erzeugt; bestehende Daten bleiben erhalten. CSV ersetzt keine wiederherstellbare JSON-Sicherung.

Der Import validiert Syntax, Schema, Felder, IDs, Referenzen und Mengen vor dem Schreiben und übernimmt alles atomar. Ungültige oder nicht unterstützte Dateien verändern den Bestand nicht. Eine Projekt-ID-Kollision erzeugt eine neue Projektkopie; vorhandene Projekte werden weder überschrieben noch zusammengeführt. Konflikte mit vorhandenen Artikel-/Buchungs-IDs werden mit konsistent umgesetzten Referenzen aufgelöst, ohne bestehende Datensätze zu überschreiben.

Die Namensregel aus 0.1.1 bleibt erhalten: Jeder Import heißt etwa „Baustelle 1 (Import)“, bei belegtem Namen „Baustelle 1 (Import 2)“ usw.; auch archivierte Projekte zählen. Zusätze werden nicht gestapelt, lange Basisnamen auf das 120-Zeichen-Limit gekürzt. Originalprojekte bleiben unverändert; Importnamen lassen sich anschließend frei bearbeiten.

JSON nach dem Export tatsächlich außerhalb des Browsers aufbewahren, auf dem iPhone z. B. in „Dateien“. Projektnamen, Artikeldaten und Mengen können vertraulich sein. Browserbereinigung, privates Surfen, Speicherknappheit oder Geräteverlust können lokale Daten entfernen. Erst eine extern aufbewahrte und testweise importierte Datei ist eine überprüfte Sicherung.

### Material-CSV

Für das einzelne Aufmaß **Aufmaß-CSV exportieren** wählen; im Projekt **CSV exportieren** für die gemeinsame Baustellenliste. Die Datei enthält Bezeichnung, Kategorie, Hersteller, Serie, Farbe, Einheit und Menge aus dem eingefrorenen Projektstand. Zeilen mit Menge null werden ausgelassen. Format: UTF-8 mit BOM, Semikolon als Trennzeichen, CRLF-Zeilenenden; Textfelder werden in Anführungszeichen gesetzt und enthaltene Anführungszeichen verdoppelt. Formelanfänge wie `=`, `+`, `-` und `@` werden mit einem führenden Apostroph entschärft. CSV ist eine lesbare Materialliste, kein wieder importierbares Projektbackup. Die Darstellung in der auf dem iPhone verwendeten Tabellen-App zusätzlich prüfen.

## Manueller iPhone-Abnahmetest

Mit unkritischen Testprojekten auf der veröffentlichten HTTPS-Adresse durchführen und iOS-Version sowie Ergebnis notieren:

1. **Upgrade von 0.2:** Vorher alle Testprojekte als JSON extern sichern. Zwei Projekte mit Buchungen/Korrekturen, ein archiviertes/importiertes Projekt, eigene Katalogänderungen, Favoriten und Design notieren. Online aktualisieren. Unter jedem betroffenen Projekt muss „Bisheriges Aufmaß“ mit exakt denselben Mengen erscheinen. Keine Websitedaten löschen. Alte JSON-Schemata 1 und 2 separat importieren.
2. **Installation/Offline:** Safari online öffnen, „Offline bereit“ abwarten und über Teilen → Zum Home-Bildschirm installieren. Nach vollständigem Schließen im Flugmodus (WLAN aus) erneut starten. Projekte, Aufmaße und Katalog müssen verfügbar sein. Updatehinweis und Wechsel von alter zu neuer App-Shell zusätzlich prüfen.
3. **Navigation und Touch:** Die vier Menüpunkte, beide Aufmaßeinstiege, Zurücknavigation und direkte Links prüfen. Zwei benannte Aufmaße mit optionaler Kategorie anlegen; wieder öffnen und umbenennen. Große Touchflächen, Scrollen, Safe Areas und fehlenden horizontalen Überlauf in Hoch-/Querformat prüfen.
4. **Erfassung/Korrektur:** Artikel suchen oder Kategorie filtern, auswählen, 3 Stück hinzufügen, weitere 2 Stück hinzufügen: 5. Über „Gesamtmenge bearbeiten“ auf 4 setzen. Im zweiten Aufmaß 7 Stück desselben Artikels: Baustellensumme 11. Erstes Aufmaß auf 0 korrigieren: Baustellensumme 7. Nummerntastatur, leere/ungültige Eingaben und nach Speichern Schließen/Neustart prüfen. Verschiedene Farben bleiben getrennt. Archivierte Projekte erlauben keine Erfassung.
5. **Eigene Artikel:** Offline Artikel anlegen, bearbeiten, favorisieren, deaktivieren/reaktivieren. Alle passenden aktiven Standard- und eigenen Artikel müssen auswählbar sein. Deaktivierte Artikel behalten ihre bisherigen Mengen; andere Ausführungen werden als neue Artikel angelegt.
6. **Dateien:** Aufmaß-CSV, Projekt-CSV und Projekt-JSON über Safari/PWA wirklich in „Dateien“ sichern. Abstand zwischen JSON-/CSV-Schaltflächen, Freigabedialog und CSV in der Ziel-Tabellenapp prüfen. Projekt-JSON auf frischem Browserprofil importieren: alle Aufmaßnamen/Kategorien, leere Aufmaße, Buchungen und eigenen referenzierten Artikel vergleichen; Importkennzeichnung und Nummerierung prüfen. Ungültige JSON darf nichts verändern.
7. **Design:** System/Hell/Dunkel nach Neustart prüfen; Lesbarkeit und Kontrast mit Tastatur sowie bei Geräteausrichtung prüfen.

Die ausführliche manuelle Funktionsabnahme folgt nach den weiteren Gestaltungsrunden. Diese Geräteprüfungen sind offen; automatisierte Chromium-Tests bestätigen kein iOS-Safari-Verhalten.

# Baustellenaufmaß · Version 0.1

Lokale, für das iPhone ausgelegte Baustellenaufmaß-App als Progressive Web App (PWA). Dieses erste Inkrement liefert die technische Basis und Projektverwaltung. Verbindlicher Lieferumfang: [tasks/001-foundation.md](tasks/001-foundation.md).

## Funktionen

- Projekte anlegen, öffnen, umbenennen, archivieren und reaktivieren; aktive und archivierte Projekte getrennt anzeigen.
- Schnellzugriff auf das zuletzt geöffnete Projekt.
- Automatisches lokales Speichern bestätigter Änderungen in IndexedDB mit Dexie.
- Einzelprojekt als versionierte JSON-Datei exportieren und wieder importieren. Bei gleicher ID wird eine neue Projektkopie angelegt; ein vorhandenes Projekt wird nie überschrieben.
- Designwahl „System“, „Hell“ und „Dunkel“; die Auswahl bleibt gespeichert, „System“ folgt auch laufenden Betriebssystemwechseln.
- Offline-App-Shell, Installationsmanifest und Icons; Navigation „Projekte“, „Artikel“ und „Einstellungen“. „Artikel“ ist ausdrücklich ein Platzhalter.

Artikelkatalog, Materialerfassung, Kombinationen, Bereichsbäume, Planung, CSV/PDF, Snapshot-Backups, Firmen-PDF und Synchronisierung gehören zu späteren Inkrementen und sind nicht enthalten.

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

Vitest prüft Projektoperationen, IndexedDB-Persistenz, JSON-Validierung und Roundtrips einschließlich ID-Kollisionen sowie die Design-Einstellung. `npm run build` führt die TypeScript-Prüfung und den Vite-Produktions-Build aus. Playwright prüft den Produktionsstand im Browser einschließlich Offlinebetrieb unter dem Pages-Unterpfad. Falls kein geeigneter Browser installiert ist:

```sh
npx playwright install chromium
```

Die Browserprüfung ersetzt keinen Gerätetest in iOS Safari oder als installierte iPhone-PWA. Tatsächlich ausgeführte Tests und verbleibende Einschränkungen werden im Änderungsbericht ausgewiesen.

## GitHub Pages einrichten

Geprüfte Repository-Identität: `TristanFels/aufmassapp`. Vorgesehene Projektseiten-Adresse: `https://tristanfels.github.io/aufmassapp/`. Es gab bislang keine Pages-Konfiguration; der Workflow steht in [.github/workflows/pages.yml](.github/workflows/pages.yml).

1. Im Repository **Settings → Pages → Build and deployment → Source: GitHub Actions** auswählen. Keine Branch-Veröffentlichung aus `docs/` oder `dist/` einrichten.
2. Unter **Settings → Actions → General** GitHub Actions und die im Workflow verwendeten offiziellen Aktionen erlauben. Der Workflow fordert `contents: read`, für den Deployment-Job außerdem `pages: write` und `id-token: write` an. Organisationsrichtlinien müssen diese Berechtigungen zulassen; allgemeine Schreibrechte für alle Workflows sind nicht nötig.
3. Falls die Umgebung **github-pages** Deployment-Regeln hat, `main` als erlaubten Branch eintragen bzw. die passenden Reviewer freigeben. Ein manuell gestarteter Workflow darf ebenfalls nur von `main` veröffentlichen.
4. Den Pull Request prüfen und nach `main` übernehmen. Der Push startet Tests, Produktions-Build und das Pages-Deployment. Alternativ **Actions → GitHub Pages → Run workflow** auf `main` starten. Pull Requests führen nur die Prüfungen aus und veröffentlichen nichts.
5. Nach erfolgreichem Deployment die von GitHub Pages angezeigte Adresse prüfen. Unter **Settings → Pages** HTTPS aktivieren, soweit die Option angezeigt wird. Die `github.io`-Adresse wird über HTTPS ausgeliefert; für Custom Domains müssen DNS und Zertifikat eingerichtet sein.
6. Auf der veröffentlichten Seite prüfen: Manifest, Icons und `sw.js` werden unter `/aufmassapp/` geladen; nach dem ersten vollständigen Laden wird die Offlinebereitschaft angezeigt. Erst danach offline testen.

Der Standard-Basispfad ist `/aufmassapp/`. Vite-Basis, Manifest-Start-URL, Manifest-Scope und Service-Worker-Scope müssen zusammenpassen. Der Workflow baut ausdrücklich mit `VITE_BASE_PATH: /aufmassapp/`. Bei Umbenennung des Repositorys diesen Wert anpassen. Für eine User-/Organization-Seite im Repository `<account>.github.io` oder eine eigene Domain, auf der die App direkt im Root liegt, den Build mit `VITE_BASE_PATH=/` ausführen und den Workflow entsprechend ändern. Ein Custom-Domain-Umzug ändert den Ursprung und damit den lokalen Datenspeicher: vor dem Wechsel Projekte exportieren und am neuen Ursprung importieren. GitHub Pages leitet IndexedDB-Daten nicht um.

Im Workflow gilt `VITE_BASE_PATH` für den gesamten Build-Job einschließlich Browsertests. Bei lokaler Prüfung eines anderen Basispfads die Variable ebenfalls für Build, Preview und Browsertests setzen, z. B. `export VITE_BASE_PATH=/` vor den Befehlen. Auf der üblichen Projektseite ist keine Überschreibung nötig.

Die Navigation verwendet Hash-URLs; dadurch funktionieren direkte Projektlinks und Reloads ohne serverseitige SPA-Rewrites. Nur die generierten App-Dateien werden als Pages-Artefakt hochgeladen. `dist/`, lokale Datenbanken, exportierte Projekte, Zugangsdaten und Firmendateien werden nicht eingecheckt.

Das Anlegen dieses Workflows veröffentlicht die App noch nicht. Repository-Einstellungen, Merge und erfolgreicher Deployment-Lauf bleiben erforderlich; eine Live-Veröffentlichung wird hier nicht behauptet.

## Daten und Sicherung

Projekte und Einstellungen bleiben lokal im Browserprofil bzw. im Speicher der installierten PWA. GitHub Pages liefert nur statische App-Dateien; es gibt kein Backend und keine automatische Cloud-Synchronisierung. Safari und eine installierte PWA können getrennte Speicher haben. Für die Arbeit stets denselben Einstieg verwenden und Übertragung mit JSON testen.

Eine JSON-Datei sichert genau ein Projekt, nicht die gesamte App oder die Design-Einstellung. Nach dem Export die Datei außerhalb des Browsers aufbewahren, auf dem iPhone z. B. in „Dateien“. Exporte können vom Nutzer eingegebene Projektnamen enthalten und müssen passend geschützt werden. Browserbereinigung, privates Surfen, Speicherknappheit oder Geräteverlust können lokale Daten entfernen. Erst eine extern aufbewahrte und testweise importierte Datei ist eine überprüfte Sicherung.

Ungültige, unbekannte oder nicht unterstützte Importformate werden abgelehnt; bestehende Daten bleiben erhalten. In Version 0.1 gibt es weder Überschreiben noch Zusammenführen vorhandener Projekte. Ein Import mit bereits vorhandener ID erhält eine neue stabile ID. Seit Version 0.1.1 bekommt jeder Import einen erkennbaren Namen: „Baustelle 1 (Import)“, bei belegtem Namen „Baustelle 1 (Import 2)“ usw. Auch archivierte Projekte werden dabei berücksichtigt. Vorhandene Importzusätze werden nicht gestapelt. Bei langen Namen wird nur der ursprüngliche Namensteil für das 120-Zeichen-Limit gekürzt. Der Name lässt sich anschließend wie gewohnt frei ändern.

## Manueller iPhone-Abnahmetest

Mit unkritischen Testprojekten auf der veröffentlichten HTTPS-Adresse durchführen und iOS-Version sowie Ergebnis notieren:

1. **Erstinstallation:** Safari online öffnen, vollständiges Laden und die Anzeige der Offlinebereitschaft abwarten. Über **Teilen → Zum Home-Bildschirm** installieren. Aus dem Home-Bildschirm starten und App-Name, Icon, Safe Areas, Schriftgröße, Tastatur und große Touchflächen prüfen; Hoch- und Querformat ohne horizontales Scrollen testen.
2. **Speichern und Offline-Kaltstart:** Projekt anlegen, umbenennen und die erfolgreiche Speicherung abwarten. App vollständig schließen. Flugmodus aktivieren, WLAN zusätzlich ausschalten und die installierte App erneut starten. Oberfläche und unverändertes Projekt müssen erscheinen. Auch Offline-Reload prüfen.
3. **Projektverwaltung:** Offline ein zweites Projekt anlegen. Beide öffnen und den Schnellzugriff auf das zuletzt geöffnete prüfen. Archivieren, App schließen/öffnen, archiviertes Projekt kontrollieren und reaktivieren; Name und Status müssen erhalten bleiben.
4. **JSON-Roundtrip:** Ein Projekt exportieren und tatsächlich in „Dateien“ sichern. Erneut importieren: bei gleicher ID muss eine zweite Projektinstanz entstehen, das Original unverändert bleiben. Einen ungültigen JSON-Import versuchen und Fehlermeldung sowie unveränderte Projektliste prüfen.
5. **Frische Installation:** Die exportierte Datei in einem frischen, getrennten Test-Browserprofil oder auf einem zweiten Gerät importieren. Nur nach extern gesicherter und überprüfter Datei gegebenenfalls Website-Daten der Testinstallation löschen. Nach Import muss der Status übereinstimmen; der Name erhält den Zusatz „(Import)“. Die ID bleibt ohne Kollision erhalten. Erneut importieren und den nummerierten Namen sowie freie Umbenennbarkeit prüfen. Diese Prüfung nicht mit ungesicherten Arbeitsdaten ausführen.
6. **Design:** Hell und Dunkel auswählen, App neu starten und Persistenz prüfen. „System“ wählen und iOS-Design bei laufender App wechseln; die Oberfläche muss folgen. Auch nach einem Offline-Neustart kontrollieren.
7. **Updates:** Online eine neu bereitgestellte App-Version laden. Update-Hinweis prüfen, eine offene Namensänderung zunächst speichern und erst dann das Update bestätigen. Nach Reload Offlinebereitschaft und Projekte erneut kontrollieren. Einen Offline-Neustart der aktualisierten App durchführen.

Ein tatsächlicher iPhone-Offline- oder Installationstest ist durch die Entwicklung in der Cloud nicht bestätigt. Insbesondere iOS-Dateiauswahl/-download, PWA-Speicher, Standalone-Kaltstart und Betriebssystem-Designwechsel müssen auf dem Gerät abgenommen werden.

Weitere Struktur- und Versionshinweise: [ARCHITECTURE.md](ARCHITECTURE.md), [CHANGELOG.md](CHANGELOG.md).

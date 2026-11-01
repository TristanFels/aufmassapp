import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import { liveQuery } from "dexie";
import { projects } from "./services";
import { useTheme } from "./useTheme";
import {
  APP_VERSION,
  MAX_IMPORT_BYTES,
  MAX_PROJECT_NAME_LENGTH,
  type Project,
  type Theme,
} from "../domain/project";
import { OfflineStatus } from "../platform/OfflineStatus";

type Snapshot = { list: Project[]; recent?: Project; theme: Theme };
type Route =
  | { page: "projects"; id?: string }
  | { page: "articles" | "settings" };
const projectUrl = (id: string) => `#/projects/${encodeURIComponent(id)}`;

function readRoute(): Route {
  const hash = window.location.hash;
  if (hash === "#/settings") return { page: "settings" };
  if (hash === "#/articles") return { page: "articles" };
  if (hash.startsWith("#/projects/")) {
    try {
      return { page: "projects", id: decodeURIComponent(hash.slice(11)) };
    } catch {
      /* show list */
    }
  }
  return { page: "projects" };
}

function Icon({
  name,
}: {
  name: "projects" | "articles" | "settings" | "arrow" | "plus";
}) {
  const paths = {
    projects: "M3 7h7l2 2h9v11H3V7Zm0 0V4h7l2 3",
    articles: "m12 3 9 5-9 5-9-5 9-5Zm-9 5v9l9 5 9-5V8M12 13v9",
    settings: "M4 6h16M4 12h16M4 18h16M8 3v6M16 9v6M9 15v6",
    arrow: "M5 12h14m-6-6 6 6-6 6",
    plus: "M12 5v14M5 12h14",
  };
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[name]} />
    </svg>
  );
}

function CardLink({
  project,
  recent = false,
}: {
  project: Project;
  recent?: boolean;
}) {
  return (
    <a
      className={`project-card ${recent ? "recent-card" : ""}`}
      href={projectUrl(project.id)}
    >
      <span className="project-symbol">
        <Icon name="projects" />
      </span>
      <span className="project-info">
        <strong>{project.name}</strong>
        <span>
          {project.status === "archived" ? "Archiviert" : "Aktiv"} ·{" "}
          {new Intl.DateTimeFormat("de", { dateStyle: "medium" }).format(
            new Date(project.updatedAt),
          )}
        </span>
      </span>
      <Icon name="arrow" />
    </a>
  );
}

export function App() {
  const [route, setRoute] = useState<Route>(readRoute);
  const [snapshot, setSnapshot] = useState<Snapshot>();
  const [dbError, setDbError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const operationLock = useRef(false);
  useTheme(snapshot?.theme ?? "system");

  useEffect(() => {
    setDbError(false);
    const subscription = liveQuery(async () => {
      const [list, recent, theme] = await Promise.all([
        projects.listProjects(),
        projects.getLastProject(),
        projects.getTheme(),
      ]);
      return { list, recent, theme };
    }).subscribe({ next: setSnapshot, error: () => setDbError(true) });
    return () => subscription.unsubscribe();
  }, [retry]);

  useEffect(() => {
    const listener = () => {
      setRoute(readRoute());
      setError("");
      setMessage("");
    };
    window.addEventListener("hashchange", listener);
    return () => window.removeEventListener("hashchange", listener);
  }, []);

  const currentId = route.page === "projects" ? route.id : undefined;
  const current = snapshot?.list.find((project) => project.id === currentId);
  useEffect(() => {
    if (currentId && current)
      void projects
        .openProject(currentId)
        .catch(() =>
          setError(
            "Das zuletzt geöffnete Projekt konnte nicht gespeichert werden.",
          ),
        );
  }, [currentId, Boolean(current)]);

  async function perform(operation: () => Promise<void>) {
    if (operationLock.current) return;
    operationLock.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await operation();
    } catch (cause) {
      const detail =
        cause instanceof Error ? cause.message : "Unbekannter Fehler";
      setError(
        `Aktion fehlgeschlagen. ${detail} Bitte erneut versuchen. Bestehende Daten werden nicht gelöscht.`,
      );
    } finally {
      operationLock.current = false;
      setBusy(false);
    }
  }

  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    await perform(async () => {
      if (file.size > MAX_IMPORT_BYTES)
        throw new Error("Die JSON-Datei ist zu groß (höchstens 1 MiB).");
      const project = await projects.importProject(await file.text());
      setMessage(
        `„${project.name}“ importiert. Vorhandene Projekte bleiben unverändert.`,
      );
    });
  }

  const title =
    route.page === "articles"
      ? "Artikel"
      : route.page === "settings"
        ? "Einstellungen"
        : "Projekte";
  return (
    <div className="app-shell">
      <header className="topbar">
        <a
          href="#/projects"
          className="brand"
          aria-label="Baustellenaufmaß – Projekte"
        >
          <span className="brand-mark">
            A<span>+</span>
          </span>
          <span>
            BAUSTELLEN<span>AUFMASS</span>
          </span>
        </a>
        <span className="version">V {APP_VERSION}</span>
      </header>
      <main id="main-content">
        <OfflineStatus busy={busy} />
        {error && (
          <div role="alert" className="notice error">
            {error}
            <button className="text-button" onClick={() => setError("")}>
              Meldung schließen
            </button>
          </div>
        )}
        {message && (
          <p role="status" className="notice success">
            {message}
          </p>
        )}
        {dbError ? (
          <section className="panel">
            <h1>Lokaler Speicher nicht verfügbar</h1>
            <p>
              Projekte können gerade nicht sicher geladen oder gespeichert
              werden. Prüfe freien Gerätespeicher und die Browser-Einstellungen.
              Lösche keine Websitedaten ohne externe Sicherung.
            </p>
            <button onClick={() => setRetry((value) => value + 1)}>
              Erneut versuchen
            </button>
          </section>
        ) : !snapshot ? (
          <p role="status">Projekte werden geladen …</p>
        ) : (
          <>
            {route.page === "projects" &&
              (currentId ? (
                current ? (
                  <ProjectDetail
                    key={current.id}
                    project={current}
                    busy={busy}
                    perform={perform}
                    notify={setMessage}
                  />
                ) : (
                  <section className="panel">
                    <h1>Projekt nicht gefunden</h1>
                    <p>Dieses Projekt ist auf diesem Gerät nicht vorhanden.</p>
                    <a href="#/projects">Zur Projektübersicht</a>
                  </section>
                )
              ) : (
                <>
                  <div className="page-heading">
                    <p className="eyebrow">DEINE BAUSTELLEN. DEIN GERÄT.</p>
                    <h1>{title}</h1>
                    <p>Gut vorbereitet auf die Baustelle.</p>
                  </div>
                  {snapshot.recent && (
                    <section
                      aria-labelledby="recent-heading"
                      className="section"
                    >
                      <h2 id="recent-heading">Zuletzt geöffnet</h2>
                      <CardLink project={snapshot.recent} recent />
                    </section>
                  )}
                  <CreateProject busy={busy} perform={perform} />
                  <ProjectList
                    title="Aktive Projekte"
                    items={snapshot.list.filter(
                      (project) => project.status === "active",
                    )}
                    empty="Noch kein aktives Projekt. Lege deine erste Baustelle an."
                  />
                  <ProjectList
                    title="Archivierte Projekte"
                    items={snapshot.list.filter(
                      (project) => project.status === "archived",
                    )}
                    empty="Hier erscheinen deine archivierten Projekte."
                  />
                  <section className="panel import-panel">
                    <h2>Projekt aus Sicherung laden</h2>
                    <p>
                      Einzelprojekt als JSON importieren (max. 1 MiB). Bei
                      gleicher ID entsteht eine neue Kopie; bestehende Projekte
                      werden nie überschrieben.
                    </p>
                    <label className={`file-button ${busy ? "disabled" : ""}`}>
                      Projekt-JSON importieren
                      <input
                        type="file"
                        accept=".json,application/json"
                        disabled={busy}
                        onChange={(event) => void importFile(event)}
                      />
                    </label>
                  </section>
                </>
              ))}
            {route.page === "articles" && (
              <>
                <div className="page-heading">
                  <p className="eyebrow">SCHRITT FÜR SCHRITT</p>
                  <h1>Artikel</h1>
                </div>
                <section className="panel placeholder">
                  <span className="large-symbol">
                    <Icon name="articles" />
                  </span>
                  <h2>Die Grundlage steht.</h2>
                  <p>
                    Artikelkatalog und Materialerfassung folgen in einer
                    späteren Version. In Version 0.1 verwaltest und sicherst du
                    deine Projekte.
                  </p>
                  <a className="button" href="#/projects">
                    Zu den Projekten
                  </a>
                </section>
              </>
            )}
            {route.page === "settings" && (
              <>
                <div className="page-heading">
                  <p className="eyebrow">SO ARBEITEST DU</p>
                  <h1>Einstellungen</h1>
                </div>
                <section className="panel">
                  <fieldset disabled={busy}>
                    <legend>Design</legend>
                    <p className="field-help">
                      Passend zum Licht auf deiner Baustelle.
                    </p>
                    <div className="theme-options">
                      {(
                        [
                          ["system", "System"],
                          ["light", "Hell"],
                          ["dark", "Dunkel"],
                        ] as const
                      ).map(([value, label]) => (
                        <label className="theme-option" key={value}>
                          <input
                            type="radio"
                            name="theme"
                            value={value}
                            checked={snapshot.theme === value}
                            onChange={() =>
                              void perform(async () => {
                                await projects.setTheme(value);
                              })
                            }
                          />
                          <span>{label}</span>
                        </label>
                      ))}
                    </div>
                    <p className="field-help">
                      „System“ folgt automatisch der Darstellung deines iPhones.
                      Die Auswahl wird lokal gespeichert.
                    </p>
                  </fieldset>
                </section>
                <section className="panel">
                  <h2>Lokal heißt: bei dir.</h2>
                  <p>
                    Alle Projekte liegen in diesem Browser auf diesem Gerät. Es
                    gibt kein Konto und keine Cloud-Synchronisierung.
                  </p>
                  <p>
                    Websitedaten können durch Browserbereinigung oder das
                    Betriebssystem verloren gehen. Exportiere wichtige Projekte
                    regelmäßig als JSON und speichere sie außerhalb der App.
                  </p>
                  <p>
                    Installation auf dem iPhone: in Safari öffnen, Teilen → „Zum
                    Home-Bildschirm“. Vor dem Offline-Einsatz auf „Offline
                    bereit“ warten.
                  </p>
                  <small>
                    Baustellenaufmaß {APP_VERSION} · Projektschema 1
                  </small>
                </section>
              </>
            )}
          </>
        )}
        <footer>
          Auf deinem Gerät gespeichert. Für deine Baustelle gemacht.
        </footer>
      </main>
      <nav className="bottom-nav" aria-label="Hauptnavigation">
        {(["projects", "articles", "settings"] as const).map((page) => (
          <a
            href={`#/${page}`}
            key={page}
            aria-current={route.page === page ? "page" : undefined}
          >
            <Icon name={page} />
            <span>
              {page === "projects"
                ? "Projekte"
                : page === "articles"
                  ? "Artikel"
                  : "Einstellungen"}
            </span>
          </a>
        ))}
      </nav>
    </div>
  );
}

type Perform = (operation: () => Promise<void>) => Promise<void>;

function CreateProject({ busy, perform }: { busy: boolean; perform: Perform }) {
  const [show, setShow] = useState(false);
  const [name, setName] = useState("");
  function submit(event: FormEvent) {
    event.preventDefault();
    void perform(async () => {
      const project = await projects.createProject(name);
      setName("");
      setShow(false);
      window.location.hash = projectUrl(project.id);
    });
  }
  return (
    <section className="create-section">
      {show ? (
        <form className="panel" onSubmit={submit}>
          <h2>Neue Baustelle</h2>
          <label htmlFor="new-project-name">Projektname</label>
          <input
            id="new-project-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="z. B. Neubau Musterstraße"
            autoFocus
            required
            maxLength={MAX_PROJECT_NAME_LENGTH}
            disabled={busy}
          />
          <div className="actions">
            <button type="submit" disabled={busy || !name.trim()}>
              Projekt erstellen
            </button>
            <button
              type="button"
              className="secondary"
              disabled={busy}
              onClick={() => setShow(false)}
            >
              Abbrechen
            </button>
          </div>
        </form>
      ) : (
        <button className="create-button" onClick={() => setShow(true)}>
          <Icon name="plus" />
          Projekt anlegen
        </button>
      )}
    </section>
  );
}

function ProjectList({
  title,
  items,
  empty,
}: {
  title: string;
  items: Project[];
  empty: string;
}) {
  return (
    <section className="section" aria-label={title}>
      <h2>
        {title}
        <span className="count">{items.length}</span>
      </h2>
      {items.length ? (
        <ul className="project-list">
          {items.map((project) => (
            <li key={project.id}>
              <CardLink project={project} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="empty-state">{empty}</p>
      )}
    </section>
  );
}

function ProjectDetail({
  project,
  busy,
  perform,
  notify,
}: {
  project: Project;
  busy: boolean;
  perform: Perform;
  notify: (message: string) => void;
}) {
  const [name, setName] = useState(project.name);
  const changed = name !== project.name;
  useEffect(() => {
    setName(project.name);
  }, [project.name]);
  useEffect(() => {
    const preventUnload = (event: BeforeUnloadEvent) => {
      if (changed) event.preventDefault();
    };
    window.addEventListener("beforeunload", preventUnload);
    return () => window.removeEventListener("beforeunload", preventUnload);
  }, [changed]);
  async function download() {
    const text = await projects.exportProject(project.id);
    const url = URL.createObjectURL(
      new Blob([text], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `aufmass-projekt-${project.id}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    // Give Safari time to start the download before releasing the blob.
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    notify(
      "JSON-Datei erstellt. Bitte außerhalb der App in „Dateien“ sichern und die gespeicherte Datei prüfen.",
    );
  }
  return (
    <>
      <a className="back-link" href="#/projects">
        ← Alle Projekte
      </a>
      <div className="page-heading">
        <p className="eyebrow">
          DEIN PROJEKT{" "}
          <span className="badge">
            {project.status === "active" ? "Aktiv" : "Archiviert"}
          </span>
        </p>
        <h1>{project.name}</h1>
        <p>Lokal gespeichert · Änderungen bleiben auf diesem Gerät.</p>
      </div>
      <section className="panel">
        <h2>Projekt bearbeiten</h2>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void perform(async () => {
              const saved = await projects.renameProject(project.id, name);
              setName(saved.name);
              notify("Projektname gespeichert.");
            });
          }}
        >
          <fieldset disabled={busy}>
            <label htmlFor="project-name">Projektname</label>
            <input
              id="project-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={MAX_PROJECT_NAME_LENGTH}
              required
            />
            <p className="field-help">
              {changed
                ? "Ungespeicherte Namensänderung"
                : "Alle bestätigten Änderungen sind lokal gespeichert."}
            </p>
            <button disabled={!changed || !name.trim()} type="submit">
              Namen speichern
            </button>
          </fieldset>
        </form>
      </section>
      <section className="panel">
        <h2>Projekt sichern</h2>
        <p>
          Eine JSON-Datei enthält dieses Projekt mit Name, Status und
          Zeitstempeln. Sie lässt sich später wieder importieren.
        </p>
        <button disabled={busy} onClick={() => void perform(download)}>
          JSON exportieren
        </button>
      </section>
      <section className="panel">
        <h2>
          {project.status === "active"
            ? "Baustelle abgeschlossen?"
            : "Wieder auf die Baustelle?"}
        </h2>
        <p>
          {project.status === "active"
            ? "Archivierte Projekte bleiben gespeichert und können jederzeit reaktiviert werden."
            : "Reaktiviere das Projekt, um es wieder unter den aktiven Projekten zu sehen."}
        </p>
        <button
          className="secondary"
          disabled={busy || changed}
          onClick={() =>
            void perform(async () => {
              await projects.setProjectStatus(
                project.id,
                project.status === "active" ? "archived" : "active",
              );
              notify(
                project.status === "active"
                  ? "Projekt archiviert."
                  : "Projekt reaktiviert.",
              );
            })
          }
        >
          {project.status === "active"
            ? "Projekt archivieren"
            : "Projekt reaktivieren"}
        </button>
        {changed && (
          <p className="field-help">Bitte zuerst den Projektnamen speichern.</p>
        )}
      </section>
      <section className="project-meta" aria-label="Projektdetails">
        <Meta label="Erstellt">{formatDate(project.createdAt)}</Meta>
        <Meta label="Zuletzt geändert">{formatDate(project.updatedAt)}</Meta>
        <Meta label="Projekt-ID">
          <code>{project.id}</code>
        </Meta>
        <Meta label="Datenversion">Schema {project.schemaVersion}</Meta>
      </section>
    </>
  );
}

function Meta({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <span>{label}</span>
      <span>{children}</span>
    </div>
  );
}
function formatDate(date: string) {
  return new Intl.DateTimeFormat("de", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

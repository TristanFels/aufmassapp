import { useEffect, useState } from "react";
import { liveQuery } from "dexie";
import { measurements } from "../app/services";
import type { Project } from "../domain/project";
import type { NamedMeasurement } from "../domain/measurement";
import type { Perform } from "./Catalog";
import { Measurement, MaterialList } from "./Measurement";
import { useMaterialData } from "./useMaterialData";

export const measurementUrl = (projectId: string, id?: string) =>
  `#/measurements/${encodeURIComponent(projectId)}${id ? "/" + encodeURIComponent(id) : ""}`;

export function Measurements({
  projects,
  projectId,
  id,
  busy,
  perform,
}: {
  projects: Project[];
  projectId?: string;
  id?: string;
  busy: boolean;
  perform: Perform;
}) {
  if (!projectId)
    return (
      <section className="panel">
        <h1>Aufmaß</h1>
        <h2>Projekt auswählen</h2>
        {projects.length ? (
          <ul className="project-list">
            {projects.map((p) => (
              <li key={p.id}>
                <a className="project-card" href={measurementUrl(p.id)}>
                  {p.name}
                  {p.status === "archived" ? " · Archiviert" : ""}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p>Bitte zuerst unter „Projekt“ eine Baustelle anlegen.</p>
        )}
      </section>
    );
  const project = projects.find((p) => p.id === projectId);
  if (!project)
    return (
      <section className="panel">
        <h1>Projekt nicht gefunden</h1>
        <a href="#/measurements">Projekt auswählen</a>
      </section>
    );
  return (
    <ProjectMeasurements
      key={projectId}
      project={project}
      id={id}
      busy={busy}
      perform={perform}
    />
  );
}

function ProjectMeasurements({
  project,
  id,
  busy,
  perform,
}: {
  project: Project;
  id?: string;
  busy: boolean;
  perform: Perform;
}) {
  const [list, setList] = useState<NamedMeasurement[]>();
  const [error, setError] = useState("");
  const { data, error: totalsError } = useMaterialData(project.id);
  useEffect(() => {
    const subscription = liveQuery(() =>
      measurements.list(project.id),
    ).subscribe({
      next: setList,
      error: () =>
        setError("Aufmaße konnten nicht geladen werden. Bitte erneut öffnen."),
    });
    return () => subscription.unsubscribe();
  }, [project.id]);
  const current = list?.find((m) => m.id === id);
  return (
    <>
      <a
        className="back-link"
        href={id ? measurementUrl(project.id) : "#/measurements"}
      >
        ← {id ? "Alle Aufmaße dieses Projekts" : "Projekt auswählen"}
      </a>
      <div className="page-heading">
        <p>{project.name}</p>
        <h1>{current?.name ?? "Aufmaßverwaltung"}</h1>
      </div>
      {error && <p role="alert">{error}</p>}
      {!list ? (
        <p role="status">Aufmaße werden geladen …</p>
      ) : id ? (
        current ? (
          <>
            <MeasurementForm
              key={`form-${current.id}`}
              project={project}
              measurement={current}
              busy={busy}
              perform={perform}
            />
            <Measurement
              key={`entries-${current.id}`}
              projectId={project.id}
              measurementId={current.id}
              archived={project.status === "archived"}
              busy={busy}
              perform={perform}
            />
          </>
        ) : (
          <p role="alert">Aufmaß nicht gefunden.</p>
        )
      ) : (
        <>
          <section className="panel">
            <h2>Vorhandene Aufmaße</h2>
            {list.length ? (
              <ul className="project-list">
                {list.map((m) => (
                  <li key={m.id}>
                    <a
                      className="project-card"
                      href={measurementUrl(project.id, m.id)}
                    >
                      {m.name}
                      {m.category ? ` · ${m.category}` : ""}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p>Noch keine Aufmaße vorhanden.</p>
            )}
          </section>
          <MeasurementForm project={project} busy={busy} perform={perform} />
          <section className="panel" aria-label="Gemeinsame Materialliste">
            <h2>Gemeinsame Materialliste der Baustelle</h2>
            {totalsError && <p role="alert">{totalsError}</p>}
            {data ? (
              <MaterialList totals={data.totals} />
            ) : (
              <p>Materialliste wird geladen …</p>
            )}
            <a href={`#/projects/${encodeURIComponent(project.id)}`}>
              Gesamte Baustelle als CSV oder JSON sichern
            </a>
          </section>
        </>
      )}
    </>
  );
}

function MeasurementForm({
  project,
  measurement,
  busy,
  perform,
}: {
  project: Project;
  measurement?: NamedMeasurement;
  busy: boolean;
  perform: Perform;
}) {
  const [name, setName] = useState(measurement?.name ?? "");
  const [category, setCategory] = useState(measurement?.category ?? "");
  return (
    <form
      className="panel"
      onSubmit={(e) => {
        e.preventDefault();
        void perform(async () => {
          const saved = await measurements.save(
            project.id,
            name,
            category,
            measurement?.id,
          );
          setName(saved.name);
          setCategory(saved.category);
          if (!measurement)
            window.location.hash = measurementUrl(project.id, saved.id);
        });
      }}
    >
      <fieldset disabled={busy || project.status === "archived"}>
        <h2>
          {measurement ? "Aufmaß bearbeiten" : "Neues individuelles Aufmaß"}
        </h2>
        <label htmlFor="measurement-name">Aufmaßname</label>
        <input
          id="measurement-name"
          maxLength={120}
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <label htmlFor="sheet-category">Aufmaßkategorie (optional)</label>
        <input
          id="sheet-category"
          maxLength={80}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
        <button disabled={!name.trim()}>
          {measurement ? "Aufmaß speichern" : "Aufmaß erstellen"}
        </button>
      </fieldset>
    </form>
  );
}

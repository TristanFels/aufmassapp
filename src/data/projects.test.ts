import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDatabase, type AppDatabase } from "./database";
import { ProjectRepository } from "./projects";
import {
  MAX_IMPORT_BYTES,
  MAX_PROJECT_NAME_LENGTH,
  type ProjectBackup,
} from "../domain/project";

let db: AppDatabase;
let repository: ProjectRepository;

beforeEach(() => {
  db = createDatabase(`test-projects-${crypto.randomUUID()}`);
  repository = new ProjectRepository(db);
});

afterEach(async () => {
  await db.delete();
});

async function reopenDatabase() {
  const name = db.name;
  db.close();
  db = createDatabase(name);
  repository = new ProjectRepository(db);
}

async function exportExample(): Promise<ProjectBackup> {
  const project = await repository.createProject("Testbaustelle");
  return JSON.parse(
    await repository.exportProject(project.id),
  ) as ProjectBackup;
}

describe("Projektverwaltung in IndexedDB", () => {
  it("erstellt Projekte mit stabiler ID, Schema und Zeitstempeln und lädt sie nach DB-Neustart", async () => {
    const project = await repository.createProject("  Testbaustelle  ");
    expect(project).toMatchObject({
      name: "Testbaustelle",
      status: "active",
      schemaVersion: 1,
    });
    expect(project.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(project.createdAt).toBe(project.updatedAt);
    expect(new Date(project.createdAt).toISOString()).toBe(project.createdAt);
    await reopenDatabase();
    expect(await repository.getProject(project.id)).toEqual(project);
    expect(await repository.listProjects()).toEqual([project]);
  });

  it("persistiert Umbenennen, Archivierung und Reaktivierung ohne Änderung der Identität", async () => {
    const original = await repository.createProject("Alt");
    await repository.renameProject(original.id, " Neu ");
    await repository.setProjectStatus(original.id, "archived");
    await reopenDatabase();
    expect(await repository.getProject(original.id)).toMatchObject({
      id: original.id,
      name: "Neu",
      status: "archived",
      createdAt: original.createdAt,
    });
    await repository.setProjectStatus(original.id, "active");
    await reopenDatabase();
    expect(await repository.getProject(original.id)).toMatchObject({
      status: "active",
      name: "Neu",
    });
  });

  it.each(["", "   ", "a".repeat(MAX_PROJECT_NAME_LENGTH + 1)])(
    "weist ungültigen Projektnamen zurück (%s)",
    async (name) => {
      await expect(repository.createProject(name)).rejects.toThrow(
        "Projektname",
      );
      expect(await repository.listProjects()).toEqual([]);
    },
  );

  it("weist eine ungültige Umbenennung zurück und erhält den alten Namen", async () => {
    const original = await repository.createProject("Unverändert");
    await expect(repository.renameProject(original.id, " ")).rejects.toThrow(
      "Projektname",
    );
    expect(await repository.getProject(original.id)).toEqual(original);
  });

  it("speichert das zuletzt geöffnete Projekt über einen DB-Neustart hinweg", async () => {
    expect(await repository.getLastProject()).toBeUndefined();
    const first = await repository.createProject("Erstes");
    const second = await repository.createProject("Zweites");
    expect(await repository.openProject(first.id)).toEqual(first);
    await repository.openProject(second.id);
    await reopenDatabase();
    expect(await repository.getLastProject()).toEqual(second);
    await repository.renameProject(second.id, "Aktueller Name");
    expect(await repository.getLastProject()).toMatchObject({
      id: second.id,
      name: "Aktueller Name",
    });
  });

  it("ändert den Schnellzugriff nicht bei fehlgeschlagenem Öffnen", async () => {
    const project = await repository.createProject("Vorhanden");
    await repository.openProject(project.id);
    await expect(repository.openProject("fehlend")).rejects.toThrow(
      "nicht gefunden",
    );
    expect(await repository.getLastProject()).toEqual(project);
  });

  it("meldet fehlende Projekte statt unbemerkt neue anzulegen", async () => {
    await expect(repository.renameProject("fehlend", "Name")).rejects.toThrow(
      "nicht gefunden",
    );
    await expect(
      repository.setProjectStatus("fehlend", "archived"),
    ).rejects.toThrow("nicht gefunden");
    await expect(repository.exportProject("fehlend")).rejects.toThrow(
      "nicht gefunden",
    );
    expect(await repository.listProjects()).toEqual([]);
  });
});

describe("Versionierter JSON-Projektimport und -export", () => {
  it("stellt einen vollständigen archivierten Projektstand in frischer DB mit gleicher ID wieder her", async () => {
    const original = await repository.createProject("Roundtrip");
    const archived = await repository.setProjectStatus(original.id, "archived");
    const json = await repository.exportProject(original.id);
    expect(JSON.parse(json)).toMatchObject({
      format: "baustellenaufmass-project",
      schemaVersion: 1,
      appVersion: "0.1.0",
      project: archived,
    });
    await db.delete();
    db = createDatabase(`test-roundtrip-${crypto.randomUUID()}`);
    repository = new ProjectRepository(db);
    expect(await repository.importProject(json)).toEqual(archived);
    await reopenDatabase();
    expect(await repository.listProjects()).toEqual([archived]);
  });

  it("importiert bei ID-Kollision ausschließlich eine Kopie und überschreibt die vorhandene Instanz nicht", async () => {
    const original = await repository.createProject("Original");
    const json = await repository.exportProject(original.id);
    const changed = await repository.renameProject(original.id, "Lokal neuer");
    const copy = await repository.importProject(json);
    expect(copy.id).not.toBe(original.id);
    expect({ ...copy, id: original.id }).toEqual(original);
    expect(await repository.getProject(original.id)).toEqual(changed);
    expect(await db.projects.count()).toBe(2);
  });

  it("behält bei gleichzeitigen Importen beide Kopien dank transaktionaler Kollisionsprüfung", async () => {
    const backup = await exportExample();
    await db.projects.clear();
    const [first, second] = await Promise.all([
      repository.importProject(JSON.stringify(backup)),
      repository.importProject(JSON.stringify(backup)),
    ]);
    expect(first.id).not.toBe(second.id);
    expect(await db.projects.count()).toBe(2);
  });

  it.each(["kein JSON", "{", "null", "[]", "{}"])(
    "lehnt fehlerhafte Dateien ab und erhält Daten/Einstellungen (%s)",
    async (text) => {
      const project = await repository.createProject("Erhalten");
      await repository.openProject(project.id);
      await repository.setTheme("dark");
      await expect(repository.importProject(text)).rejects.toThrow();
      expect(await repository.listProjects()).toEqual([project]);
      expect(await repository.getLastProject()).toEqual(project);
      expect(await repository.getTheme()).toBe("dark");
    },
  );

  const invalidChanges: [string, (backup: ProjectBackup) => unknown][] = [
    ["anderes Format", (b) => ({ ...b, format: "unbekannt" })],
    ["zukünftiges Dateischema", (b) => ({ ...b, schemaVersion: 2 })],
    [
      "zukünftiges Projektschema",
      (b) => ({ ...b, project: { ...b.project, schemaVersion: 2 } }),
    ],
    [
      "fehlendes Feld",
      (b) => {
        const { appVersion: _unused, ...rest } = b;
        return rest;
      },
    ],
    [
      "zusätzliches Feld",
      (b) => ({ ...b, companyData: "nicht stillschweigend verwerfen" }),
    ],
    [
      "zusätzliches Projektfeld",
      (b) => ({ ...b, project: { ...b.project, materials: [] } }),
    ],
    ["leerer Name", (b) => ({ ...b, project: { ...b.project, name: "" } })],
    [
      "zu langer Name",
      (b) => ({
        ...b,
        project: {
          ...b.project,
          name: "x".repeat(MAX_PROJECT_NAME_LENGTH + 1),
        },
      }),
    ],
    [
      "ungültiger Status",
      (b) => ({ ...b, project: { ...b.project, status: "deleted" } }),
    ],
    [
      "ungültige ID",
      (b) => ({ ...b, project: { ...b.project, id: "kein-uuid" } }),
    ],
    [
      "unmögliches Datum",
      (b) => ({
        ...b,
        project: { ...b.project, createdAt: "2026-02-30T12:00:00.000Z" },
      }),
    ],
    [
      "falscher Datumstyp",
      (b) => ({ ...b, project: { ...b.project, updatedAt: 42 } }),
    ],
    [
      "Zeitstempel-Reihenfolge",
      (b) => ({
        ...b,
        project: { ...b.project, updatedAt: "2000-01-01T00:00:00.000Z" },
      }),
    ],
    ["fehlende Versionsinformation", (b) => ({ ...b, appVersion: "" })],
    ["falsches Exportdatum", (b) => ({ ...b, exportedAt: "heute" })],
  ];

  it.each(invalidChanges)(
    "lehnt Schemafehler ab: %s",
    async (_name, change) => {
      const backup = await exportExample();
      const originalProjects = await repository.listProjects();
      await expect(
        repository.importProject(JSON.stringify(change(backup))),
      ).rejects.toThrow("Projektformat");
      expect(await repository.listProjects()).toEqual(originalProjects);
    },
  );

  it("begrenzt die Größe in UTF-8-Bytes vor dem Parsen", async () => {
    await expect(
      repository.importProject("ä".repeat(MAX_IMPORT_BYTES / 2 + 1)),
    ).rejects.toThrow("zu groß");
    expect(await db.projects.count()).toBe(0);
  });

  it("lässt bei einem Datenbankfehler alle bestehenden Daten unverändert", async () => {
    const backup = await exportExample();
    const before = await repository.listProjects();
    const rejectWrite = () => {
      throw new Error("Simulierter Speicherfehler");
    };
    db.projects.hook("creating", rejectWrite);
    try {
      await expect(
        repository.importProject(JSON.stringify(backup)),
      ).rejects.toThrow("Simulierter Speicherfehler");
    } finally {
      db.projects.hook("creating").unsubscribe(rejectWrite);
    }
    expect(await repository.listProjects()).toEqual(before);
  });
});

describe("Design-Einstellung", () => {
  it("verwendet standardmäßig system", async () => {
    expect(await repository.getTheme()).toBe("system");
  });

  it.each(["system", "light", "dark"] as const)(
    "speichert %s über einen DB-Neustart",
    async (theme) => {
      await repository.setTheme(theme);
      await reopenDatabase();
      expect(await repository.getTheme()).toBe(theme);
    },
  );
});

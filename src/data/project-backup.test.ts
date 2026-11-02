import "fake-indexeddb/auto";
import Dexie from "dexie";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDatabase, type AppDatabase } from "./database";
import { ProjectRepository } from "./projects";
import { MaterialRepository } from "./materials";
import { MAX_IMPORT_BYTES, type ProjectBackupV2 } from "../domain/project";

let db: AppDatabase;
let projects: ProjectRepository;
let materials: MaterialRepository;
const databases: AppDatabase[] = [];
const input = {
  name: "Eigene Testdose",
  category: "Steckdosen",
  manufacturer: "Gira",
  series: "System 55",
  color: "Reinweiß glänzend",
};

beforeEach(() => {
  db = createDatabase(`backup-test-${crypto.randomUUID()}`);
  databases.push(db);
  projects = new ProjectRepository(db);
  materials = new MaterialRepository(db);
});

afterEach(async () => {
  for (const database of databases.splice(0)) await database.delete();
});

async function sample(): Promise<ProjectBackupV2> {
  const project = await projects.createProject("Testbau");
  const article = await materials.createArticle(input);
  await materials.addQuantity(project.id, article.id, 5);
  await materials.decrement(project.id, article.id);
  return JSON.parse(
    await projects.exportProject(project.id),
  ) as ProjectBackupV2;
}

function fresh() {
  const database = createDatabase(`restore-test-${crypto.randomUUID()}`);
  databases.push(database);
  return {
    database,
    repository: new ProjectRepository(database),
    material: new MaterialRepository(database),
  };
}

describe("Schema-2-Projektsicherungen", () => {
  it("exportiert ausschließlich referenzierte Artikel inklusive deaktivierter und auf Null korrigierter Positionen", async () => {
    const backup = await sample();
    const projectId = backup.project.id;
    await materials.setActive(backup.articles[0].id, false);
    const zeroed = await materials.createArticle({
      ...input,
      name: "Nullposition",
    });
    await materials.addQuantity(projectId, zeroed.id, 1);
    await materials.setTotal(projectId, zeroed.id, 0);
    await materials.createArticle({ ...input, name: "Nicht erfasst" });
    await projects.setTheme("dark");
    const exported = JSON.parse(
      await projects.exportProject(projectId),
    ) as ProjectBackupV2;
    expect(exported.schemaVersion).toBe(2);
    expect(exported.articles).toHaveLength(2);
    expect(
      exported.articles.find((article) => article.id === backup.articles[0].id)
        ?.active,
    ).toBe(false);
    expect(exported.measurements).toHaveLength(4);
    expect(Object.keys(exported).sort()).toEqual([
      "appVersion",
      "articles",
      "exportedAt",
      "format",
      "measurements",
      "project",
      "schemaVersion",
    ]);
  });

  it("stellt eigene Artikel und Buchungen in frischer Datenbank samt Mengen und Snapshots wieder her", async () => {
    const backup = await sample();
    await materials.updateArticle(backup.articles[0].id, {
      ...input,
      name: "Katalogname geändert",
    });
    const text = await projects.exportProject(backup.project.id);
    const restored = fresh();
    const project = await restored.repository.importProject(text);
    expect(project).toEqual({ ...backup.project, name: "Testbau (Import)" });
    expect(await restored.material.getTotals(project.id)).toMatchObject([
      { quantity: 4, snapshot: { name: "Eigene Testdose" } },
    ]);
    const entries = await restored.database.measurements.toArray();
    expect(
      entries.every(
        (entry) => !backup.measurements.some((old) => old.id === entry.id),
      ),
    ).toBe(true);
    expect(
      await restored.database.articles.get(backup.articles[0].id),
    ).toMatchObject({ name: "Katalogname geändert" });
    await restored.repository.exportProject(project.id);
  });

  it("exportiert und importiert ein Aufmaß oberhalb des alten 1-MiB-Limits vollständig", async () => {
    const backup = await sample();
    const template = backup.measurements.find((entry) => entry.kind === "add")!;
    await db.measurements.bulkAdd(
      Array.from({ length: 2500 }, () => ({
        ...template,
        id: crypto.randomUUID(),
        delta: 1,
      })),
    );
    const text = await projects.exportProject(backup.project.id);
    const byteLength = new TextEncoder().encode(text).byteLength;
    expect(byteLength).toBeGreaterThan(1_048_576);
    expect(byteLength).toBeLessThan(MAX_IMPORT_BYTES);
    const restored = fresh();
    const project = await restored.repository.importProject(text);
    expect(await restored.database.measurements.count()).toBe(2502);
    expect(await restored.material.getTotals(project.id)).toMatchObject([
      { quantity: 2504 },
    ]);
  }, 20_000);

  it("erzeugt bei Artikel-ID-Konflikt eine neue Variante und verdrahtet nur importierte Referenzen um", async () => {
    const backup = await sample();
    const restored = fresh();
    const local = { ...backup.articles[0], color: "Andere Farbe" };
    await restored.database.articles.add(local);
    const project = await restored.repository.importProject(
      JSON.stringify(backup),
    );
    const totals = await restored.material.getTotals(project.id);
    expect(totals[0].articleId).not.toBe(local.id);
    expect(totals[0].snapshot.id).toBe(totals[0].articleId);
    expect(totals[0].snapshot.color).toBe("Reinweiß glänzend");
    expect(await restored.database.articles.get(local.id)).toEqual(local);
    expect(await restored.database.articles.count()).toBe(2);
    await restored.repository.exportProject(project.id);
  });

  it("übernimmt vorhandene identische Varianten, ohne lokale Favoriten und Deaktivierungen zu überschreiben", async () => {
    const backup = await sample();
    await materials.setFavorite(backup.articles[0].id, true);
    await materials.setActive(backup.articles[0].id, false);
    const before = await db.articles.get(backup.articles[0].id);
    const project = await projects.importProject(JSON.stringify(backup));
    expect(project.id).not.toBe(backup.project.id);
    expect(await db.articles.count()).toBe(1);
    expect(await db.articles.get(backup.articles[0].id)).toEqual(before);
    expect(await materials.getTotals(project.id)).toMatchObject([
      { quantity: 4 },
    ]);
    expect(await materials.getTotals(backup.project.id)).toMatchObject([
      { quantity: 4 },
    ]);
  });

  const corruptions: [string, (backup: ProjectBackupV2) => void][] = [
    [
      "fehlender Artikel",
      (backup) => {
        backup.articles = [];
      },
    ],
    [
      "falsches Projekt",
      (backup) => {
        backup.measurements[0].projectId = crypto.randomUUID();
      },
    ],
    [
      "doppelte Buchungs-ID",
      (backup) => {
        backup.measurements[1].id = backup.measurements[0].id;
      },
    ],
    [
      "doppelte Artikel-ID",
      (backup) => {
        backup.articles.push({ ...backup.articles[0] });
      },
    ],
    [
      "negative Gesamtmenge",
      (backup) => {
        const added = backup.measurements.find(
          (entry) => entry.kind === "add",
        )!;
        added.delta = -5;
        added.kind = "correction";
      },
    ],
    [
      "Nachkommastellen",
      (backup) => {
        backup.measurements[0].delta = 0.5;
      },
    ],
    [
      "unbekanntes Snapshotfeld",
      (backup) => {
        Object.assign(backup.measurements[0].articleSnapshot, {
          companyCode: "intern",
        });
      },
    ],
    [
      "widersprüchliche Snapshots",
      (backup) => {
        backup.measurements[1].articleSnapshot.name = "Anderer Artikel";
      },
    ],
    [
      "andere Ausführung",
      (backup) => {
        backup.articles[0].color = "Schwarz";
      },
    ],
    [
      "ungültige Artikelversion",
      (backup) => {
        backup.articles[0].revision = 0;
      },
    ],
    [
      "zu große Menge",
      (backup) => {
        backup.measurements[0].delta = 1_000_001;
      },
    ],
  ];

  it.each(corruptions)(
    "weist fehlerhafte Aufmaßdaten vollständig zurück: %s",
    async (_label, corrupt) => {
      const backup = await sample();
      const restored = fresh();
      corrupt(backup);
      await expect(
        restored.repository.importProject(JSON.stringify(backup)),
      ).rejects.toThrow("Projektformat");
      expect(await restored.database.projects.count()).toBe(0);
      expect(await restored.database.articles.count()).toBe(0);
      expect(await restored.database.measurements.count()).toBe(0);
    },
  );

  it("rollt bei einem Schreibfehler Projekte, neue Artikel und Buchungen gemeinsam zurück", async () => {
    const backup = await sample();
    const restored = fresh();
    restored.database.measurements.hook("creating", () => {
      throw new Error("Speicherfehler");
    });
    await expect(
      restored.repository.importProject(JSON.stringify(backup)),
    ).rejects.toThrow("Speicherfehler");
    expect(await restored.database.projects.count()).toBe(0);
    expect(await restored.database.articles.count()).toBe(0);
    expect(await restored.database.measurements.count()).toBe(0);
  });

  it("liefert CSV aus eingefrorenen Artikelangaben und der korrigierten Summe", async () => {
    const backup = await sample();
    await materials.updateArticle(backup.articles[0].id, {
      ...input,
      name: "Aktueller Katalogname",
    });
    const csv = await projects.exportProjectCsv(backup.project.id);
    expect(csv).toContain('"Eigene Testdose"');
    expect(csv).not.toContain("Aktueller Katalogname");
    expect(csv).toContain(';"Stück";4\r\n');
    expect(csv).not.toContain(backup.project.id);
  });

  it("migriert eine bestehende Version-1-Datenbank und importiert deren altes JSON ohne Datenverlust", async () => {
    const name = `legacy-backup-${crypto.randomUUID()}`;
    const old = new Dexie(name);
    old.version(1).stores({ projects: "id,status,updatedAt", settings: "key" });
    const project = {
      id: crypto.randomUUID(),
      name: "Altprojekt",
      status: "active",
      createdAt: "2026-11-01T10:00:00.000Z",
      updatedAt: "2026-11-01T10:00:00.000Z",
      schemaVersion: 1,
    };
    await old.table("projects").add(project);
    await old.table("settings").put({ key: "theme", value: "dark" });
    old.close();
    const migrated = createDatabase(name);
    databases.push(migrated);
    const repository = new ProjectRepository(migrated);
    expect(await repository.getProject(project.id)).toEqual(project);
    expect(await repository.getTheme()).toBe("dark");
    const legacy = {
      format: "baustellenaufmass-project",
      schemaVersion: 1,
      appVersion: "0.1.1",
      exportedAt: "2026-11-01T12:00:00.000Z",
      project,
    };
    const imported = await repository.importProject(JSON.stringify(legacy));
    expect(imported.name).toBe("Altprojekt (Import)");
    expect(await migrated.measurements.count()).toBe(0);
    expect(await repository.getProject(project.id)).toEqual(project);
  });
});

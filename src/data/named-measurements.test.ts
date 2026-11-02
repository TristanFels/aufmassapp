import "fake-indexeddb/auto";
import Dexie from "dexie";
import { afterEach, beforeEach, expect, it } from "vitest";
import { createDatabase, type AppDatabase } from "./database";
import { ProjectRepository } from "./projects";
import { MaterialRepository } from "./materials";
import { MeasurementRepository } from "./named-measurements";
import { articleSnapshot, MAX_QUANTITY } from "../domain/material";
import type { ProjectBackupV3 } from "../domain/project";

let db: AppDatabase;
let projects: ProjectRepository;
let materials: MaterialRepository;
let sheets: MeasurementRepository;
const extra: Dexie[] = [];
const input = {
  name: "Testdose",
  category: "Elektro",
  manufacturer: "",
  series: "",
  color: "",
};
beforeEach(() => {
  db = createDatabase(`named-${crypto.randomUUID()}`);
  projects = new ProjectRepository(db);
  materials = new MaterialRepository(db);
  sheets = new MeasurementRepository(db);
});
afterEach(async () => {
  await db.delete();
  for (const d of extra.splice(0)) await d.delete();
});

async function setup() {
  const project = await projects.createProject("Testbau (Import)");
  const first = await sheets.save(project.id, "Erstes", "Elektro");
  const second = await sheets.save(project.id, "Zweites");
  const article = await materials.createArticle(input);
  return { project, first, second, article };
}

it("trennt Aufmaße und Varianten, korrigiert lokal und summiert jede Buchung genau einmal", async () => {
  const { project, first, second, article } = await setup();
  const other = await materials.createArticle({ ...input, color: "Schwarz" });
  await materials.addQuantity(first.id, article.id, 3);
  await materials.addQuantity(second.id, article.id, 7);
  await materials.addQuantity(first.id, other.id, 2);
  await materials.setTotal(first.id, article.id, 1);
  expect(await materials.getMeasurementTotals(first.id)).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ articleId: article.id, quantity: 1 }),
      expect.objectContaining({ articleId: other.id, quantity: 2 }),
    ]),
  );
  expect(await materials.getMeasurementTotals(second.id)).toMatchObject([
    { quantity: 7 },
  ]);
  expect(await materials.getTotals(project.id)).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ articleId: article.id, quantity: 8 }),
      expect.objectContaining({ articleId: other.id, quantity: 2 }),
    ]),
  );
  expect(await sheets.exportCsv(first.id)).toContain(';"Stück";1\r\n');
  expect(await sheets.exportCsv(second.id)).toContain(';"Stück";7\r\n');
  expect(await projects.exportProjectCsv(project.id)).toContain(
    ';"Stück";8\r\n',
  );
  await expect(materials.setTotal(first.id, article.id, -1)).rejects.toThrow();
});

it("erhält projektweit eingefrorene Snapshots auch nach Katalogpflege zwischen zwei Aufmaßen", async () => {
  const { project, first, second, article } = await setup();
  await materials.addQuantity(first.id, article.id, 2);
  await materials.updateArticle(article.id, { ...input, name: "Neuer Name" });
  await materials.addQuantity(second.id, article.id, 3);
  expect(await materials.getTotals(project.id)).toMatchObject([
    { quantity: 5, snapshot: { name: input.name } },
  ]);
  await projects.exportProject(project.id);
});

it("erlaubt getrennte Mengenlimits je Aufmaß und sichere größere Projektsummen", async () => {
  const { project, first, second, article } = await setup();
  await materials.addQuantity(first.id, article.id, MAX_QUANTITY);
  await materials.addQuantity(second.id, article.id, MAX_QUANTITY);
  expect(await materials.getTotals(project.id)).toMatchObject([
    { quantity: MAX_QUANTITY * 2 },
  ]);
  await expect(
    materials.addQuantity(first.id, article.id, 1),
  ).rejects.toThrow();
  await projects.exportProject(project.id);
});

it("speichert Namen/Kategorien und leere Aufmaße über Neustart und vollständigen JSON-Roundtrip", async () => {
  const { project, first, second, article } = await setup();
  await materials.addQuantity(first.id, article.id, 6);
  await materials.setTotal(first.id, article.id, 4);
  await sheets.save(project.id, "  Umbenannt  ", "  Prüfung  ", first.id);
  db.close();
  await db.open();
  expect(await sheets.list(project.id)).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: first.id,
        name: "Umbenannt",
        category: "Prüfung",
      }),
    ]),
  );
  const text = await projects.exportProject(project.id);
  const target = createDatabase(`restore-${crypto.randomUUID()}`);
  extra.push(target);
  const restored = await new ProjectRepository(target).importProject(text);
  const restoredSheets = await new MeasurementRepository(target).list(
    restored.id,
  );
  expect(restoredSheets).toHaveLength(2);
  expect(restoredSheets.map((s) => s.id)).not.toContain(first.id);
  expect(restoredSheets.map((s) => s.name).sort()).toEqual([
    "Umbenannt",
    second.name,
  ]);
  expect(
    await new MaterialRepository(target).getTotals(restored.id),
  ).toMatchObject([{ quantity: 4 }]);
  for (const entry of await target.measurements.toArray()) {
    expect(
      restoredSheets.some(
        (s) => s.id === entry.measurementId && s.projectId === entry.projectId,
      ),
    ).toBe(true);
  }
});

it("verhindert Änderungen in archivierten Projekten, falsche Projektzuordnungen und ungültige Namen", async () => {
  const { project, first, article } = await setup();
  const other = await projects.createProject("Andere Baustelle");
  await expect(sheets.save(other.id, "Name", "", first.id)).rejects.toThrow(
    "nicht gefunden",
  );
  await expect(sheets.save(project.id, "  ")).rejects.toThrow();
  await expect(
    sheets.save(project.id, "Name", "x".repeat(81)),
  ).rejects.toThrow();
  await projects.setProjectStatus(project.id, "archived");
  await expect(sheets.save(project.id, "Weiteres")).rejects.toThrow(
    "archiviert",
  );
  await expect(sheets.save(project.id, "Neu", "", first.id)).rejects.toThrow(
    "archiviert",
  );
  await expect(materials.addQuantity(first.id, article.id, 2)).rejects.toThrow(
    "archiviert",
  );
});

it.each(["missing", "foreign", "duplicate", "negative-scope", "extra-field"])(
  "weist fehlerhafte Aufmaßreferenzen atomar ab: %s",
  async (mode) => {
    const { project, first, second, article } = await setup();
    await materials.addQuantity(first.id, article.id, 3);
    await materials.addQuantity(second.id, article.id, 7);
    const backup = JSON.parse(
      await projects.exportProject(project.id),
    ) as ProjectBackupV3;
    if (mode === "missing") delete backup.measurements[0].measurementId;
    if (mode === "foreign")
      backup.namedMeasurements[0].projectId = crypto.randomUUID();
    if (mode === "duplicate")
      backup.namedMeasurements[1].id = backup.namedMeasurements[0].id;
    if (mode === "negative-scope") {
      // Positive project total must not hide a negative individual scope.
      backup.measurements.find((e) => e.measurementId === first.id)!.delta = -2;
      backup.measurements.find((e) => e.measurementId === first.id)!.kind =
        "correction";
    }
    if (mode === "extra-field")
      Object.assign(backup.namedMeasurements[0], { rooms: [] });
    const before = await projects.exportProject(project.id);
    await expect(
      projects.importProject(JSON.stringify(backup)),
    ).rejects.toThrow("Projektformat");
    expect(await db.projects.count()).toBe(1);
    expect(await db.namedMeasurements.count()).toBe(2);
    expect(
      JSON.parse(await projects.exportProject(project.id)).measurements,
    ).toEqual(JSON.parse(before).measurements);
  },
);

it("importiert echtes Schema 2 in Bisheriges Aufmaß und rollt einen Schreibfehler samt Aufmaßen zurück", async () => {
  const { project, first, article } = await setup();
  await materials.addQuantity(first.id, article.id, 4);
  const backup = JSON.parse(await projects.exportProject(project.id));
  backup.schemaVersion = 2;
  delete backup.namedMeasurements;
  for (const entry of backup.measurements) delete entry.measurementId;
  const target = createDatabase(`legacy-import-${crypto.randomUUID()}`);
  extra.push(target);
  const repository = new ProjectRepository(target);
  const restored = await repository.importProject(JSON.stringify(backup));
  expect(
    await new MeasurementRepository(target).list(restored.id),
  ).toMatchObject([{ name: "Bisheriges Aufmaß" }]);
  expect(
    await new MaterialRepository(target).getTotals(restored.id),
  ).toMatchObject([{ quantity: 4 }]);
  const before = await target.namedMeasurements.toArray();
  const fail = () => {
    throw new Error("Speicherfehler");
  };
  target.projects.hook("creating", fail);
  await expect(
    repository.importProject(JSON.stringify(backup)),
  ).rejects.toThrow("Speicherfehler");
  target.projects.hook("creating").unsubscribe(fail);
  expect(await target.namedMeasurements.toArray()).toEqual(before);
  expect(await target.measurements.count()).toBe(1);
  expect(await target.projects.count()).toBe(1);
});

async function legacy(corrupt = false) {
  const name = `v2-${crypto.randomUUID()}`;
  const old = new Dexie(name);
  extra.push(old);
  old
    .version(2)
    .stores({
      projects: "id,status,updatedAt",
      settings: "key",
      articles: "id,active,category",
      measurements: "id,projectId,[projectId+articleId],articleId",
    });
  const time = "2026-11-01T00:00:00.000Z";
  const project = {
    id: crypto.randomUUID(),
    name: "Baustelle (Import 2)",
    status: "active",
    schemaVersion: 1,
    createdAt: time,
    updatedAt: time,
  };
  const article = {
    ...input,
    id: crypto.randomUUID(),
    active: false,
    favorite: true,
    unit: "Stück" as const,
    revision: 2,
    createdAt: time,
    updatedAt: time,
  };
  const entries = [5, -2].map((delta) => ({
    id: crypto.randomUUID(),
    projectId: project.id,
    articleId: article.id,
    articleSnapshot: articleSnapshot(article),
    delta,
    kind: delta > 0 ? "add" : "correction",
    createdAt: time,
  }));
  await old.table("projects").add(project);
  await old.table("articles").add(article);
  await old.table("measurements").bulkAdd(entries);
  if (corrupt) {
    // A second invalid project ensures the first one's writes must roll back, too.
    await old
      .table("measurements")
      .add({
        ...entries[0],
        id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
        projectId: crypto.randomUUID(),
      });
  }
  const settings = [
    { key: "theme", value: "dark" },
    { key: "lastProjectId", value: project.id },
  ];
  await old.table("settings").bulkAdd(settings);
  const originalEntries = await old.table("measurements").toArray();
  old.close();
  const upgraded = createDatabase(name);
  extra.push(upgraded);
  return {
    upgraded,
    old,
    name,
    project,
    article,
    entries: originalEntries,
    settings,
  };
}

it("migriert reale Version 2 verlustfrei, erhält IDs/Favoriten/Einstellungen und wiederholt die Migration nicht", async () => {
  const fixture = await legacy();
  const { upgraded, project, article, settings, entries } = fixture;
  await upgraded.open();
  expect(upgraded.verno).toBe(3);
  expect(await upgraded.projects.get(project.id)).toEqual(project);
  expect(await upgraded.articles.get(article.id)).toEqual(article);
  expect(await upgraded.settings.toArray()).toEqual(
    [...settings].sort((a, b) => a.key.localeCompare(b.key)),
  );
  expect(
    await new MaterialRepository(upgraded).getTotals(project.id),
  ).toMatchObject([{ quantity: 3 }]);
  const named = await upgraded.namedMeasurements.toArray();
  expect(named).toMatchObject([
    { projectId: project.id, name: "Bisheriges Aufmaß" },
  ]);
  expect(await upgraded.measurements.toArray()).toEqual(
    entries.map((entry) => ({ ...entry, measurementId: named[0].id })),
  );
  upgraded.close();
  await upgraded.open();
  expect(await upgraded.namedMeasurements.toArray()).toEqual(named);
  await new MaterialRepository(upgraded).ensureSeed();
  expect(await upgraded.articles.get(article.id)).toEqual(article);
});

it("rollt fehlerhafte Migration inklusive Schema und vorheriger Projektzuordnungen vollständig zurück", async () => {
  const { upgraded, old, entries, project, article, settings } =
    await legacy(true);
  await expect(upgraded.open()).rejects.toThrow("Migration abgebrochen");
  upgraded.close();
  await old.open();
  expect(old.verno).toBe(2);
  expect(old.tables.map((t) => t.name)).not.toContain("namedMeasurements");
  expect(await old.table("measurements").toArray()).toEqual(entries);
  expect(await old.table("projects").get(project.id)).toEqual(project);
  expect(await old.table("articles").get(article.id)).toEqual(article);
  expect(await old.table("settings").toArray()).toEqual(
    [...settings].sort((a, b) => a.key.localeCompare(b.key)),
  );
  old.close();
});

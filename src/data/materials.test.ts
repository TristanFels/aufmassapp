import { MeasurementRepository } from "./named-measurements";
import "fake-indexeddb/auto";
import Dexie from "dexie";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDatabase, type AppDatabase } from "./database";
import { MaterialRepository } from "./materials";
import { ProjectRepository } from "./projects";
import { STANDARD_ARTICLES } from "./seed";
import {
  MAX_QUANTITY,
  aggregateEntries,
  articleSnapshot,
  isArticle,
  isArticleSnapshot,
  isMeasurementEntry,
  sameArticleSnapshot,
  type ArticleInput,
} from "../domain/material";

let db: AppDatabase;
let materials: MaterialRepository;
let projects: ProjectRepository;
const input: ArticleInput = {
  name: "Testartikel",
  category: "Testkategorie",
  manufacturer: "Testhersteller",
  series: "Testserie",
  color: "Testfarbe",
};

beforeEach(() => {
  db = createDatabase(`test-materials-${crypto.randomUUID()}`);
  materials = new MaterialRepository(db);
  projects = new ProjectRepository(db);
});

afterEach(async () => {
  await db.delete();
});

async function setup() {
  return {
    project: await projects.createProject("Testprojekt"),
    article: await materials.createArticle(input),
  };
}

async function reopen() {
  const name = db.name;
  db.close();
  db = createDatabase(name);
  materials = new MaterialRepository(db);
  projects = new ProjectRepository(db);
}

describe("Katalog und wiederholbare Startdaten", () => {
  it("legt genau die 22 angekündigten Artikel ohne Projektmengen an", async () => {
    await materials.ensureSeed();
    const articles = await materials.listArticles();
    expect(articles).toHaveLength(22);
    expect(articles.every(isArticle)).toBe(true);
    expect(new Set(articles.map((a) => a.id)).size).toBe(22);
    expect(articles.map((a) => a.name)).toEqual(
      expect.arrayContaining([
        "Ausschalter-Einsatz",
        "Wippe",
        "Multimedia-Durchgangsdose",
        "SAT-Stichdose",
        "SAT-Enddose",
      ]),
    );
    expect(articles.filter((a) => a.manufacturer === "Gira")).toHaveLength(20);
    expect(
      articles.find((a) => a.name === "Tellerleuchte Ø mindestens 25 cm"),
    ).toMatchObject({ manufacturer: "", series: "", color: "" });
    expect(await db.measurements.count()).toBe(0);
  });

  it("erhält Bearbeitungen, Deaktivierung, Favoriten und eigene Artikel beim wiederholten Start", async () => {
    await materials.ensureSeed();
    const original = STANDARD_ARTICLES[0];
    const changed = await materials.updateArticle(original.id, {
      ...original,
      name: "Mein Rahmen",
    });
    await materials.setActive(changed.id, false);
    await materials.setFavorite(changed.id, true);
    const custom = await materials.createArticle(input);
    await reopen();
    await Promise.all([materials.ensureSeed(), materials.ensureSeed()]);
    expect(await materials.listArticles()).toHaveLength(23);
    expect(await db.articles.get(changed.id)).toMatchObject({
      name: "Mein Rahmen",
      active: false,
      favorite: true,
      revision: 2,
    });
    expect(await db.articles.get(custom.id)).toEqual(custom);
  });

  it("ergänzt fehlende Standardartikel ohne bestehende Datensätze zu ändern", async () => {
    await db.articles.add({ ...STANDARD_ARTICLES[0], name: "Lokal angepasst" });
    await materials.ensureSeed();
    expect(await db.articles.count()).toBe(22);
    expect(await db.articles.get(STANDARD_ARTICLES[0].id)).toMatchObject({
      name: "Lokal angepasst",
    });
  });

  it("speichert eigene Artikel inklusive bereinigter Felder und Bearbeitungsrevision", async () => {
    const first = await materials.createArticle({
      ...input,
      name: "  Eigener Artikel  ",
      category: "  Elektro  ",
    });
    expect(first).toMatchObject({
      name: "Eigener Artikel",
      category: "Elektro",
      active: true,
      favorite: false,
      revision: 1,
      unit: "Stück",
    });
    const changed = await materials.updateArticle(first.id, {
      ...input,
      manufacturer: "Andere Firma",
    });
    await reopen();
    expect(await db.articles.get(first.id)).toEqual(changed);
    expect(changed).toMatchObject({
      id: first.id,
      createdAt: first.createdAt,
      revision: 2,
      manufacturer: "Andere Firma",
    });
  });

  it.each([
    { name: " " },
    { category: "" },
    { name: "x".repeat(121) },
    { color: "x".repeat(81) },
    { name: "Zeile\nZwei" },
  ])("weist ungültige Artikelangaben zurück: %o", async (patch) => {
    await expect(
      materials.createArticle({ ...input, ...patch }),
    ).rejects.toThrow();
    expect(await db.articles.count()).toBe(0);
  });

  it("meldet nicht vorhandene Artikel und lässt den Katalog unverändert", async () => {
    await expect(
      materials.updateArticle(crypto.randomUUID(), input),
    ).rejects.toThrow("nicht gefunden");
    await expect(
      materials.setActive(crypto.randomUUID(), true),
    ).rejects.toThrow("nicht gefunden");
    await expect(
      materials.setFavorite(crypto.randomUUID(), true),
    ).rejects.toThrow("nicht gefunden");
    expect(await db.articles.count()).toBe(0);
  });
});

describe("Buchungen und Mengensummen", () => {
  it("addiert einzelne Buchungen, speichert eine Korrekturbuchung und erhält den Stand nach Neustart", async () => {
    const { project, article } = await setup();
    await materials.addQuantity((await sheet(project.id)).id, article.id, 1);
    await materials.addQuantity((await sheet(project.id)).id, article.id, 4);
    await materials.setTotal((await sheet(project.id)).id, article.id, 3);
    await materials.decrement((await sheet(project.id)).id, article.id);
    await reopen();
    expect(await materials.getTotals(project.id)).toEqual([
      {
        articleId: article.id,
        snapshot: articleSnapshot(article),
        quantity: 2,
      },
    ]);
    const entries = await db.measurements
      .where("projectId")
      .equals(project.id)
      .toArray();
    expect(entries).toHaveLength(4);
    expect(entries.every(isMeasurementEntry)).toBe(true);
    expect(
      entries
        .filter((e) => e.kind === "correction")
        .map((e) => e.delta)
        .sort((a, b) => a - b),
    ).toEqual([-2, -1]);
    expect(await projects.getProject(project.id)).toMatchObject({
      updatedAt: expect.any(String),
    });
  });

  it("setzt die Gesamtsumme statt sie zur bestehenden Summe zu addieren und speichert positive Korrekturen", async () => {
    const { project, article } = await setup();
    await materials.addQuantity((await sheet(project.id)).id, article.id, 2);
    await materials.setTotal((await sheet(project.id)).id, article.id, 8);
    expect((await materials.getTotals(project.id))[0].quantity).toBe(8);
    expect(
      (await db.measurements.toArray()).find((e) => e.kind === "correction"),
    ).toMatchObject({ delta: 6 });
    await materials.setTotal((await sheet(project.id)).id, article.id, 8);
    expect(await db.measurements.count()).toBe(2);
    await materials.setTotal((await sheet(project.id)).id, article.id, 0);
    expect((await materials.getTotals(project.id))[0].quantity).toBe(0);
  });

  it("führt gleich benannte reale Varianten und verschiedene Projekte nicht zusammen", async () => {
    const { project, article } = await setup();
    const other = await materials.createArticle({
      ...input,
      color: "Andere Farbe",
    });
    const secondProject = await projects.createProject("Zweite Testbaustelle");
    await materials.addQuantity((await sheet(project.id)).id, article.id, 2);
    await materials.addQuantity((await sheet(project.id)).id, other.id, 7);
    await materials.addQuantity(
      (await sheet(secondProject.id)).id,
      article.id,
      4,
    );
    expect(
      (await materials.getTotals(project.id)).map((t) => t.quantity).sort(),
    ).toEqual([2, 7]);
    expect((await materials.getTotals(secondProject.id))[0].quantity).toBe(4);
  });

  it("verhindert negative Mengen und erzeugt bei Fehlern keine Teilbuchung", async () => {
    const { project, article } = await setup();
    await expect(
      materials.decrement((await sheet(project.id)).id, article.id),
    ).rejects.toThrow();
    expect(await db.measurements.count()).toBe(0);
    await materials.addQuantity((await sheet(project.id)).id, article.id, 1);
    await materials.decrement((await sheet(project.id)).id, article.id);
    const before = await db.measurements.toArray();
    await expect(
      materials.decrement((await sheet(project.id)).id, article.id),
    ).rejects.toThrow();
    expect(await db.measurements.toArray()).toEqual(before);
    expect((await materials.getTotals(project.id))[0].quantity).toBe(0);
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, MAX_QUANTITY + 1])(
    "weist ungültige zusätzliche Menge %s zurück",
    async (quantity) => {
      const { project, article } = await setup();
      await expect(
        materials.addQuantity(
          (await sheet(project.id)).id,
          article.id,
          quantity,
        ),
      ).rejects.toThrow();
      expect(await db.measurements.count()).toBe(0);
    },
  );

  it.each([-1, 0.5, Number.NaN, MAX_QUANTITY + 1])(
    "weist ungültige Gesamtsumme %s zurück",
    async (quantity) => {
      const { project, article } = await setup();
      await expect(
        materials.setTotal((await sheet(project.id)).id, article.id, quantity),
      ).rejects.toThrow();
      expect(await db.measurements.count()).toBe(0);
    },
  );

  it("begrenzt auch die Summe gültiger Einzelbuchungen", async () => {
    const { project, article } = await setup();
    await materials.addQuantity(
      (await sheet(project.id)).id,
      article.id,
      MAX_QUANTITY,
    );
    await expect(
      materials.addQuantity((await sheet(project.id)).id, article.id, 1),
    ).rejects.toThrow();
    expect((await materials.getTotals(project.id))[0].quantity).toBe(
      MAX_QUANTITY,
    );
    expect(await db.measurements.count()).toBe(1);
  });

  it("verliert bei paralleler Erfassung keine Mengen und verhindert konkurrierende Unterläufe", async () => {
    const { project, article } = await setup();
    await sheet(project.id);
    await Promise.all(
      Array.from({ length: 6 }, async () =>
        materials.addQuantity((await sheet(project.id)).id, article.id, 1),
      ),
    );
    expect((await materials.getTotals(project.id))[0].quantity).toBe(6);
    await materials.setTotal((await sheet(project.id)).id, article.id, 1);
    const outcomes = await Promise.allSettled([
      materials.decrement((await sheet(project.id)).id, article.id),
      materials.decrement((await sheet(project.id)).id, article.id),
    ]);
    expect(
      outcomes.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect((await materials.getTotals(project.id))[0].quantity).toBe(0);
  });

  it("deaktivierte Artikel behalten ihre Summen und erlauben nur bestehende Mengen zu reduzieren", async () => {
    const { project, article } = await setup();
    await materials.addQuantity((await sheet(project.id)).id, article.id, 4);
    await materials.setActive(article.id, false);
    expect((await materials.getTotals(project.id))[0].quantity).toBe(4);
    await expect(
      materials.addQuantity((await sheet(project.id)).id, article.id, 1),
    ).rejects.toThrow("deaktiviert");
    await expect(
      materials.setTotal((await sheet(project.id)).id, article.id, 5),
    ).rejects.toThrow("deaktiviert");
    await materials.decrement((await sheet(project.id)).id, article.id);
    await materials.setTotal((await sheet(project.id)).id, article.id, 1);
    expect((await materials.getTotals(project.id))[0].quantity).toBe(1);
    await materials.setActive(article.id, true);
    await materials.addQuantity((await sheet(project.id)).id, article.id, 2);
    expect((await materials.getTotals(project.id))[0].quantity).toBe(3);
  });

  it("archivierte Projekte und unbekannte Referenzen erlauben keine Erfassung", async () => {
    const { project, article } = await setup();
    await sheet(project.id);
    await projects.setProjectStatus(project.id, "archived");
    await expect(
      materials.addQuantity((await sheet(project.id)).id, article.id, 1),
    ).rejects.toThrow("archiviert");
    await expect(
      materials.setTotal((await sheet(project.id)).id, article.id, 3),
    ).rejects.toThrow("archiviert");
    await expect(
      materials.addQuantity(crypto.randomUUID(), article.id, 1),
    ).rejects.toThrow("Projekt");
    await projects.setProjectStatus(project.id, "active");
    await expect(
      materials.addQuantity(
        (await sheet(project.id)).id,
        crypto.randomUUID(),
        1,
      ),
    ).rejects.toThrow("Artikel");
    expect(await db.measurements.count()).toBe(0);
  });

  it("friert die erste Artikelauflösung je Projekt ein, ohne spätere Katalogpflege in alte Daten zu übertragen", async () => {
    const { project, article } = await setup();
    await materials.addQuantity((await sheet(project.id)).id, article.id, 2);
    const changed = await materials.updateArticle(article.id, {
      ...input,
      name: "Neue Bezeichnung",
      category: "Andere Kategorie",
    });
    await materials.addQuantity((await sheet(project.id)).id, article.id, 1);
    await materials.setTotal((await sheet(project.id)).id, article.id, 2);
    const total = (await materials.getTotals(project.id))[0];
    expect(total).toMatchObject({
      quantity: 2,
      snapshot: { name: article.name, category: article.category, revision: 1 },
    });
    const secondProject = await projects.createProject("Zweites Projekt");
    await materials.addQuantity(
      (await sheet(secondProject.id)).id,
      article.id,
      1,
    );
    expect((await materials.getTotals(secondProject.id))[0].snapshot).toEqual(
      articleSnapshot(changed),
    );
    for (const patch of [
      { manufacturer: "Andere Firma" },
      { series: "Andere Serie" },
      { color: "Andere Farbe" },
    ]) {
      await expect(
        materials.updateArticle(article.id, { ...changed, ...patch }),
      ).rejects.toThrow("neuen Artikel");
    }
    expect(await db.articles.get(article.id)).toEqual(changed);
  });

  it("rollt eine Mengenänderung vollständig zurück, wenn das Projekt nicht aktualisiert werden kann", async () => {
    const { project, article } = await setup();
    await sheet(project.id);
    const beforeProject = await projects.getProject(project.id);
    const fail = () => {
      throw new Error("Simulierter Speicherfehler");
    };
    db.projects.hook("updating", fail);
    try {
      await expect(
        materials.addQuantity((await sheet(project.id)).id, article.id, 3),
      ).rejects.toThrow("Speicherfehler");
    } finally {
      db.projects.hook("updating").unsubscribe(fail);
    }
    expect(await db.measurements.count()).toBe(0);
    expect(await projects.getProject(project.id)).toEqual(beforeProject);
  });
});

describe("Additive Migration und strikte Materialvalidierung", () => {
  it("öffnet eine echte Version-1-Datenbank und erhält Projekte sowie Einstellungen unverändert", async () => {
    const name = db.name;
    await db.delete();
    const old = new Dexie(name);
    old.version(1).stores({ projects: "id,status,updatedAt", settings: "key" });
    const project = {
      id: crypto.randomUUID(),
      name: "Altes Testprojekt",
      status: "archived",
      schemaVersion: 1,
      createdAt: "2026-11-01T00:00:00.000Z",
      updatedAt: "2026-11-01T01:00:00.000Z",
    };
    await old.table("projects").add(project);
    await old.table("settings").bulkAdd([
      { key: "theme", value: "dark" },
      { key: "lastProjectId", value: project.id },
    ]);
    old.close();
    db = createDatabase(name);
    materials = new MaterialRepository(db);
    projects = new ProjectRepository(db);
    await materials.ensureSeed();
    expect(db.verno).toBe(3);
    expect(await projects.getProject(project.id)).toEqual(project);
    expect(await projects.getTheme()).toBe("dark");
    expect(await projects.getLastProject()).toEqual(project);
    expect(await db.articles.count()).toBe(22);
    expect(await db.measurements.count()).toBe(0);
  });

  it("validiert vollständige Artikel und Snapshots und lehnt unbekannte Felder ab", async () => {
    const article = await materials.createArticle(input);
    expect(isArticle(article)).toBe(true);
    expect(isArticle({ ...article, protectedCode: "nicht übernehmen" })).toBe(
      false,
    );
    expect(isArticleSnapshot(articleSnapshot(article))).toBe(true);
    expect(
      isArticleSnapshot({ ...articleSnapshot(article), revision: 0 }),
    ).toBe(false);
    const reordered = Object.fromEntries(
      Object.entries(articleSnapshot(article)).reverse(),
    );
    expect(
      sameArticleSnapshot(
        articleSnapshot(article),
        reordered as unknown as ReturnType<typeof articleSnapshot>,
      ),
    ).toBe(true);
  });

  it("lehnt fehlerhafte Buchungen und widersprüchliche Snapshots ab", async () => {
    const { project, article } = await setup();
    await materials.addQuantity((await sheet(project.id)).id, article.id, 1);
    const entry = (await db.measurements.toArray())[0];
    expect(isMeasurementEntry({ ...entry, delta: -1, kind: "add" })).toBe(
      false,
    );
    expect(isMeasurementEntry({ ...entry, delta: 0 })).toBe(false);
    expect(
      isMeasurementEntry({ ...entry, articleId: crypto.randomUUID() }),
    ).toBe(false);
    expect(
      isMeasurementEntry({ ...entry, createdAt: "2026-02-30T00:00:00.000Z" }),
    ).toBe(false);
    expect(() =>
      aggregateEntries([
        entry,
        {
          ...entry,
          articleSnapshot: {
            ...entry.articleSnapshot,
            name: "Anderes Material",
          },
        },
      ]),
    ).toThrow("Widersprüchliche");
  });
});

async function sheet(projectId: string) {
  const repository = new MeasurementRepository(db);
  return (
    (await repository.list(projectId))[0] ??
    (await repository.save(projectId, "Testaufmaß"))
  );
}

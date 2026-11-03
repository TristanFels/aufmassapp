import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";

const base = process.env.VITE_BASE_PATH ?? "/aufmassapp/";

async function createProject(page: Page, name: string): Promise<string> {
  await page.goto(`${base}#/projects`);
  await page
    .getByRole("button", { name: "Projekt anlegen", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Projektname", exact: true })
    .fill(name);
  await page
    .getByRole("button", { name: "Projekt erstellen", exact: true })
    .click();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  await page
    .getByRole("link", { name: "Aufmaß erfassen", exact: true })
    .click();
  await createSheet(page, "Individuell");
  return page.url();
}

async function createArticle(
  page: Page,
  name: string,
  color = "Reinweiß glänzend",
  category = "Testmaterial",
): Promise<void> {
  await page.goto(`${base}#/articles`);
  await page
    .getByRole("button", { name: "Artikel anlegen", exact: true })
    .click();
  await page.getByLabel("Artikelname", { exact: true }).fill(name);
  await page.getByLabel("Kategorie", { exact: true }).fill(category);
  await page.getByLabel("Hersteller", { exact: true }).fill("Gira");
  await page.getByLabel("Serie", { exact: true }).fill("System 55");
  await page.getByLabel("Farbe", { exact: true }).fill(color);
  await page
    .getByRole("button", { name: "Artikel speichern", exact: true })
    .click();
  await expect(
    page
      .getByRole("list", { name: "Artikelkatalog", exact: true })
      .getByRole("listitem", { name, exact: true })
      .filter({ hasText: color }),
  ).toBeVisible();
}

function materialRow(page: Page, name: string) {
  return page
    .getByRole("region", { name: "Materialliste", exact: true })
    .getByRole("listitem", { name, exact: true });
}

async function createSheet(page: Page, name: string) {
  await page.getByLabel("Aufmaßname", { exact: true }).fill(name);
  await page
    .getByRole("button", { name: "Aufmaß erstellen", exact: true })
    .click();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
}
async function add(
  page: Page,
  name: string,
  quantity: string,
  variant?: string,
) {
  await page.getByLabel("Aufmaßartikel suchen", { exact: true }).fill(name);
  const picker = page.getByRole("list", { name: "Aufmaßartikel", exact: true });
  await picker
    .getByRole("button")
    .filter({ hasText: variant ?? name })
    .click();
  await page.getByLabel("Weitere Stückzahl", { exact: true }).fill(quantity);
  await page
    .getByRole("button", { name: "Menge hinzufügen", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Menge hinzufügen", exact: true }),
  ).toBeEnabled();
}
async function setTotal(page: Page, name: string, quantity: string) {
  await page
    .getByRole("button", {
      name: `Gesamtmenge bearbeiten: ${name}`,
      exact: true,
    })
    .click();
  await page.getByLabel("Neue Gesamtmenge", { exact: true }).fill(quantity);
  await page
    .getByRole("button", { name: "Gesamtmenge setzen", exact: true })
    .click();
  await expect(
    page.getByLabel("Neue Gesamtmenge", { exact: true }),
  ).toHaveCount(0);
}

test("Startkatalog enthält 22 Artikel einschließlich SAT und startet Projekte ohne Vorgabemengen", async ({
  page,
}) => {
  await page.goto(`${base}#/articles`);
  const catalog = page.getByRole("list", {
    name: "Artikelkatalog",
    exact: true,
  });
  await expect(catalog.getByRole("listitem")).toHaveCount(22);
  for (const name of [
    "Multimedia-Durchgangsdose",
    "SAT-Stichdose",
    "SAT-Enddose",
  ]) {
    await expect(
      catalog.getByRole("listitem", { name, exact: true }),
    ).toBeVisible();
  }
  await createProject(page, "Leere Testbaustelle");
  await expect(
    page
      .getByRole("region", { name: "Materialliste", exact: true })
      .getByRole("listitem"),
  ).toHaveCount(0);
});

test("Kategorienfilter bleibt mit langen Kategorien mobil bedienbar und innerhalb des Panels", async ({ page }) => {
  const category = "LangeKommunikationsKategorie".repeat(4).slice(0, 80);
  await createArticle(page, "Filterprüfartikel", "Reinweiß glänzend", category);
  await createProject(page, "Filterprüfung");
  const select = page.getByLabel("Artikelkategorie filtern", { exact: true });
  await select.selectOption(category);
  await expect(page.getByRole("list", { name: "Aufmaßartikel", exact: true }).getByRole("button")).toHaveCount(1);
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    for (const colorScheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme });
      const geometry = await select.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        const panel = element.closest(".panel")!;
        const style = getComputedStyle(element);
        const panelStyle = getComputedStyle(panel);
        return {
          height: bounds.height,
          fontSize: parseFloat(style.fontSize),
          width: bounds.width,
          available: panel.clientWidth - parseFloat(panelStyle.paddingLeft) - parseFloat(panelStyle.paddingRight),
          overflow: document.documentElement.scrollWidth > window.innerWidth,
        };
      });
      expect(geometry.height).toBeGreaterThanOrEqual(48);
      expect(geometry.fontSize).toBeGreaterThanOrEqual(16);
      expect(Math.abs(geometry.width - geometry.available)).toBeLessThanOrEqual(1);
      expect(geometry.overflow).toBe(false);
    }
  }
});

test("Bestehende Version-0.1-Projekte, Design und Schnellzugriff bleiben beim Datenbank-Upgrade erhalten", async ({
  page,
}) => {
  // A static same-origin asset lets us prepare an old database before the app opens it.
  await page.goto(`${base}icons/icon-192.png`);
  const legacyId = "19c07f74-9ec5-4e5b-bf2d-e9f58366293c";
  await page.evaluate(async (id) => {
    await new Promise<void>((resolve, reject) => {
      // Dexie maps logical version 1 to native IndexedDB version 10.
      const request = indexedDB.open("baustellenaufmass", 10);
      request.onupgradeneeded = () => {
        const projects = request.result.createObjectStore("projects", {
          keyPath: "id",
        });
        projects.createIndex("status", "status");
        projects.createIndex("updatedAt", "updatedAt");
        request.result.createObjectStore("settings", { keyPath: "key" });
      };
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction(
          ["projects", "settings"],
          "readwrite",
        );
        transaction.objectStore("projects").add({
          id,
          name: "Altes Testprojekt",
          status: "active",
          schemaVersion: 1,
          createdAt: "2026-01-01T10:00:00.000Z",
          updatedAt: "2026-01-01T10:00:00.000Z",
        });
        transaction
          .objectStore("settings")
          .add({ key: "theme", value: "dark" });
        transaction
          .objectStore("settings")
          .add({ key: "lastProjectId", value: id });
        transaction.onerror = () => {
          database.close();
          reject(transaction.error);
        };
        transaction.oncomplete = () => {
          database.close();
          resolve();
        };
      };
    });
  }, legacyId);
  await page.goto(`${base}#/projects`);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page
    .getByRole("region", { name: "Zuletzt geöffnet", exact: true })
    .getByRole("link", { name: /^Altes Testprojekt / })
    .click();
  expect(new URL(page.url()).hash).toBe(`#/projects/${legacyId}`);
  await expect(
    page.getByRole("textbox", { name: "Projektname", exact: true }),
  ).toHaveValue("Altes Testprojekt");
  await page
    .getByRole("link", { name: "Aufmaß erfassen", exact: true })
    .click();
  await expect(
    page.getByText("Noch keine Aufmaße vorhanden.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Artikel", exact: true }).click();
  await expect(
    page
      .getByRole("list", { name: "Artikelkatalog", exact: true })
      .getByRole("listitem"),
  ).toHaveCount(22);
});

test("Eigene Artikel lassen sich suchen, bearbeiten, favorisieren, deaktivieren und reaktivieren", async ({
  page,
}) => {
  await createArticle(page, "E2E Prüfartikel");
  const catalog = page.getByRole("list", {
    name: "Artikelkatalog",
    exact: true,
  });
  await page
    .getByRole("button", {
      name: "Artikel bearbeiten: E2E Prüfartikel",
      exact: true,
    })
    .click();
  await page
    .getByLabel("Artikelname", { exact: true })
    .fill("E2E Artikel bearbeitet");
  await page
    .getByRole("button", { name: "Artikel speichern", exact: true })
    .click();
  await expect(
    catalog.getByRole("listitem", {
      name: "E2E Artikel bearbeitet",
      exact: true,
    }),
  ).toBeVisible();
  const favorite = page.getByRole("button", {
    name: "Favorit: E2E Artikel bearbeitet",
    exact: true,
  });
  await favorite.click();
  await expect(favorite).toHaveAttribute("aria-pressed", "true");
  await page.getByLabel("Artikel suchen", { exact: true }).fill("E2E Artikel");
  await page
    .getByLabel("Kategorie filtern", { exact: true })
    .selectOption({ label: "Testmaterial" });
  await page.getByLabel("Nur Favoriten", { exact: true }).check();
  await expect(catalog.getByRole("listitem")).toHaveCount(1);
  await page.reload();
  await expect(
    page.getByRole("button", {
      name: "Favorit: E2E Artikel bearbeitet",
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", {
      name: "Artikel deaktivieren: E2E Artikel bearbeitet",
      exact: true,
    })
    .click();
  await expect(
    catalog.getByRole("listitem", {
      name: "E2E Artikel bearbeitet",
      exact: true,
    }),
  ).toHaveCount(0);
  await page
    .getByLabel("Artikelstatus", { exact: true })
    .selectOption({ label: "Deaktivierte Artikel" });
  await page
    .getByRole("button", {
      name: "Artikel reaktivieren: E2E Artikel bearbeitet",
      exact: true,
    })
    .click();
  await page
    .getByLabel("Artikelstatus", { exact: true })
    .selectOption({ label: "Aktive Artikel" });
  await expect(
    catalog.getByRole("listitem", {
      name: "E2E Artikel bearbeitet",
      exact: true,
    }),
  ).toBeVisible();
});

test("Vier Menüpunkte und beide Einstiege führen zu getrennten, wieder bearbeitbaren Aufmaßen", async ({
  page,
}) => {
  const sheetURL = await createProject(page, "Mehrere Aufmaße");
  const nav = page.getByRole("navigation", { name: "Hauptnavigation" });
  await expect(nav.getByRole("link")).toHaveText([
    "Projekt",
    "Aufmaß",
    "Artikel",
    "Einstellungen",
  ]);
  await expect(
    nav.getByRole("link", { name: "Aufmaß", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("button", { name: /[+−]1/ })).toHaveCount(0);
  await page
    .getByLabel("Artikelkategorie filtern", { exact: true })
    .selectOption("Steckdosen");
  await add(page, "Steckdose", "3", "Steckdose ·");
  await expect(
    materialRow(page, "Steckdose").getByLabel("Gesamtmenge Steckdose", {
      exact: true,
    }),
  ).toHaveText("3");
  await page.getByLabel("Aufmaßname", { exact: true }).fill("Erstes umbenannt");
  await page
    .getByLabel("Aufmaßkategorie (optional)", { exact: true })
    .fill("Wohnung");
  await page
    .getByRole("button", { name: "Aufmaß speichern", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Erstes umbenannt", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Alle Aufmaße dieses Projekts", exact: false })
    .click();
  await createSheet(page, "Zweites");
  await add(page, "Steckdose", "7", "Steckdose ·");
  await nav.getByRole("link", { name: "Aufmaß", exact: true }).click();
  await page
    .getByRole("link", { name: "Mehrere Aufmaße", exact: true })
    .click();
  await expect(
    page
      .getByRole("region", { name: "Gemeinsame Materialliste" })
      .getByLabel("Gesamtmenge Steckdose", { exact: true }),
  ).toHaveText("10");
  await page
    .getByRole("link", { name: "Erstes umbenannt · Wohnung", exact: true })
    .click();
  await expect(
    page.getByLabel("Aufmaßkategorie (optional)", { exact: true }),
  ).toHaveValue("Wohnung");
  await setTotal(page, "Steckdose", "1");
  await page.reload();
  await expect(
    materialRow(page, "Steckdose").getByLabel("Gesamtmenge Steckdose", {
      exact: true,
    }),
  ).toHaveText("1");
  await page
    .getByRole("link", { name: "Alle Aufmaße dieses Projekts", exact: false })
    .click();
  await expect(
    page
      .getByRole("region", { name: "Gemeinsame Materialliste" })
      .getByLabel("Gesamtmenge Steckdose", { exact: true }),
  ).toHaveText("8");
  await page.getByRole("link", { name: "Zweites", exact: true }).click();
  await expect(
    materialRow(page, "Steckdose").getByLabel("Gesamtmenge Steckdose", {
      exact: true,
    }),
  ).toHaveText("7");
  await page.goBack();
  await page
    .getByRole("link", {
      name: "Gesamte Baustelle als CSV oder JSON sichern",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("region", { name: "Individuelles Aufmaß" }),
  ).toHaveCount(0);
  const json = await page
    .getByRole("button", { name: "JSON exportieren", exact: true })
    .boundingBox();
  const csv = await page
    .getByRole("button", { name: "CSV exportieren", exact: true })
    .boundingBox();
  expect(
    json &&
      csv &&
      (csv.y >= json.y + json.height + 8 || csv.x >= json.x + json.width + 8),
  ).toBeTruthy();
  await page
    .getByRole("link", { name: "Aufmaß erfassen", exact: true })
    .click();
  await page
    .getByRole("link", { name: "Erstes umbenannt · Wohnung", exact: true })
    .click();
  expect(page.url()).toBe(sheetURL);
});

test("Hinzufügen und Gesamtkorrektur bleiben nach Offline-Kaltstart erhalten", async ({
  page,
  context,
}) => {
  const url = await createProject(page, "Offline-Aufmaß");
  await expect(page.getByText("Offline bereit", { exact: true })).toBeVisible();
  await add(page, "Steckdose", "6", "Steckdose ·");
  await setTotal(page, "Steckdose", "3");
  await context.setOffline(true);
  await page.reload();
  await expect(
    materialRow(page, "Steckdose").getByLabel("Gesamtmenge Steckdose", {
      exact: true,
    }),
  ).toHaveText("3");
  await add(page, "Steckdose", "2", "Steckdose ·");
  await expect(
    materialRow(page, "Steckdose").getByLabel("Gesamtmenge Steckdose", {
      exact: true,
    }),
  ).toHaveText("5");
  await page.close();
  const reopened = await context.newPage();
  await reopened.goto(url);
  await expect(
    materialRow(reopened, "Steckdose").getByLabel("Gesamtmenge Steckdose", {
      exact: true,
    }),
  ).toHaveText("5");
  expect(
    await reopened.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("Gleich benannte eigene Varianten bleiben getrennt und Deaktivierung erhält die Aufmaßliste", async ({
  page,
}) => {
  await createArticle(page, "E2E Variante", "Weiß");
  await createArticle(page, "E2E Variante", "Schwarz");
  const url = await createProject(page, "Varianten-Aufmaß");
  await add(page, "E2E Variante", "2", "Weiß");
  await add(page, "E2E Variante", "4", "Schwarz");
  await expect(materialRow(page, "E2E Variante")).toHaveCount(2);
  await page.getByRole("link", { name: "Artikel", exact: true }).click();
  await page
    .getByRole("list", { name: "Artikelkatalog", exact: true })
    .getByRole("listitem", { name: "E2E Variante", exact: true })
    .filter({ hasText: "Weiß" })
    .getByRole("button", {
      name: "Artikel deaktivieren: E2E Variante",
      exact: true,
    })
    .click();
  await page.goto(url);
  await expect(materialRow(page, "E2E Variante")).toHaveCount(2);
  await page
    .getByLabel("Aufmaßartikel suchen", { exact: true })
    .fill("E2E Variante");
  await expect(
    page
      .getByRole("list", { name: "Aufmaßartikel", exact: true })
      .getByRole("button"),
  ).toHaveCount(1);
});

test("Aufmaß-CSV und Projekt-JSON exportieren eigene Artikel und stellen alle Aufmaße auf frischem Gerät wieder her", async ({
  page,
  browser,
}, testInfo) => {
  const name = '=E2E; "Formel"';
  await createArticle(page, name, "Reinweiß glänzend", 'Prüfung; "CSV"');
  await createProject(page, "Export-Aufmaß");
  await add(page, name, "2");
  const csvPath = testInfo.outputPath("material.csv");
  await exportDownload(page, "Aufmaß-CSV exportieren", csvPath);
  const csv = await readFile(csvPath, "utf8");
  expect(csv.charCodeAt(0)).toBe(0xfeff);
  expect(csv).toContain(
    `"'=E2E; ""Formel""";"Prüfung; ""CSV""";"Gira";"System 55";"Reinweiß glänzend";"Stück";2\r\n`,
  );
  await page
    .getByRole("link", { name: "Alle Aufmaße dieses Projekts", exact: false })
    .click();
  await createSheet(page, "Leeres Aufmaß");
  await page
    .getByRole("link", { name: "Alle Aufmaße dieses Projekts", exact: false })
    .click();
  await page
    .getByRole("link", {
      name: "Gesamte Baustelle als CSV oder JSON sichern",
      exact: true,
    })
    .click();
  const csvAllPath = testInfo.outputPath("baustelle.csv");
  await exportDownload(page, "CSV exportieren", csvAllPath);
  expect(await readFile(csvAllPath, "utf8")).toBe(csv);
  const jsonPath = testInfo.outputPath("projekt.json");
  await exportDownload(page, "JSON exportieren", jsonPath);
  const backup = JSON.parse(await readFile(jsonPath, "utf8"));
  expect(backup.schemaVersion).toBe(3);
  expect(backup.namedMeasurements).toHaveLength(2);
  const fresh = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  try {
    const restored = await fresh.newPage();
    await restored.goto(`${new URL(page.url()).origin}${base}#/projects`);
    await restored
      .getByLabel("Projekt-JSON importieren", { exact: true })
      .setInputFiles(jsonPath);
    await restored
      .getByRole("region", { name: "Aktive Projekte", exact: true })
      .getByRole("link", { name: /^Export-Aufmaß \(Import\) / })
      .click();
    await restored
      .getByRole("link", { name: "Aufmaß erfassen", exact: true })
      .click();
    await expect(
      restored.getByRole("link", { name: "Leeres Aufmaß", exact: true }),
    ).toBeVisible();
    await restored
      .getByRole("link", { name: "Individuell", exact: true })
      .click();
    await expect(
      materialRow(restored, name).getByLabel(`Gesamtmenge ${name}`, {
        exact: true,
      }),
    ).toHaveText("2");
    await restored.reload();
    await expect(
      materialRow(restored, name).getByLabel(`Gesamtmenge ${name}`, {
        exact: true,
      }),
    ).toHaveText("2");
    await restored.getByRole("link", { name: "Artikel", exact: true }).click();
    await expect(
      restored
        .getByRole("list", { name: "Artikelkatalog", exact: true })
        .getByRole("listitem", { name, exact: true }),
    ).toBeVisible();
  } finally {
    await fresh.close();
  }
});

async function exportDownload(page: Page, button: string, path: string) {
  await test.step(button, async () => {
    const downloadPromise = page.waitForEvent("download", {timeout: 10_000});
    await page.getByRole("button", {name: button, exact: true}).click();
    const download = await downloadPromise;
    await download.saveAs(path);
    expect(await download.failure()).toBeNull();
  });
}

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

async function openPicker(page: Page): Promise<void> {
  const disclosure = page
    .locator("summary")
    .filter({ hasText: "Artikel erfassen" });
  if (
    !(await page
      .getByLabel("Aufmaßartikel suchen", { exact: true })
      .isVisible())
  )
    await disclosure.click();
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
        transaction
          .objectStore("projects")
          .add({
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
  await expect(
    page
      .getByRole("region", { name: "Materialliste", exact: true })
      .getByRole("listitem"),
  ).toHaveCount(0);
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

test("Plus, Hinzufügen und Gesamtmenge bleiben auch nach Offline-Neustart korrekt", async ({
  page,
  context,
}) => {
  const projectURL = await createProject(page, "Offline-Aufmaß");
  await expect(page.getByText("Offline bereit", { exact: true })).toBeVisible();
  await openPicker(page);
  await page
    .getByRole("button", { name: "1 Stück Steckdose hinzufügen", exact: true })
    .click();
  const row = materialRow(page, "Steckdose");
  await expect(
    row.getByLabel("Gesamtmenge Steckdose", { exact: true }),
  ).toHaveText("1");
  await row
    .getByRole("button", { name: "Menge bearbeiten: Steckdose", exact: true })
    .click();
  await page.getByLabel("Menge für Steckdose", { exact: true }).fill("5");
  await page
    .getByRole("button", { name: "Menge hinzufügen", exact: true })
    .click();
  await expect(
    row.getByLabel("Gesamtmenge Steckdose", { exact: true }),
  ).toHaveText("6");
  await row
    .getByRole("button", { name: "Menge bearbeiten: Steckdose", exact: true })
    .click();
  await page.getByLabel("Menge für Steckdose", { exact: true }).fill("3");
  await page
    .getByRole("button", { name: "Gesamtmenge setzen", exact: true })
    .click();
  await expect(
    row.getByLabel("Gesamtmenge Steckdose", { exact: true }),
  ).toHaveText("3");
  await context.setOffline(true);
  await page.reload();
  await expect(
    row.getByLabel("Gesamtmenge Steckdose", { exact: true }),
  ).toHaveText("3");
  await openPicker(page);
  await page
    .getByRole("button", { name: "1 Stück Steckdose abziehen", exact: true })
    .click();
  await expect(
    row.getByLabel("Gesamtmenge Steckdose", { exact: true }),
  ).toHaveText("2");
  await page.close();
  const reopened = await context.newPage();
  await reopened.goto(projectURL);
  await expect(
    materialRow(reopened, "Steckdose").getByLabel("Gesamtmenge Steckdose", {
      exact: true,
    }),
  ).toHaveText("2");
  expect(
    await reopened.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("Gleich benannte Varianten bleiben getrennt und Deaktivieren erhält die Materialliste", async ({
  page,
}) => {
  await createArticle(page, "E2E Variantensteckdose", "Reinweiß glänzend");
  await createArticle(page, "E2E Variantensteckdose", "Schwarz");
  const projectURL = await createProject(page, "Varianten-Aufmaß");
  await openPicker(page);
  await page
    .getByLabel("Aufmaßartikel suchen", { exact: true })
    .fill("E2E Variantensteckdose");
  const picker = page.getByRole("list", { name: "Aufmaßartikel", exact: true });
  await picker
    .getByRole("listitem", { name: "E2E Variantensteckdose", exact: true })
    .filter({ hasText: "Reinweiß glänzend" })
    .getByRole("button", {
      name: "1 Stück E2E Variantensteckdose hinzufügen",
      exact: true,
    })
    .click();
  await picker
    .getByRole("listitem", { name: "E2E Variantensteckdose", exact: true })
    .filter({ hasText: "Schwarz" })
    .getByRole("button", {
      name: "1 Stück E2E Variantensteckdose hinzufügen",
      exact: true,
    })
    .click();
  await expect(materialRow(page, "E2E Variantensteckdose")).toHaveCount(2);
  await page.goto(`${base}#/articles`);
  const white = page
    .getByRole("list", { name: "Artikelkatalog", exact: true })
    .getByRole("listitem", { name: "E2E Variantensteckdose", exact: true })
    .filter({ hasText: "Reinweiß glänzend" });
  await white
    .getByRole("button", {
      name: "Artikel deaktivieren: E2E Variantensteckdose",
      exact: true,
    })
    .click();
  await page.goto(projectURL);
  await expect(materialRow(page, "E2E Variantensteckdose")).toHaveCount(2);
  await expect(
    materialRow(page, "E2E Variantensteckdose")
      .filter({ hasText: "Reinweiß glänzend" })
      .getByLabel("Gesamtmenge E2E Variantensteckdose", { exact: true }),
  ).toHaveText("1");
  await openPicker(page);
  await page
    .getByLabel("Aufmaßartikel suchen", { exact: true })
    .fill("E2E Variantensteckdose");
  await expect(
    picker.getByRole("button", {
      name: "1 Stück E2E Variantensteckdose hinzufügen",
      exact: true,
    }),
  ).toHaveCount(1);
});

test("CSV schützt Formeln und Projekt-JSON stellt eigenes Material samt Mengen auf frischem Gerät wieder her", async ({
  page,
  browser,
}, testInfo) => {
  const name = '=E2E; "Formel"';
  await createArticle(page, name, "Reinweiß glänzend", 'Prüfung; "CSV"');
  const projectURL = await createProject(page, "Export-Aufmaß");
  await openPicker(page);
  await page.getByLabel("Aufmaßartikel suchen", { exact: true }).fill(name);
  await page
    .getByRole("button", { name: `1 Stück ${name} hinzufügen`, exact: true })
    .click();
  await expect(
    materialRow(page, name).getByLabel(`Gesamtmenge ${name}`, { exact: true }),
  ).toHaveText("1");
  await page
    .getByRole("button", { name: `1 Stück ${name} hinzufügen`, exact: true })
    .click();
  await expect(
    materialRow(page, name).getByLabel(`Gesamtmenge ${name}`, { exact: true }),
  ).toHaveText("2");
  const csvDownload = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "CSV exportieren", exact: true })
    .click();
  const csvPath = testInfo.outputPath("material.csv");
  await (await csvDownload).saveAs(csvPath);
  const csv = await readFile(csvPath, "utf8");
  expect(csv.charCodeAt(0)).toBe(0xfeff);
  expect(csv).toContain(
    '"Bezeichnung";"Kategorie";"Hersteller";"Serie";"Farbe";"Einheit";"Menge"\r\n',
  );
  expect(csv).toContain(
    `"'=E2E; ""Formel""";"Prüfung; ""CSV""";"Gira";"System 55";"Reinweiß glänzend";"Stück";2\r\n`,
  );
  const jsonDownload = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "JSON exportieren", exact: true })
    .click();
  const jsonPath = testInfo.outputPath("projekt-mit-material.json");
  await (await jsonDownload).saveAs(jsonPath);
  const fresh = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  try {
    const restored = await fresh.newPage();
    await restored.goto(`${new URL(projectURL).origin}${base}#/projects`);
    await restored
      .getByLabel("Projekt-JSON importieren", { exact: true })
      .setInputFiles(jsonPath);
    await restored
      .getByRole("region", { name: "Aktive Projekte", exact: true })
      .getByRole("link", { name: /^Export-Aufmaß \(Import\) / })
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
    await restored.goto(`${new URL(projectURL).origin}${base}#/articles`);
    await expect(
      restored
        .getByRole("list", { name: "Artikelkatalog", exact: true })
        .getByRole("listitem", { name, exact: true }),
    ).toBeVisible();
  } finally {
    await fresh.close();
  }
});

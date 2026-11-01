import { expect, test, type Page } from "@playwright/test";

const path = process.env.VITE_BASE_PATH ?? "/aufmassapp/";

async function createProject(page: Page, name: string): Promise<void> {
  await page.goto(`${path}#/projects`);
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
}

test("Projekt erstellen, umbenennen, archivieren und reaktivieren bleibt nach Reload erhalten", async ({
  page,
}) => {
  await createProject(page, "Testbaustelle Nord");
  await page
    .getByRole("textbox", { name: "Projektname", exact: true })
    .fill("Testbaustelle Süd");
  await page
    .getByRole("button", { name: "Namen speichern", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Testbaustelle Süd", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Projektname", exact: true })
    .fill(" Testbaustelle Süd ");
  await page
    .getByRole("button", { name: "Namen speichern", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Projektname", exact: true }),
  ).toHaveValue("Testbaustelle Süd");
  await expect(
    page.getByRole("button", { name: "Projekt archivieren", exact: true }),
  ).toBeEnabled();
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "Projektname", exact: true }),
  ).toHaveValue("Testbaustelle Süd");

  await page
    .getByRole("button", { name: "Projekt archivieren", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Projekt reaktivieren", exact: true }),
  ).toBeVisible();
  await page.goto(`${path}#/projects`);
  await page.reload();
  const archived = page.getByRole("region", {
    name: "Archivierte Projekte",
    exact: true,
  });
  await expect(
    archived.getByRole("link", { name: /^Testbaustelle Süd / }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Aktive Projekte", exact: true })
      .getByRole("link"),
  ).toHaveCount(0);

  await archived.getByRole("link", { name: /^Testbaustelle Süd / }).click();
  await page
    .getByRole("button", { name: "Projekt reaktivieren", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Projekt archivieren", exact: true }),
  ).toBeVisible();
  await page.goto(`${path}#/projects`);
  await page.reload();
  await expect(
    page
      .getByRole("region", { name: "Aktive Projekte", exact: true })
      .getByRole("link", { name: /^Testbaustelle Süd / }),
  ).toBeVisible();
  await expect(archived.getByRole("link")).toHaveCount(0);
});

test("Zuletzt geöffnet führt auch nach Neustart zum zuletzt ausgewählten Projekt", async ({
  page,
  context,
}) => {
  await createProject(page, "Testprojekt A");
  await createProject(page, "Testprojekt B");
  await page.goto(`${path}#/projects`);
  await page
    .getByRole("region", { name: "Aktive Projekte", exact: true })
    .getByRole("link", { name: /^Testprojekt A / })
    .click();
  await expect(
    page.getByRole("heading", { name: "Testprojekt A", exact: true }),
  ).toBeVisible();
  await page.goto(`${path}#/projects`);
  await expect(
    page
      .getByRole("region", { name: "Zuletzt geöffnet", exact: true })
      .getByRole("link", { name: /^Testprojekt A / }),
  ).toBeVisible();
  await page.close();

  const reopened = await context.newPage();
  await reopened.goto(`${path}#/projects`);
  await reopened
    .getByRole("region", { name: "Zuletzt geöffnet", exact: true })
    .getByRole("link", { name: /^Testprojekt A / })
    .click();
  await expect(
    reopened.getByRole("heading", { name: "Testprojekt A", exact: true }),
  ).toBeVisible();
});

test("JSON stellt ein Projekt in frischer Datenbank wieder her und importiert Kollision als Kopie", async ({
  page,
  browser,
}, testInfo) => {
  await createProject(page, "JSON-Testbaustelle");
  const originalURL = page.url();
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "JSON exportieren", exact: true })
    .click();
  const download = await downloadPromise;
  const savedFile = testInfo.outputPath("projekt.json");
  await download.saveAs(savedFile);
  expect(download.suggestedFilename()).toMatch(/\.json$/);

  const fresh = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  try {
    const restored = await fresh.newPage();
    await restored.goto(`${new URL(originalURL).origin}${path}#/projects`);
    await restored
      .getByLabel("Projekt-JSON importieren", { exact: true })
      .setInputFiles(savedFile);
    await restored
      .getByRole("region", { name: "Aktive Projekte", exact: true })
      .getByRole("link", { name: /^JSON-Testbaustelle / })
      .click();
    await expect(
      restored.getByRole("heading", {
        name: "JSON-Testbaustelle",
        exact: true,
      }),
    ).toBeVisible();
    expect(restored.url()).toBe(originalURL);
    await restored.reload();
    await expect(
      restored.getByRole("heading", {
        name: "JSON-Testbaustelle",
        exact: true,
      }),
    ).toBeVisible();
  } finally {
    await fresh.close();
  }

  await page.goto(`${path}#/projects`);
  await page
    .getByLabel("Projekt-JSON importieren", { exact: true })
    .setInputFiles(savedFile);
  const projectLinks = page
    .getByRole("region", { name: "Aktive Projekte", exact: true })
    .getByRole("link", { name: /^JSON-Testbaustelle / });
  await expect(projectLinks).toHaveCount(2);
  const urls = await projectLinks.evaluateAll((links) =>
    links.map((link) => (link as HTMLAnchorElement).href),
  );
  expect(new Set(urls).size).toBe(2);
  expect(urls).toContain(originalURL);
});

test("Fehlerhafter JSON-Import meldet Fehler und lässt vorhandene Projekte unverändert", async ({
  page,
}) => {
  await createProject(page, "Unverändertes Testprojekt");
  await page.goto(`${path}#/projects`);
  await page
    .getByLabel("Projekt-JSON importieren", { exact: true })
    .setInputFiles({
      name: "ungueltig.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"format":"unbekannt","schemaVersion":999}'),
    });
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Aktive Projekte", exact: true })
      .getByRole("link"),
  ).toHaveCount(1);
  await page.reload();
  await page
    .getByRole("region", { name: "Aktive Projekte", exact: true })
    .getByRole("link", { name: /^Unverändertes Testprojekt / })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Projektname", exact: true }),
  ).toHaveValue("Unverändertes Testprojekt");
});

test("Design folgt dem System und speichert manuelle Überschreibungen", async ({
  page,
}) => {
  await page.goto(`${path}#/settings`);
  await expect(
    page.getByRole("radio", { name: "System", exact: true }),
  ).toBeChecked();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await page.getByRole("radio", { name: "Hell", exact: true }).click();
  await expect(
    page.getByRole("radio", { name: "Hell", exact: true }),
  ).toBeChecked();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(
    page.getByRole("radio", { name: "Hell", exact: true }),
  ).toBeChecked();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  await page.getByRole("radio", { name: "Dunkel", exact: true }).click();
  await expect(
    page.getByRole("radio", { name: "Dunkel", exact: true }),
  ).toBeChecked();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(
    page.getByRole("radio", { name: "Dunkel", exact: true }),
  ).toBeChecked();
  await page.getByRole("radio", { name: "System", exact: true }).click();
  await expect(
    page.getByRole("radio", { name: "System", exact: true }),
  ).toBeChecked();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("Produktions-PWA lädt im Unterpfad offline und persistiert Änderungen nach Schließen", async ({
  page,
  context,
}) => {
  await createProject(page, "Offline-Testbaustelle");
  await expect(page.getByText("Offline bereit", { exact: true })).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  const detailURL = page.url();
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Offline-Testbaustelle", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Projektname", exact: true })
    .fill("Offline geändert");
  await page
    .getByRole("button", { name: "Namen speichern", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Offline geändert", exact: true }),
  ).toBeVisible();
  await page.close();

  const reopened = await context.newPage();
  await reopened.goto(detailURL);
  await expect(
    reopened.getByRole("heading", { name: "Offline geändert", exact: true }),
  ).toBeVisible();
  await reopened.getByRole("link", { name: "Artikel", exact: true }).click();
  await expect(
    reopened.getByRole("heading", { name: "Artikel", exact: true }),
  ).toBeVisible();
  expect(
    await reopened.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("Manifest, Icons und Service-Worker-Scope verwenden den GitHub-Pages-Unterpfad", async ({
  page,
}) => {
  await page.goto(path);
  await expect(page.getByText("Offline bereit", { exact: true })).toBeVisible();
  const manifestHref = await page
    .locator('link[rel="manifest"]')
    .getAttribute("href");
  expect(manifestHref).toBeTruthy();
  const manifestURL = new URL(manifestHref!, page.url());
  expect(manifestURL.pathname).toBe(`${path}manifest.webmanifest`);
  const manifestResponse = await page.request.get(manifestURL.href);
  expect(manifestResponse.ok()).toBe(true);
  const manifest = await manifestResponse.json();
  expect(manifest.start_url).toBe(path);
  expect(manifest.scope).toBe(path);
  expect(manifest.display).toBe("standalone");
  expect(manifest.icons).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ sizes: "192x192" }),
      expect.objectContaining({ sizes: "512x512" }),
      expect.objectContaining({ purpose: "maskable" }),
    ]),
  );
  for (const icon of manifest.icons) {
    const response = await page.request.get(
      new URL(icon.src, manifestURL).href,
    );
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toContain("image/png");
  }
  const scope = await page.evaluate(
    async () => (await navigator.serviceWorker.ready).scope,
  );
  expect(new URL(scope).pathname).toBe(path);
});

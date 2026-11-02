import type { AppDatabase } from "./database";
import { importedProjectName } from "../domain/importName";
import {
  aggregateEntries,
  type Article,
  type MeasurementEntry,
} from "../domain/material";
import { materialCsv } from "../domain/csv";
import {
  APP_VERSION,
  SCHEMA_VERSION,
  isTheme,
  parseProjectBackup,
  validateProjectName,
  type Project,
  type ProjectBackupV2,
  type ProjectStatus,
  type Theme,
} from "../domain/project";

export class ProjectRepository {
  constructor(private readonly db: AppDatabase) {}

  async listProjects(): Promise<Project[]> {
    return this.db.projects.orderBy("updatedAt").reverse().toArray();
  }

  async getProject(id: string): Promise<Project | undefined> {
    return this.db.projects.get(id);
  }

  async createProject(name: string): Promise<Project> {
    const timestamp = new Date().toISOString();
    const project: Project = {
      id: crypto.randomUUID(),
      name: validateProjectName(name),
      status: "active",
      createdAt: timestamp,
      updatedAt: timestamp,
      schemaVersion: SCHEMA_VERSION,
    };
    await this.db.projects.add(project);
    return project;
  }

  async renameProject(id: string, name: string): Promise<Project> {
    const validName = validateProjectName(name);
    return this.changeProject(id, { name: validName });
  }

  async setProjectStatus(id: string, status: ProjectStatus): Promise<Project> {
    if (status !== "active" && status !== "archived")
      throw new Error("Unbekannter Projektstatus.");
    return this.changeProject(id, { status });
  }

  private async changeProject(
    id: string,
    patch: Partial<Pick<Project, "name" | "status">>,
  ): Promise<Project> {
    return this.db.transaction("rw", this.db.projects, async () => {
      const previous = await this.requireProject(id);
      const project = {
        ...previous,
        ...patch,
        // Avoid decreasing updatedAt if the device clock was corrected backwards.
        updatedAt: new Date(
          Math.max(Date.now(), Date.parse(previous.updatedAt)),
        ).toISOString(),
      };
      await this.db.projects.put(project);
      return project;
    });
  }

  async openProject(id: string): Promise<Project> {
    return this.db.transaction(
      "rw",
      this.db.projects,
      this.db.settings,
      async () => {
        const project = await this.requireProject(id);
        await this.db.settings.put({ key: "lastProjectId", value: id });
        return project;
      },
    );
  }

  async getLastProject(): Promise<Project | undefined> {
    return this.db.transaction(
      "r",
      this.db.projects,
      this.db.settings,
      async () => {
        const setting = await this.db.settings.get("lastProjectId");
        return typeof setting?.value === "string"
          ? this.db.projects.get(setting.value)
          : undefined;
      },
    );
  }

  async exportProject(id: string): Promise<string> {
    return this.db.transaction(
      "r",
      this.db.projects,
      this.db.articles,
      this.db.measurements,
      async () => {
        const project = await this.requireProject(id);
        const measurements = await this.db.measurements
          .where("projectId")
          .equals(id)
          .toArray();
        const articles: Article[] = [];
        for (const articleId of new Set(
          measurements.map((entry) => entry.articleId),
        )) {
          const article = await this.db.articles.get(articleId);
          if (!article)
            throw new Error(
              "Ein erfasster Artikel fehlt. Das Projekt wurde nicht unvollständig exportiert.",
            );
          articles.push(article);
        }
        const backup: ProjectBackupV2 = {
          format: "baustellenaufmass-project",
          schemaVersion: 2,
          appVersion: APP_VERSION,
          exportedAt: new Date().toISOString(),
          project,
          articles,
          measurements,
        };
        const text = JSON.stringify(backup, null, 2);
        // Guarantee that every generated backup can be imported within supported bounds.
        parseProjectBackup(text);
        return text;
      },
    );
  }

  async exportProjectCsv(id: string): Promise<string> {
    return this.db.transaction(
      "r",
      this.db.projects,
      this.db.measurements,
      async () => {
        await this.requireProject(id);
        const entries = await this.db.measurements
          .where("projectId")
          .equals(id)
          .toArray();
        return materialCsv(aggregateEntries(entries));
      },
    );
  }

  async importProject(text: string): Promise<Project> {
    const backup = parseProjectBackup(text);
    const incoming = backup.project;
    return this.db.transaction(
      "rw",
      this.db.projects,
      this.db.articles,
      this.db.measurements,
      async () => {
        let id = incoming.id;
        // Read and insert share one write transaction, including simultaneous imports.
        while (await this.db.projects.get(id)) id = crypto.randomUUID();
        const existing = await this.db.projects.toArray();
        const name = importedProjectName(
          incoming.name,
          existing.map((project) => project.name),
        );
        const project: Project = { ...incoming, id, name };
        if (backup.schemaVersion === 2) {
          const remap = new Map<string, string>();
          for (const incomingArticle of backup.articles) {
            const existingArticle = await this.db.articles.get(
              incomingArticle.id,
            );
            if (
              existingArticle &&
              this.sameArticleIdentity(existingArticle, incomingArticle) &&
              existingArticle.revision >= incomingArticle.revision
            ) {
              remap.set(incomingArticle.id, existingArticle.id);
              continue;
            }
            let articleId = incomingArticle.id;
            while (await this.db.articles.get(articleId))
              articleId = crypto.randomUUID();
            await this.db.articles.add({ ...incomingArticle, id: articleId });
            remap.set(incomingArticle.id, articleId);
          }
          for (const incomingEntry of backup.measurements) {
            const articleId = remap.get(incomingEntry.articleId)!;
            let entryId = crypto.randomUUID();
            while (await this.db.measurements.get(entryId))
              entryId = crypto.randomUUID();
            const entry: MeasurementEntry = {
              ...incomingEntry,
              id: entryId,
              projectId: id,
              articleId,
              articleSnapshot: {
                ...incomingEntry.articleSnapshot,
                id: articleId,
              },
            };
            await this.db.measurements.add(entry);
          }
        }
        await this.db.projects.add(project);
        return project;
      },
    );
  }

  private sameArticleIdentity(first: Article, second: Article): boolean {
    return (
      ["name", "category", "unit", "manufacturer", "series", "color"] as const
    ).every((field) => first[field] === second[field]);
  }

  async getTheme(): Promise<Theme> {
    const setting = await this.db.settings.get("theme");
    return isTheme(setting?.value) ? setting.value : "system";
  }

  async setTheme(theme: Theme): Promise<void> {
    if (!isTheme(theme)) throw new Error("Unbekannte Design-Einstellung.");
    await this.db.settings.put({ key: "theme", value: theme });
  }

  private async requireProject(id: string): Promise<Project> {
    const project = await this.db.projects.get(id);
    if (!project) throw new Error("Das Projekt wurde nicht gefunden.");
    return project;
  }
}

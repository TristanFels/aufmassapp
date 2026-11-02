import type { AppDatabase } from "./database";
import { STANDARD_ARTICLES } from "./seed";
import {
  aggregateEntries,
  articleSnapshot,
  validateArticleInput,
  validateQuantity,
  type Article,
  type ArticleInput,
  type MaterialTotal,
  type MeasurementEntry,
} from "../domain/material";

export class MaterialRepository {
  constructor(private readonly db: AppDatabase) {}

  async ensureSeed(): Promise<void> {
    await this.db.transaction("rw", this.db.articles, async () => {
      for (const article of STANDARD_ARTICLES) {
        if (!(await this.db.articles.get(article.id)))
          await this.db.articles.add({ ...article });
      }
    });
  }

  async listArticles(): Promise<Article[]> {
    const articles = await this.db.articles.toArray();
    return articles.sort((a, b) => a.name.localeCompare(b.name, "de"));
  }

  async createArticle(input: ArticleInput): Promise<Article> {
    const fields = validateArticleInput(input);
    const timestamp = new Date().toISOString();
    const article: Article = {
      ...fields,
      id: crypto.randomUUID(),
      unit: "Stück",
      active: true,
      favorite: false,
      revision: 1,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await this.db.articles.add(article);
    return article;
  }

  async updateArticle(id: string, input: ArticleInput): Promise<Article> {
    const fields = validateArticleInput(input);
    return this.db.transaction(
      "rw",
      this.db.articles,
      this.db.measurements,
      async () => {
        const previous = await this.requireArticle(id);
        const changesIdentity =
          fields.manufacturer !== previous.manufacturer ||
          fields.series !== previous.series ||
          fields.color !== previous.color;
        if (
          changesIdentity &&
          (await this.db.measurements.where("articleId").equals(id).count())
        ) {
          throw new Error(
            "Diese Ausführung wurde bereits erfasst. Für einen anderen Hersteller, eine andere Serie oder Farbe bitte einen neuen Artikel anlegen.",
          );
        }
        const article = {
          ...previous,
          ...fields,
          revision: previous.revision + 1,
          updatedAt: this.timestamp(previous.updatedAt),
        };
        await this.db.articles.put(article);
        return article;
      },
    );
  }

  async setActive(id: string, active: boolean): Promise<Article> {
    if (typeof active !== "boolean")
      throw new Error("Ungültiger Artikelstatus.");
    return this.patchArticle(id, { active });
  }

  async setFavorite(id: string, favorite: boolean): Promise<Article> {
    if (typeof favorite !== "boolean")
      throw new Error("Ungültige Favoritenauswahl.");
    return this.patchArticle(id, { favorite });
  }

  private async patchArticle(
    id: string,
    patch: Partial<Pick<Article, "active" | "favorite">>,
  ): Promise<Article> {
    return this.db.transaction("rw", this.db.articles, async () => {
      const previous = await this.requireArticle(id);
      const article = {
        ...previous,
        ...patch,
        updatedAt: this.timestamp(previous.updatedAt),
      };
      await this.db.articles.put(article);
      return article;
    });
  }

  async getTotals(projectId: string): Promise<MaterialTotal[]> {
    return aggregateEntries(
      await this.db.measurements.where("projectId").equals(projectId).toArray(),
      Number.MAX_SAFE_INTEGER,
    );
  }

  async getMeasurementTotals(measurementId: string): Promise<MaterialTotal[]> {
    return aggregateEntries(
      await this.db.measurements
        .where("measurementId")
        .equals(measurementId)
        .toArray(),
    );
  }

  async addQuantity(
    measurementId: string,
    articleId: string,
    quantity: number,
  ): Promise<void> {
    validateQuantity(quantity, true);
    await this.changeQuantity(
      measurementId,
      articleId,
      (current) => current + quantity,
      "add",
    );
  }

  async decrement(measurementId: string, articleId: string): Promise<void> {
    await this.changeQuantity(
      measurementId,
      articleId,
      (current) => current - 1,
      "correction",
    );
  }

  async setTotal(
    measurementId: string,
    articleId: string,
    quantity: number,
  ): Promise<void> {
    validateQuantity(quantity);
    await this.changeQuantity(
      measurementId,
      articleId,
      () => quantity,
      "correction",
    );
  }

  private async changeQuantity(
    measurementId: string,
    articleId: string,
    calculate: (current: number) => number,
    kind: MeasurementEntry["kind"],
  ): Promise<void> {
    await this.db.transaction(
      "rw",
      this.db.projects,
      this.db.namedMeasurements,
      this.db.articles,
      this.db.measurements,
      async () => {
        const measurement = await this.db.namedMeasurements.get(measurementId);
        if (!measurement)
          throw new Error("Das Aufmaß / Projekt wurde nicht gefunden.");
        const projectId = measurement.projectId;
        const project = await this.db.projects.get(projectId);
        if (!project) throw new Error("Das Projekt wurde nicht gefunden.");
        if (project.status !== "active")
          throw new Error(
            "Das Projekt ist archiviert. Bitte zuerst reaktivieren.",
          );
        const article = await this.requireArticle(articleId);
        const entries = await this.db.measurements
          .where("[measurementId+articleId]")
          .equals([measurementId, articleId])
          .toArray();
        const previous = aggregateEntries(entries)[0];
        const current = previous?.quantity ?? 0;
        const quantity = calculate(current);
        validateQuantity(quantity);
        if (
          !article.active &&
          (kind === "add" || !entries.length || quantity > current)
        ) {
          throw new Error(
            "Dieser Artikel ist deaktiviert. Bitte im Katalog reaktivieren, bevor weitere Mengen erfasst werden.",
          );
        }
        const delta = quantity - current;
        if (!delta) return;
        const entry: MeasurementEntry = {
          id: crypto.randomUUID(),
          measurementId,
          projectId,
          articleId,
          articleSnapshot:
            (
              await this.db.measurements
                .where("[projectId+articleId]")
                .equals([projectId, articleId])
                .first()
            )?.articleSnapshot ?? articleSnapshot(article),
          delta,
          kind,
          createdAt: this.timestamp(project.updatedAt),
        };
        await this.db.measurements.add(entry);
        await this.db.namedMeasurements.put({
          ...measurement,
          updatedAt: entry.createdAt,
        });
        await this.db.projects.put({ ...project, updatedAt: entry.createdAt });
      },
    );
  }

  private timestamp(previous: string): string {
    return new Date(Math.max(Date.now(), Date.parse(previous))).toISOString();
  }

  private async requireArticle(id: string): Promise<Article> {
    const article = await this.db.articles.get(id);
    if (!article) throw new Error("Der Artikel wurde nicht gefunden.");
    return article;
  }
}

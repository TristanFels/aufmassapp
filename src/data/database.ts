import Dexie, { type Table } from "dexie";
import type { Project } from "../domain/project";
import type { Article, MeasurementEntry } from "../domain/material";

import { aggregateEntries, isMeasurementEntry } from "../domain/material";
import type { NamedMeasurement } from "../domain/measurement";

export interface Setting {
  key: string;
  value: unknown;
}

export class AppDatabase extends Dexie {
  projects!: Table<Project, string>;
  settings!: Table<Setting, string>;
  articles!: Table<Article, string>;
  namedMeasurements!: Table<NamedMeasurement, string>;
  measurements!: Table<MeasurementEntry, string>;

  constructor(name = "baustellenaufmass") {
    super(name);
    // Add future schema versions and explicit migrations here. Never delete/recreate on failure.
    this.version(1).stores({
      projects: "id, status, updatedAt",
      settings: "key",
    });
    // Additive migration: all projects/settings from 0.1 remain untouched.
    this.version(2).stores({
      projects: "id, status, updatedAt",
      settings: "key",
      articles: "id,active,category",
      measurements: "id,projectId,[projectId+articleId],articleId",
    });
    this.version(3)
      .stores({
        namedMeasurements: "id,projectId,updatedAt",
        measurements:
          "id,projectId,[projectId+articleId],articleId,measurementId,[measurementId+articleId]",
      })
      .upgrade(async (tx) => {
        const entries = await tx.table("measurements").toArray();
        const groups = new Map<string, typeof entries>();
        for (const entry of entries) {
          const group = groups.get(entry.projectId) ?? [];
          group.push(entry);
          groups.set(entry.projectId, group);
        }
        for (const [projectId, group] of groups) {
          const project = await tx.table("projects").get(projectId);
          if (!project || !group.every(isMeasurementEntry))
            throw new Error("Ungültige Bestandsdaten; Migration abgebrochen.");
          aggregateEntries(group);
          for (const entry of group) {
            if (!(await tx.table("articles").get(entry.articleId)))
              throw new Error("Artikel fehlt; Migration abgebrochen.");
          }
          const id = crypto.randomUUID();
          await tx.table("namedMeasurements").add({
            id,
            projectId,
            name: "Bisheriges Aufmaß",
            category: "",
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
          });
          for (const entry of group)
            await tx.table("measurements").put({ ...entry, measurementId: id });
        }
      });
  }
}

export function createDatabase(name?: string): AppDatabase {
  return new AppDatabase(name);
}

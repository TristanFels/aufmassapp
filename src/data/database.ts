import Dexie, { type Table } from "dexie";
import type { Project } from "../domain/project";
import type { Article, MeasurementEntry } from "../domain/material";

export interface Setting {
  key: string;
  value: unknown;
}

export class AppDatabase extends Dexie {
  projects!: Table<Project, string>;
  settings!: Table<Setting, string>;
  articles!: Table<Article, string>;
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
  }
}

export function createDatabase(name?: string): AppDatabase {
  return new AppDatabase(name);
}

import Dexie, { type Table } from "dexie";
import type { Project } from "../domain/project";

export interface Setting {
  key: string;
  value: unknown;
}

export class AppDatabase extends Dexie {
  projects!: Table<Project, string>;
  settings!: Table<Setting, string>;

  constructor(name = "baustellenaufmass") {
    super(name);
    // Add future schema versions and explicit migrations here. Never delete/recreate on failure.
    this.version(1).stores({
      projects: "id, status, updatedAt",
      settings: "key",
    });
  }
}

export function createDatabase(name?: string): AppDatabase {
  return new AppDatabase(name);
}

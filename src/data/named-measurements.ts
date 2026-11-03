import type { AppDatabase } from "./database";
import {
  measurementFields,
  type NamedMeasurement,
} from "../domain/measurement";
import { materialCsv } from "../domain/csv";
import { aggregateEntries } from "../domain/material";

export class MeasurementRepository {
  constructor(private readonly db: AppDatabase) {}

  list(projectId: string) {
    return this.db.namedMeasurements
      .where("projectId")
      .equals(projectId)
      .sortBy("createdAt");
  }

  async save(
    projectId: string,
    name: string,
    category = "",
    id?: string,
  ): Promise<NamedMeasurement> {
    const fields = measurementFields(name, category);
    return this.db.transaction(
      "rw",
      this.db.projects,
      this.db.namedMeasurements,
      async () => {
        const project = await this.db.projects.get(projectId);
        if (!project) throw new Error("Projekt nicht gefunden.");
        if (project.status !== "active")
          throw new Error("Projekt ist archiviert. Bitte zuerst reaktivieren.");
        const previous = id
          ? await this.db.namedMeasurements.get(id)
          : undefined;
        if (id && (!previous || previous.projectId !== projectId))
          throw new Error("Aufmaß nicht gefunden.");
        const now = new Date(
          Math.max(
            Date.now(),
            Date.parse(project.updatedAt),
            previous ? Date.parse(previous.updatedAt) : 0,
          ),
        ).toISOString();
        const measurement = {
          id: id ?? crypto.randomUUID(),
          projectId,
          ...fields,
          createdAt: previous?.createdAt ?? now,
          updatedAt: now,
        };
        await this.db.namedMeasurements.put(measurement);
        await this.db.projects.put({ ...project, updatedAt: now });
        return measurement;
      },
    );
  }

  async exportCsv(id: string): Promise<string> {
    return this.db.transaction(
      "r",
      this.db.namedMeasurements,
      this.db.measurements,
      async () => {
        if (!(await this.db.namedMeasurements.get(id)))
          throw new Error("Aufmaß nicht gefunden.");
        return materialCsv(
          aggregateEntries(
            await this.db.measurements
              .where("measurementId")
              .equals(id)
              .toArray(),
          ),
        );
      },
    );
  }
}

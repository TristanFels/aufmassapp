export const APP_VERSION = "0.1.1";
export const SCHEMA_VERSION = 1;
export const MAX_PROJECT_NAME_LENGTH = 120;
export const MAX_IMPORT_BYTES = 1_048_576;

export type ProjectStatus = "active" | "archived";
export type Theme = "system" | "light" | "dark";

export interface Project {
  id: string;
  name: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  schemaVersion: typeof SCHEMA_VERSION;
}

export interface ProjectBackup {
  format: "baustellenaufmass-project";
  schemaVersion: typeof SCHEMA_VERSION;
  appVersion: string;
  exportedAt: string;
  project: Project;
}

export function validateProjectName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > MAX_PROJECT_NAME_LENGTH) {
    throw new Error(
      `Der Projektname muss 1 bis ${MAX_PROJECT_NAME_LENGTH} Zeichen enthalten.`,
    );
  }
  return trimmed;
}

export function isTheme(value: unknown): value is Theme {
  return value === "system" || value === "light" || value === "dark";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  return (
    Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key))
  );
}

function isTimestamp(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
  )
    return false;
  const timestamp = Date.parse(value);
  return (
    Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value
  );
}

function isProject(value: unknown): value is Project {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "id",
      "name",
      "status",
      "createdAt",
      "updatedAt",
      "schemaVersion",
    ])
  )
    return false;
  return (
    typeof value.id === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value.id,
    ) &&
    typeof value.name === "string" &&
    value.name === value.name.trim() &&
    value.name.length > 0 &&
    value.name.length <= MAX_PROJECT_NAME_LENGTH &&
    (value.status === "active" || value.status === "archived") &&
    isTimestamp(value.createdAt) &&
    isTimestamp(value.updatedAt) &&
    value.createdAt <= value.updatedAt &&
    value.schemaVersion === SCHEMA_VERSION
  );
}

/** Parse before opening a write transaction; never discard unsupported fields. */
export function parseProjectBackup(text: string): ProjectBackup {
  if (new TextEncoder().encode(text).byteLength > MAX_IMPORT_BYTES) {
    throw new Error("Die JSON-Datei ist zu groß (höchstens 1 MiB).");
  }
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("Die Datei enthält kein gültiges JSON.");
  }
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "format",
      "schemaVersion",
      "appVersion",
      "exportedAt",
      "project",
    ]) ||
    value.format !== "baustellenaufmass-project" ||
    value.schemaVersion !== SCHEMA_VERSION ||
    typeof value.appVersion !== "string" ||
    !/^\d+\.\d+\.\d+$/.test(value.appVersion) ||
    !isTimestamp(value.exportedAt) ||
    !isProject(value.project)
  ) {
    throw new Error(
      "Unbekanntes oder fehlerhaftes Projektformat. Unterstützt wird das vollständige Projektschema 1; zusätzliche Felder werden nicht verworfen.",
    );
  }
  return value as unknown as ProjectBackup;
}

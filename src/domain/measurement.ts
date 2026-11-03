import { isMaterialId, isMaterialTimestamp, isRecord } from "./material";

export interface NamedMeasurement {
  id: string;
  projectId: string;
  name: string;
  category: string;
  createdAt: string;
  updatedAt: string;
}

export function measurementFields(name: string, category: string) {
  const clean = { name: name.trim(), category: category.trim() };
  if (
    !clean.name ||
    clean.name.length > 120 ||
    clean.category.length > 80 ||
    /[\u0000-\u001f\u007f]/u.test(clean.name + clean.category)
  ) {
    throw new Error(
      "Aufmaßname: 1–120 Zeichen; optionale Kategorie: höchstens 80 Zeichen, ohne Steuerzeichen.",
    );
  }
  return clean;
}

export function isNamedMeasurement(value: unknown): value is NamedMeasurement {
  if (
    !isRecord(value) ||
    Object.keys(value).sort().join(",") !==
      "category,createdAt,id,name,projectId,updatedAt" ||
    !isMaterialId(value.id) ||
    !isMaterialId(value.projectId) ||
    typeof value.name !== "string" ||
    typeof value.category !== "string" ||
    !isMaterialTimestamp(value.createdAt) ||
    !isMaterialTimestamp(value.updatedAt) ||
    value.createdAt > value.updatedAt
  )
    return false;
  try {
    const clean = measurementFields(value.name, value.category);
    return clean.name === value.name && clean.category === value.category;
  } catch {
    return false;
  }
}

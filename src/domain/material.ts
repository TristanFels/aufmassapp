export const MAX_QUANTITY = 1_000_000;
export const MAX_ARTICLE_NAME_LENGTH = 120;
export const MAX_ARTICLE_FIELD_LENGTH = 80;

export interface ArticleInput {
  name: string;
  category: string;
  manufacturer: string;
  series: string;
  color: string;
}

/** One record identifies one concrete material variant. */
export interface Article extends ArticleInput {
  id: string;
  unit: "Stück";
  active: boolean;
  favorite: boolean;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

export type ArticleSnapshot = Pick<
  Article,
  | "id"
  | "name"
  | "category"
  | "unit"
  | "manufacturer"
  | "series"
  | "color"
  | "revision"
>;

export interface MeasurementEntry {
  id: string;
  projectId: string;
  measurementId?: string; // Absent only in legacy schema-2 backups.
  articleId: string;
  articleSnapshot: ArticleSnapshot;
  delta: number;
  kind: "add" | "correction";
  createdAt: string;
}

export interface MaterialTotal {
  articleId: string;
  snapshot: ArticleSnapshot;
  quantity: number;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  return (
    Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key))
  );
}

export function isMaterialId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

export function isMaterialTimestamp(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
  )
    return false;
  const time = Date.parse(value);
  return Number.isFinite(time) && new Date(time).toISOString() === value;
}

function field(value: unknown, max: number, required = false): value is string {
  return (
    typeof value === "string" &&
    value === value.trim() &&
    value.length <= max &&
    (!required || value.length > 0) &&
    !/[\u0000-\u001f\u007f]/u.test(value)
  );
}

function validInput(value: Record<string, unknown>): boolean {
  return (
    field(value.name, MAX_ARTICLE_NAME_LENGTH, true) &&
    field(value.category, MAX_ARTICLE_FIELD_LENGTH, true) &&
    field(value.manufacturer, MAX_ARTICLE_FIELD_LENGTH) &&
    field(value.series, MAX_ARTICLE_FIELD_LENGTH) &&
    field(value.color, MAX_ARTICLE_FIELD_LENGTH)
  );
}

export function validateArticleInput(input: ArticleInput): ArticleInput {
  if (
    !isRecord(input) ||
    ![
      input.name,
      input.category,
      input.manufacturer,
      input.series,
      input.color,
    ].every((v) => typeof v === "string")
  ) {
    throw new Error("Bitte gültige Artikelangaben eingeben.");
  }
  const trimmed: ArticleInput = {
    name: input.name.trim(),
    category: input.category.trim(),
    manufacturer: input.manufacturer.trim(),
    series: input.series.trim(),
    color: input.color.trim(),
  };
  if (!validInput(trimmed as unknown as Record<string, unknown>))
    throw new Error(
      "Name und Kategorie sind erforderlich. Artikelname: höchstens 120 Zeichen; weitere Angaben: höchstens 80 Zeichen, ohne Steuerzeichen.",
    );
  return trimmed;
}

const snapshotKeys = [
  "id",
  "name",
  "category",
  "unit",
  "manufacturer",
  "series",
  "color",
  "revision",
] as const;

export function isArticleSnapshot(value: unknown): value is ArticleSnapshot {
  return (
    isRecord(value) &&
    exactKeys(value, snapshotKeys) &&
    validInput(value) &&
    isMaterialId(value.id) &&
    value.unit === "Stück" &&
    Number.isSafeInteger(value.revision) &&
    (value.revision as number) >= 1
  );
}

export function isArticle(value: unknown): value is Article {
  return (
    isRecord(value) &&
    exactKeys(value, [
      ...snapshotKeys,
      "active",
      "favorite",
      "createdAt",
      "updatedAt",
    ]) &&
    validInput(value) &&
    isMaterialId(value.id) &&
    value.unit === "Stück" &&
    Number.isSafeInteger(value.revision) &&
    (value.revision as number) >= 1 &&
    typeof value.active === "boolean" &&
    typeof value.favorite === "boolean" &&
    isMaterialTimestamp(value.createdAt) &&
    isMaterialTimestamp(value.updatedAt) &&
    value.createdAt <= value.updatedAt
  );
}

export function isMeasurementEntry(value: unknown): value is MeasurementEntry {
  return (
    isRecord(value) &&
    exactKeys(value, [
      "id",
      "projectId",
      "articleId",
      "articleSnapshot",
      "delta",
      "kind",
      "createdAt",
      ...(Object.hasOwn(value, "measurementId") ? ["measurementId"] : []),
    ]) &&
    (!Object.hasOwn(value, "measurementId") ||
      isMaterialId(value.measurementId)) &&
    isMaterialId(value.id) &&
    isMaterialId(value.projectId) &&
    isMaterialId(value.articleId) &&
    isArticleSnapshot(value.articleSnapshot) &&
    value.articleSnapshot.id === value.articleId &&
    Number.isSafeInteger(value.delta) &&
    value.delta !== 0 &&
    Math.abs(value.delta as number) <= MAX_QUANTITY &&
    (value.kind === "correction" ||
      (value.kind === "add" && (value.delta as number) > 0)) &&
    isMaterialTimestamp(value.createdAt)
  );
}

export function articleSnapshot(article: Article): ArticleSnapshot {
  const { id, name, category, unit, manufacturer, series, color, revision } =
    article;
  return { id, name, category, unit, manufacturer, series, color, revision };
}

export function sameArticleSnapshot(
  first: ArticleSnapshot,
  second: ArticleSnapshot,
): boolean {
  return snapshotKeys.every((key) => first[key] === second[key]);
}

export function validateQuantity(quantity: number, positive = false): void {
  if (
    !Number.isSafeInteger(quantity) ||
    quantity < (positive ? 1 : 0) ||
    quantity > MAX_QUANTITY
  ) {
    throw new Error(
      `Bitte eine ganze ${positive ? "positive " : "nicht negative "}Menge bis ${MAX_QUANTITY.toLocaleString("de-DE")} eingeben.`,
    );
  }
}

/** Aggregate stable variant IDs; names never identify material. */
export function aggregateEntries(
  entries: readonly MeasurementEntry[],
  maxQuantity = MAX_QUANTITY,
): MaterialTotal[] {
  const totals = new Map<string, MaterialTotal>();
  for (const entry of entries) {
    const existing = totals.get(entry.articleId);
    if (existing) {
      if (!sameArticleSnapshot(existing.snapshot, entry.articleSnapshot)) {
        throw new Error("Widersprüchliche Artikelauflösungen im Aufmaß.");
      }
      existing.quantity += entry.delta;
    } else {
      totals.set(entry.articleId, {
        articleId: entry.articleId,
        snapshot: entry.articleSnapshot,
        quantity: entry.delta,
      });
    }
  }
  for (const total of totals.values()) {
    if (
      !Number.isSafeInteger(total.quantity) ||
      total.quantity < 0 ||
      total.quantity > maxQuantity
    )
      throw new Error("Ungültige Materialsumme.");
  }
  return [...totals.values()].sort((a, b) =>
    a.snapshot.name.localeCompare(b.snapshot.name, "de"),
  );
}

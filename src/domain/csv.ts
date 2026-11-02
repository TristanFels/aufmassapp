import type { MaterialTotal } from "./material";

function field(value: string): string {
  // Spreadsheet applications interpret leading formula characters, also after whitespace.
  const safe = /^[\s\uFEFF]*[=+\-@]/u.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function materialCsv(totals: readonly MaterialTotal[]): string {
  const rows = [
    [
      "Bezeichnung",
      "Kategorie",
      "Hersteller",
      "Serie",
      "Farbe",
      "Einheit",
      "Menge",
    ]
      .map(field)
      .join(";"),
  ];
  for (const { snapshot, quantity } of totals) {
    if (quantity === 0) continue;
    rows.push(
      [
        snapshot.name,
        snapshot.category,
        snapshot.manufacturer,
        snapshot.series,
        snapshot.color,
        snapshot.unit,
      ]
        .map(field)
        .concat(String(quantity))
        .join(";"),
    );
  }
  return `\uFEFF${rows.join("\r\n")}\r\n`;
}

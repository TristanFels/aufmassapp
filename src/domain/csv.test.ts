import { describe, expect, it } from "vitest";
import { materialCsv } from "./csv";
import type { MaterialTotal } from "./material";

function row(name: string): MaterialTotal {
  return {
    articleId: crypto.randomUUID(),
    quantity: 3,
    snapshot: {
      id: crypto.randomUUID(),
      name,
      category: "Schalter",
      manufacturer: "Gira",
      series: "System 55",
      color: "Reinweiß glänzend",
      unit: "Stück",
      revision: 1,
    },
  };
}

describe("CSV-Materialliste", () => {
  it("liefert UTF-8-BOM, Semikolon-Spalten und Windows-Zeilenenden", () => {
    const csv = materialCsv([row("Wippe")]);
    expect(csv).toBe(
      '\uFEFF"Bezeichnung";"Kategorie";"Hersteller";"Serie";"Farbe";"Einheit";"Menge"\r\n"Wippe";"Schalter";"Gira";"System 55";"Reinweiß glänzend";"Stück";3\r\n',
    );
  });

  it("maskiert Anführungszeichen, Trennzeichen und Zeilenumbrüche", () => {
    expect(materialCsv([row('Dose; "Spezial"\nweiß')])).toContain(
      '"Dose; ""Spezial""\nweiß"',
    );
  });

  it.each(["=SUM(A1)", "+1", "-2", "@name", " \t=1+1", "\r\n@command"])(
    "entschärft Tabellenformeln: %s",
    (name) => {
      expect(materialCsv([row(name)])).toContain(`"'${name}"`);
    },
  );

  it("schützt auch andere vom Nutzer gepflegte Textspalten", () => {
    const value = row("Dose");
    value.snapshot.category = "=1";
    value.snapshot.manufacturer = "@x";
    expect(materialCsv([value])).toContain('"\'=1";"\'@x"');
  });

  it("exportiert bei leerem Aufmaß nur die Kopfzeile und lässt Nullmengen weg", () => {
    const value = row("Dose");
    value.quantity = 0;
    expect(materialCsv([value])).toBe(materialCsv([]));
    expect(materialCsv([]).split("\r\n")).toHaveLength(2);
  });
});

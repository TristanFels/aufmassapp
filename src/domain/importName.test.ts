import { describe, expect, it } from "vitest";
import { importedProjectName } from "./importName";
import { MAX_PROJECT_NAME_LENGTH } from "./project";

describe("Erkennbare Namen importierter Projekte", () => {
  it("markiert jeden Import, auch ohne vorhandenes Projekt", () => {
    expect(importedProjectName("Baustelle 1", [])).toBe("Baustelle 1 (Import)");
  });

  it("wählt die nächste freie Nummer auch bei anders geschriebener Groß-/Kleinschreibung", () => {
    expect(
      importedProjectName("Baustelle 1", [
        "BAUSTELLE 1 (IMPORT)",
        "Baustelle 1 (Import 2)",
        "Baustelle 1 (Import 4)",
      ]),
    ).toBe("Baustelle 1 (Import 3)");
  });

  it.each([
    "Baustelle (Import)",
    "Baustelle (Import 3)",
    "Baustelle (Import) (Import 2)",
  ])("stapelt vorhandene Zusätze nicht: %s", (name) => {
    expect(importedProjectName(name, ["Baustelle (Import)"])).toBe(
      "Baustelle (Import 2)",
    );
  });

  it("behält importähnliche Bestandteile des ursprünglichen Namens", () => {
    expect(importedProjectName("Baustelle (Import) West", [])).toBe(
      "Baustelle (Import) West (Import)",
    );
  });

  it.each(["A".repeat(120), "😀".repeat(60), `${"A".repeat(110)}  Testbau`])(
    "hält das Namenslimit ein, ohne Unicode-Zeichen zu teilen (%s)",
    (name) => {
      const actual = importedProjectName(name, []);
      expect(actual.length).toBeLessThanOrEqual(MAX_PROJECT_NAME_LENGTH);
      expect(actual).toMatch(/\S \(Import\)$/u);
      expect(actual).not.toMatch(/[\uD800-\uDFFF]/u);
    },
  );

  it("erkennt auch kanonisch gleich geschriebene Unicode-Namen", () => {
    expect(importedProjectName("Büro", ["Bu\u0308ro (Import)"])).toBe(
      "Büro (Import 2)",
    );
  });
});

import type { Article } from "../domain/material";

const names: [string, string, boolean?][] = [
  ["Einfachrahmen", "Rahmen"],
  ["Doppelrahmen", "Rahmen"],
  ["Dreifachrahmen", "Rahmen"],
  ["Vierfachrahmen", "Rahmen"],
  ["Ausschalter-Einsatz", "Schalter und Taster"],
  ["Kreuzschalter-Einsatz", "Schalter und Taster"],
  ["Serienschalter-Einsatz", "Schalter und Taster"],
  ["Taster-Einsatz", "Schalter und Taster"],
  ["Wippe", "Wippen und Abdeckungen"],
  ["Serienschalterwippe", "Wippen und Abdeckungen"],
  ["Steckdose", "Steckdosen"],
  ["Steckdose mit Klappdeckel", "Steckdosen"],
  ["Herdanschlussdose", "Anschlüsse", true],
  ["Multimedia-Enddose", "Multimedia und Kommunikation"],
  ["Multimedia-Abdeckung", "Multimedia und Kommunikation"],
  ["Unterputz-TAE-Dose", "Multimedia und Kommunikation"],
  ["TAE-Abdeckung", "Multimedia und Kommunikation"],
  ["Blindabdeckung", "Wippen und Abdeckungen"],
  ["Tellerleuchte Ø mindestens 25 cm", "Leuchten", true],
  ["Multimedia-Durchgangsdose", "Multimedia und Kommunikation"],
  ["SAT-Stichdose", "Multimedia und Kommunikation"],
  ["SAT-Enddose", "Multimedia und Kommunikation"],
];

// Stable IDs and timestamps are public catalog data, never customer measurements.
export const STANDARD_ARTICLES: readonly Article[] = names.map(
  ([name, category, neutral], index) => ({
    id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    name,
    category,
    unit: "Stück",
    manufacturer: neutral ? "" : "Gira",
    series: neutral ? "" : "System 55",
    color: neutral ? "" : "Reinweiß glänzend",
    active: true,
    favorite: false,
    revision: 1,
    createdAt: "2026-11-02T00:00:00.000Z",
    updatedAt: "2026-11-02T00:00:00.000Z",
  }),
);

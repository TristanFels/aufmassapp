import { MAX_PROJECT_NAME_LENGTH } from "./project";

/** Choose a visible import label without reusing an active or archived name. */
export function importedProjectName(
  originalName: string,
  existingNames: Iterable<string>,
): string {
  // Reimporting an exported import must not stack generated labels.
  const base = originalName.replace(/(?: \(Import(?: [1-9]\d*)?\))+$/u, "");
  const key = (name: string) =>
    name.normalize("NFC").toLocaleLowerCase("de-DE");
  const taken = new Set(Array.from(existingNames, key));
  for (let number = 1; ; number += 1) {
    const suffix = number === 1 ? " (Import)" : ` (Import ${number})`;
    let stem = "";
    // Count UTF-16 units like the name validator, but never split an emoji.
    for (const character of base) {
      if (
        stem.length + character.length >
        MAX_PROJECT_NAME_LENGTH - suffix.length
      )
        break;
      stem += character;
    }
    const candidate = `${stem.trimEnd()}${suffix}`;
    if (!taken.has(key(candidate))) return candidate;
  }
}

export type MarkedKind = "bulletedList" | "numberedList" | "quote";
export function stripMarker(line: string, kind: MarkedKind) {
  return line.replace(kind === "quote" ? /^>\s?/ : kind === "numberedList" ? /^\d+\.\s?/ : /^-\s?/, "");
}
export function marker(kind: MarkedKind, index: number) {
  return kind === "quote" ? "> " : kind === "numberedList" ? (index + 1) + ". " : "- ";
}
export function normalizeMarkedText(value: string, kind: MarkedKind) {
  return value.split("\n").map((line, index) => marker(kind, index) + stripMarker(line, kind)).join("\n");
}

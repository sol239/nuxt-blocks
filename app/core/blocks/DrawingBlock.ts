import { Block } from "./Block";
import { DrawingBlockSettings } from "./DrawingBlockSettings";

export type DrawingTool = "pen" | "eraser";

export interface DrawingPoint {
  x: number;
  y: number;
}

export interface DrawingStroke {
  tool: DrawingTool;
  points: DrawingPoint[];
  width: number;
  color?: string;
}

export interface DrawingData {
  strokes: DrawingStroke[];
}

export function normalizeDrawingData(data: string | null): DrawingData {
  if (!data) return { strokes: [] };
  try {
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed?.strokes)) {
      const normalizedStrokes: DrawingStroke[] = parsed.strokes.map((s: any) => ({
        tool: s?.tool === "eraser" ? "eraser" : "pen",
        points: Array.isArray(s?.points) ? s.points : [],
        width: typeof s?.width === "number" && s.width > 0 ? s.width : (s?.tool === "eraser" ? 20 : 4),
        color: s?.tool === "eraser" ? undefined : (typeof s?.color === "string" ? s.color : "#111827"),
      }));
      return { strokes: normalizedStrokes };
    }
  } catch {
    // Ignore malformed JSON
  }
  return { strokes: [] };
}

const generateId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export class DrawingBlock extends Block<DrawingBlockSettings> {
  readonly blockType = "drawing" as const;
  blockSettings: DrawingBlockSettings;

  constructor(
    id: string = generateId(),
    version: number = 1,
    data: string | null = null,
    settings?: Partial<DrawingBlockSettings> | null,
  ) {
    super(id, version, data);
    this.blockSettings = Object.assign(new DrawingBlockSettings(), settings ?? {});
  }

  toMarkdown(): string {
    return `\`\`\`drawing\n${this.data ?? '{"strokes":[]}'}\n\`\`\``;
  }

  fromMarkdown(markdown: string): this {
    const match = markdown.match(/^```drawing\r?\n([\s\S]*?)\r?\n```$/);
    let rawJson = "";
    if (match) {
      rawJson = (match[1] ?? '{"strokes":[]}').trim();
    } else {
      rawJson = markdown
        .replace(/^```drawing\r?\n?/, "")
        .replace(/\r?\n?```$/, "")
        .trim();
    }
    const normalized = normalizeDrawingData(rawJson);
    this.data = JSON.stringify(normalized);
    return this;
  }
}

Block.registerSubclass("drawing", DrawingBlock);

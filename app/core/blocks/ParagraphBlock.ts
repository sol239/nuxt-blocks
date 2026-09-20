import { Block } from "./Block";
import { ParagraphBlockSettings } from "./ParagraphBlockSettings";

const generateId = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

export class ParagraphBlock extends Block<ParagraphBlockSettings> {
  readonly blockType = "paragraph" as const;
  blockSettings: ParagraphBlockSettings;

  constructor(
    id: string = generateId(),
    version: number = 1,
    data: string | null = null,
    settings?: Partial<ParagraphBlockSettings> | null,
  ) {
    super(id, version, data);
    this.blockSettings = Object.assign(new ParagraphBlockSettings(), settings ?? {});
  }

  toMarkdown(): string {
    return this.data ?? "";
  }

  fromMarkdown(markdown: string): this {
    this.data = markdown;
    return this;
  }
}

Block.registerSubclass("paragraph", ParagraphBlock);

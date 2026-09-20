import { Block } from "./Block";
import { QuoteBlockSettings } from "./QuoteBlockSettings";
import { normalizeMarkedText } from "./markedText";

const generateId = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

export class QuoteBlock extends Block<QuoteBlockSettings> {
  readonly blockType = "quote" as const;
  blockSettings: QuoteBlockSettings;

  constructor(
    id: string = generateId(),
    version: number = 1,
    data: string | null = "> ",
    settings?: Partial<QuoteBlockSettings> | null,
  ) {
    super(id, version, data);
    this.blockSettings = Object.assign(new QuoteBlockSettings(), settings ?? {});
  }

  toMarkdown(): string {
    if (!this.data) return "> ";
    return normalizeMarkedText(this.data, "quote");
  }

  fromMarkdown(markdown: string): this {
    this.data = normalizeMarkedText(markdown, "quote");
    return this;
  }
}

Block.registerSubclass("quote", QuoteBlock);

import { Block } from "./Block";
import { NumberedListBlockSettings } from "./NumberedListBlockSettings";
import { normalizeMarkedText } from "./markedText";

const generateId = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

export class NumberedListBlock extends Block<NumberedListBlockSettings> {
  readonly blockType = "numberedList" as const;
  blockSettings: NumberedListBlockSettings;

  constructor(
    id: string = generateId(),
    version: number = 1,
    data: string | null = "1. ",
    settings?: Partial<NumberedListBlockSettings> | null,
  ) {
    super(id, version, data);
    this.blockSettings = Object.assign(new NumberedListBlockSettings(), settings ?? {});
  }

  toMarkdown(): string {
    if (!this.data) return "1. ";
    return normalizeMarkedText(this.data, "numberedList");
  }

  fromMarkdown(markdown: string): this {
    this.data = normalizeMarkedText(markdown, "numberedList");
    return this;
  }
}

Block.registerSubclass("numberedList", NumberedListBlock);

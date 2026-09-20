import { Block } from "./Block";
import { DividerBlockSettings } from "./DividerBlockSettings";

const generateId = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

export class DividerBlock extends Block<DividerBlockSettings> {
  readonly blockType = "divider" as const;
  blockSettings: DividerBlockSettings;

  constructor(
    id: string = generateId(),
    version: number = 1,
    data: string | null = "---",
    settings?: Partial<DividerBlockSettings> | null,
  ) {
    super(id, version, data ?? "---");
    this.blockSettings = Object.assign(new DividerBlockSettings(), settings ?? {});
  }

  toMarkdown(): string {
    return "---";
  }

  fromMarkdown(markdown: string): this {
    this.data = "---";
    return this;
  }
}

Block.registerSubclass("divider", DividerBlock);

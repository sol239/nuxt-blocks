import { Block } from "./Block";
import { Heading2BlockSettings } from "./Heading2BlockSettings";

const generateId = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

export class Heading2Block extends Block<Heading2BlockSettings> {
  readonly blockType = "heading2" as const;
  blockSettings: Heading2BlockSettings;

  constructor(
    id: string = generateId(),
    version: number = 1,
    data: string | null = null,
    settings?: Partial<Heading2BlockSettings> | null,
  ) {
    super(id, version, data);
    this.blockSettings = Object.assign(new Heading2BlockSettings(), settings ?? {});
  }

  toMarkdown(): string {
    return `## ${this.data ?? ""}`.trimEnd();
  }

  fromMarkdown(markdown: string): this {
    this.data = markdown.replace(/^##\s*/, "");
    return this;
  }
}

Block.registerSubclass("heading2", Heading2Block);

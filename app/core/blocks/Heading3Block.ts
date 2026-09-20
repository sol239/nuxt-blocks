import { Block } from "./Block";
import { Heading3BlockSettings } from "./Heading3BlockSettings";

const generateId = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

export class Heading3Block extends Block<Heading3BlockSettings> {
  readonly blockType = "heading3" as const;
  blockSettings: Heading3BlockSettings;

  constructor(
    id: string = generateId(),
    version: number = 1,
    data: string | null = null,
    settings?: Partial<Heading3BlockSettings> | null,
  ) {
    super(id, version, data);
    this.blockSettings = Object.assign(new Heading3BlockSettings(), settings ?? {});
  }

  toMarkdown(): string {
    return `### ${this.data ?? ""}`.trimEnd();
  }

  fromMarkdown(markdown: string): this {
    this.data = markdown.replace(/^###\s*/, "");
    return this;
  }
}

Block.registerSubclass("heading3", Heading3Block);

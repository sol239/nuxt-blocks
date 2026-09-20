import { Block } from "./Block";
import { Heading1BlockSettings } from "./Heading1BlockSettings";

const generateId = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

export class Heading1Block extends Block<Heading1BlockSettings> {
  readonly blockType = "heading1" as const;
  blockSettings: Heading1BlockSettings;

  constructor(
    id: string = generateId(),
    version: number = 1,
    data: string | null = null,
    settings?: Partial<Heading1BlockSettings> | null,
  ) {
    super(id, version, data);
    this.blockSettings = Object.assign(new Heading1BlockSettings(), settings ?? {});
  }

  toMarkdown(): string {
    return `# ${this.data ?? ""}`.trimEnd();
  }

  fromMarkdown(markdown: string): this {
    this.data = markdown.replace(/^#\s*/, "");
    return this;
  }
}

Block.registerSubclass("heading1", Heading1Block);

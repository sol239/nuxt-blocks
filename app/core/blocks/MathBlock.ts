import { Block } from "./Block";
import { MathBlockSettings } from "./MathBlockSettings";

const generateId = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

export class MathBlock extends Block<MathBlockSettings> {
  readonly blockType = "math" as const;
  blockSettings: MathBlockSettings;

  constructor(
    id: string = generateId(),
    version: number = 1,
    data: string | null = null,
    settings?: Partial<MathBlockSettings> | null,
  ) {
    super(id, version, data);
    this.blockSettings = Object.assign(new MathBlockSettings(), settings ?? {});
  }

  toMarkdown(): string {
    return `$$\n${this.data ?? ""}\n$$`;
  }

  fromMarkdown(markdown: string): this {
    const match = markdown.match(/^\$\$([\s\S]*?)\$\$$/);
    if (match && match[1]) {
      this.data = match[1].trim();
    } else {
      this.data = markdown.replace(/^\$\$|\$\$$/g, "").trim();
    }
    return this;
  }
}

Block.registerSubclass("math", MathBlock);

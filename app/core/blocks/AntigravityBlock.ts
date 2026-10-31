import { Block } from "./Block";
import { AntigravityBlockSettings } from "./AntigravityBlockSettings";

const generateId = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

export class AntigravityBlock extends Block<AntigravityBlockSettings> {
  readonly blockType = "antigravity" as const;
  blockSettings: AntigravityBlockSettings;

  constructor(
    id: string = generateId(),
    version: number = 1,
    data: string | null = null,
    settings?: Partial<AntigravityBlockSettings> | null,
  ) {
    super(id, version, data);
    this.blockSettings = Object.assign(new AntigravityBlockSettings(), settings ?? {});
  }

  toMarkdown(): string {
    return this.data ?? "";
  }

  fromMarkdown(markdown: string): this {
    this.data = markdown;
    return this;
  }
}

Block.registerSubclass("antigravity", AntigravityBlock);

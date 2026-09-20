import { Block } from "./Block";
import { CodeBlockSettings } from "./CodeBlockSettings";

const generateId = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

export class CodeBlock extends Block<CodeBlockSettings> {
  readonly blockType = "code" as const;
  blockSettings: CodeBlockSettings;

  constructor(
    id: string = generateId(),
    version: number = 1,
    data: string | null = null,
    settings?: Partial<CodeBlockSettings> | null,
  ) {
    super(id, version, data);
    this.blockSettings = Object.assign(new CodeBlockSettings(), settings ?? {});
  }

  toMarkdown(): string {
    const lang = this.blockSettings.language ?? "";
    return `\`\`\`${lang}\n${this.data ?? ""}\n\`\`\``;
  }

  fromMarkdown(markdown: string): this {
    const match = markdown.match(/^```([a-zA-Z0-9_-]*)\r?\n([\s\S]*?)\r?\n```$/);
    if (match) {
      if (match[1]) {
        this.blockSettings.language = match[1];
      }
      this.data = match[2] ?? "";
    } else {
      this.data = markdown.replace(/^```[a-zA-Z0-9_-]*\r?\n?/, "").replace(/\r?\n?```$/, "");
    }
    return this;
  }
}

Block.registerSubclass("code", CodeBlock);

import { Block } from "./Block";
import { LinkBlockSettings } from "./LinkBlockSettings";

const generateId = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

export class LinkBlock extends Block<LinkBlockSettings> {
  readonly blockType = "link" as const;
  blockSettings: LinkBlockSettings;

  constructor(
    id: string = generateId(),
    version: number = 1,
    data: string | null = null,
    settings?: Partial<LinkBlockSettings> | null,
  ) {
    super(id, version, data);
    this.blockSettings = Object.assign(new LinkBlockSettings(), settings ?? {});
  }

  toMarkdown(): string {
    const url = this.data?.trim() ?? "";
    if (!url) return "";
    return `[${url}](${url})`;
  }

  fromMarkdown(markdown: string): this {
    const match = markdown.match(/\[.*?\]\((.*?)\)/);
    if (match && match[1]) {
      this.data = match[1].trim();
    } else {
      this.data = markdown.replace(/^<|>$/g, "").trim();
    }
    return this;
  }
}

Block.registerSubclass("link", LinkBlock);

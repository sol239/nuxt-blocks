import { Block } from "./Block";
import { ImageBlockSettings } from "./ImageBlockSettings";

const generateId = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

export class ImageBlock extends Block<ImageBlockSettings> {
  readonly blockType = "image" as const;
  blockSettings: ImageBlockSettings;

  constructor(
    id: string = generateId(),
    version: number = 1,
    data: string | null = null,
    settings?: Partial<ImageBlockSettings> | null,
  ) {
    super(id, version, data);
    this.blockSettings = Object.assign(new ImageBlockSettings(), settings ?? {});
  }

  toMarkdown(): string {
    const alt = this.blockSettings.alt || "Image";
    const data = this.data?.trim() ?? "";
    if (!data) return "#### [image] unsupported";
    if (this.blockSettings.isUrl || /^https?:\/\/|^\/|^\.\//.test(data)) {
      return `![${alt}](${data})`;
    }
    return "#### [image] unsupported";
  }

  fromMarkdown(markdown: string): this {
    const match = markdown.match(/!\[(.*?)\]\((.*?)\)/);
    if (match) {
      this.blockSettings.isUrl = true;
      this.blockSettings.alt = match[1] ?? "";
      this.data = (match[2] ?? "").trim();
    } else if (markdown.startsWith("#### [image] unsupported")) {
      this.data = "";
    } else {
      this.data = markdown.trim();
      this.blockSettings.isUrl = true;
    }
    return this;
  }
}

Block.registerSubclass("image", ImageBlock);

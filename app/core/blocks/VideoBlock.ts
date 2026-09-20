import { Block } from "./Block";
import { VideoBlockSettings } from "./VideoBlockSettings";

const generateId = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

export class VideoBlock extends Block<VideoBlockSettings> {
  readonly blockType = "video" as const;
  blockSettings: VideoBlockSettings;

  constructor(
    id: string = generateId(),
    version: number = 1,
    data: string | null = null,
    settings?: Partial<VideoBlockSettings> | null,
  ) {
    super(id, version, data);
    this.blockSettings = Object.assign(new VideoBlockSettings(), settings ?? {});
  }

  toMarkdown(): string {
    const data = this.data?.trim() ?? "";
    if (!data) return "#### [video] unsupported";
    if (this.blockSettings.isUrl || /^https?:\/\/|^\/|^\.\//.test(data)) {
      return `[Video](${data})`;
    }
    return "#### [video] unsupported";
  }

  fromMarkdown(markdown: string): this {
    const match = markdown.match(/\[.*?\]\((.*?)\)/);
    if (match && match[1]) {
      this.blockSettings.isUrl = true;
      this.data = match[1].trim();
    } else if (markdown.startsWith("#### [video] unsupported")) {
      this.data = "";
    } else if (markdown.trim().startsWith("http")) {
      this.blockSettings.isUrl = true;
      this.data = markdown.trim();
    }
    return this;
  }
}

Block.registerSubclass("video", VideoBlock);

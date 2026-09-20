import { Block } from "./Block";
import { AudioBlockSettings } from "./AudioBlockSettings";

const generateId = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

export class AudioBlock extends Block<AudioBlockSettings> {
  readonly blockType = "audio" as const;
  blockSettings: AudioBlockSettings;

  constructor(
    id: string = generateId(),
    version: number = 1,
    data: string | null = null,
    settings?: Partial<AudioBlockSettings> | null,
  ) {
    super(id, version, data);
    this.blockSettings = Object.assign(new AudioBlockSettings(), settings ?? {});
  }

  toMarkdown(): string {
    const data = this.data?.trim() ?? "";
    if (!data) return "#### [audio] unsupported";
    if (this.blockSettings.isUrl || /^https?:\/\/|^\/|^\.\//.test(data)) {
      return `[Audio](${data})`;
    }
    return "#### [audio] unsupported";
  }

  fromMarkdown(markdown: string): this {
    const match = markdown.match(/\[.*?\]\((.*?)\)/);
    if (match && match[1]) {
      this.blockSettings.isUrl = true;
      this.data = match[1].trim();
    } else if (markdown.startsWith("#### [audio] unsupported")) {
      this.data = "";
    } else if (markdown.trim().startsWith("http")) {
      this.blockSettings.isUrl = true;
      this.data = markdown.trim();
    }
    return this;
  }
}

Block.registerSubclass("audio", AudioBlock);

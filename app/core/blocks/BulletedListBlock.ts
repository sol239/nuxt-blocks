import { Block } from "./Block";
import { BulletedListBlockSettings } from "./BulletedListBlockSettings";
import { normalizeMarkedText } from "./markedText";

const generateId = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

export class BulletedListBlock extends Block<BulletedListBlockSettings> {
  readonly blockType = "bulletedList" as const;
  blockSettings: BulletedListBlockSettings;

  constructor(
    id: string = generateId(),
    version: number = 1,
    data: string | null = "- ",
    settings?: Partial<BulletedListBlockSettings> | null,
  ) {
    super(id, version, data);
    this.blockSettings = Object.assign(new BulletedListBlockSettings(), settings ?? {});
  }

  toMarkdown(): string {
    if (!this.data) return "- ";
    return normalizeMarkedText(this.data, "bulletedList");
  }

  fromMarkdown(markdown: string): this {
    this.data = normalizeMarkedText(markdown, "bulletedList");
    return this;
  }
}

Block.registerSubclass("bulletedList", BulletedListBlock);

import { Block } from './Block';
import { MarkdownBlockSettings } from './MarkdownBlockSettings';

const generateId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export class MarkdownBlock extends Block<MarkdownBlockSettings> {
  readonly blockType = 'markdown' as const;
  blockSettings: MarkdownBlockSettings;

  constructor(
    id: string = generateId(),
    version: number = 1,
    data: string | null = null,
    settings?: Partial<MarkdownBlockSettings> | null,
  ) {
    super(id, version, data);
    this.blockSettings = Object.assign(
      new MarkdownBlockSettings(),
      settings ?? {},
    );
  }

  toMarkdown(): string {
    return this.data ?? '';
  }

  fromMarkdown(markdown: string): this {
    this.data = markdown;
    return this;
  }
}

Block.registerSubclass('markdown', MarkdownBlock);

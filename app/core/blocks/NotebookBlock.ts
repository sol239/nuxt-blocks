import { Block } from './Block';
import { NotebookBlockSettings } from './NotebookBlockSettings';

const generateId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export class NotebookBlock extends Block<NotebookBlockSettings> {
  readonly blockType = 'notebook' as const;
  blockSettings: NotebookBlockSettings;

  constructor(
    id: string = generateId(),
    version: number = 1,
    data: string | null = null,
    settings?: Partial<NotebookBlockSettings> | null,
  ) {
    super(id, version, data);
    this.blockSettings = Object.assign(
      new NotebookBlockSettings(),
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

Block.registerSubclass('notebook', NotebookBlock);

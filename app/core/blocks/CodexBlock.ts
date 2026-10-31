import { Block } from './Block';
import { CodexBlockSettings } from './CodexBlockSettings';

const generateId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export class CodexBlock extends Block<CodexBlockSettings> {
  readonly blockType = 'codex' as const;
  blockSettings: CodexBlockSettings;

  constructor(
    id: string = generateId(),
    version: number = 1,
    data: string | null = null,
    settings?: Partial<CodexBlockSettings> | null,
  ) {
    super(id, version, data);
    this.blockSettings = Object.assign(
      new CodexBlockSettings(),
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

Block.registerSubclass('codex', CodexBlock);

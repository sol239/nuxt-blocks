import { Block } from './Block';
import { OllamaBlockSettings } from './OllamaBlockSettings';

const generateId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export class OllamaBlock extends Block<OllamaBlockSettings> {
  readonly blockType = 'ollama' as const;
  blockSettings: OllamaBlockSettings;

  constructor(
    id: string = generateId(),
    version: number = 1,
    data: string | null = null,
    settings?: Partial<OllamaBlockSettings> | null,
  ) {
    super(id, version, data);
    this.blockSettings = Object.assign(
      new OllamaBlockSettings(),
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

Block.registerSubclass('ollama', OllamaBlock);

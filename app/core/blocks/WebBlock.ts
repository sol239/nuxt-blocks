import { Block } from './Block';
import { WebBlockSettings } from './WebBlockSettings';

export class WebBlock extends Block<WebBlockSettings> {
  readonly blockType = 'web' as const;
  blockSettings: WebBlockSettings;

  constructor(id: string = crypto.randomUUID(), version = 1, data: string | null = '', settings?: Partial<WebBlockSettings> | null) {
    super(id, version, data);
    this.blockSettings = Object.assign(new WebBlockSettings(), settings ?? {});
  }

  toMarkdown(): string {
    const runs = this.data?.match(/`+/g) ?? [];
    const fence = '`'.repeat(Math.max(3, ...runs.map(run => run.length + 1)));
    return `${fence}web\n${this.data ?? ''}\n${fence}`;
  }

  fromMarkdown(markdown: string): this {
    const match = markdown.match(/^(`{3,})web\r?\n([\s\S]*?)\r?\n\1$/);
    return this.withData(match ? match[2]! : markdown);
  }
}

Block.registerSubclass('web', WebBlock);

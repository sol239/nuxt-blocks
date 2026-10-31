import { Block } from './Block';
import { TableBlockSettings } from './TableBlockSettings';
import { emptyTable, parseTable, tableFromMarkdown, tableToMarkdown } from './tableData';
export class TableBlock extends Block<TableBlockSettings> {
  readonly blockType = 'table' as const;
  blockSettings: TableBlockSettings;
  constructor(id: string = crypto.randomUUID(), version = 1, data: string | null = null, settings?: Partial<TableBlockSettings> | null) {
    super(id, version, data || JSON.stringify(emptyTable()));
    this.blockSettings = Object.assign(new TableBlockSettings(), settings ?? {});
  }
  toMarkdown(): string { return tableToMarkdown(parseTable(this.data)); }
  fromMarkdown(markdown: string): this { return this.withData(JSON.stringify(tableFromMarkdown(markdown))); }
}
Block.registerSubclass('table', TableBlock);

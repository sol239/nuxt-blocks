import { describe, expect, it } from 'vitest';
import { Block } from '../../app/core/blocks/Block';
import { ParagraphBlock } from '../../app/core/blocks/ParagraphBlock';
import { ParagraphBlockSettings } from '../../app/core/blocks/ParagraphBlockSettings';
import {
  parseTable,
  tableFromMarkdown,
  tableToMarkdown,
} from '../../app/core/blocks/tableData';

describe('block persistence and immutable edits', () => {
  it('preserves identity and concrete settings without mutating the original', () => {
    const original = new ParagraphBlock('paragraph-1', 3, 'Before');
    const edited = original
      .withData('After')
      .withSettings({ alignment: 'center' });
    expect(original.data).toBe('Before');
    expect(original.blockSettings.alignment).not.toBe('center');
    expect(edited).toBeInstanceOf(ParagraphBlock);
    expect(edited.blockSettings).toBeInstanceOf(ParagraphBlockSettings);
    expect(edited.id).toBe(original.id);
    expect(edited.version).toBe(3);
    const restored = Block.fromJSON(JSON.parse(JSON.stringify(edited)));
    expect(restored).toBeInstanceOf(ParagraphBlock);
    expect(restored.toJSON()).toEqual(edited.toJSON());
    expect(restored.toMarkdown()).toBe('After');
  });
});

describe('table data', () => {
  it('round trips Markdown content and column alignment', () => {
    const source = '| Name | Value |\n| :--- | ---: |\n| **Total** | 42 |';
    const table = tableFromMarkdown(source);
    expect(table.align).toEqual(['left', 'right']);
    expect(table.rows).toEqual([['**Total**', '42']]);
    expect(tableFromMarkdown(tableToMarkdown(table))).toEqual(table);
    expect(parseTable(JSON.stringify(table))).toEqual(table);
  });
  it('rejects malformed rows and invalid alignment', () => {
    expect(() =>
      parseTable(
        JSON.stringify({ header: ['A'], rows: [['x', 'y']], align: [null] }),
      ),
    ).toThrow('Invalid table data');
    expect(() =>
      parseTable(
        JSON.stringify({ header: ['A'], rows: [['x']], align: ['invalid'] }),
      ),
    ).toThrow('Invalid table data');
    expect(() => tableFromMarkdown('Plain text')).toThrow(
      'Expected one Markdown table',
    );
  });
});

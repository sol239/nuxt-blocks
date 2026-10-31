import { lexer, type Tokens } from 'marked';
export interface TableData {
  header: string[];
  rows: string[][];
  align: ('left' | 'center' | 'right' | null)[];
}
export const emptyTable = (): TableData => ({
  header: ['', ''],
  rows: [['', '']],
  align: [null, null],
});
export function tableFromToken(token: Tokens.Table): TableData {
  return {
    header: token.header.map((cell) => cell.text),
    rows: token.rows.map((row) => row.map((cell) => cell.text)),
    align: token.align,
  };
}
export function parseTable(data: string | null): TableData {
  const value = JSON.parse(data || JSON.stringify(emptyTable()));
  if (
    !value ||
    !Array.isArray(value.header) ||
    !value.header.length ||
    !value.header.every((cell: unknown) => typeof cell === 'string') ||
    !Array.isArray(value.rows) ||
    !value.rows.every(
      (row: unknown) =>
        Array.isArray(row) &&
        row.length === value.header.length &&
        row.every((cell) => typeof cell === 'string'),
    ) ||
    !Array.isArray(value.align) ||
    value.align.length !== value.header.length ||
    !value.align.every(
      (align: unknown) =>
        align === null ||
        align === 'left' ||
        align === 'center' ||
        align === 'right',
    )
  )
    throw new Error('Invalid table data.');
  return value as TableData;
}
export function tableFromMarkdown(source: string): TableData {
  const tokens = lexer(source).filter((token) => token.type !== 'space');
  if (tokens.length !== 1 || tokens[0]?.type !== 'table')
    throw new Error('Expected one Markdown table.');
  return tableFromToken(tokens[0] as Tokens.Table);
}
export function tableToMarkdown(table: TableData): string {
  const line = (cells: string[]) =>
    '| ' +
    cells
      .map((cell) => cell.replace(/(?<!\\)\|/g, '\\|').replace(/\n/g, '<br>'))
      .join(' | ') +
    ' |';
  return [
    line(table.header),
    line(
      table.align.map((align) =>
        align === 'center'
          ? ':---:'
          : align === 'right'
            ? '---:'
            : align === 'left'
              ? ':---'
              : '---',
      ),
    ),
    ...table.rows.map(line),
  ].join('\n');
}

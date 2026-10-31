export interface TodoItem {
  text: string;
  checked: boolean;
}
export interface TodoData {
  title: string;
  items: TodoItem[];
}
export function parseTodo(source: string | null): TodoData {
  const lines = (source ?? '').replace(/\r\n?/g, '\n').split('\n');
  const heading = lines[0]?.match(/^###(?:[ \t]+(.*))?$/);
  return {
    title: heading ? (heading[1] ?? '') : 'To do',
    items: lines
      .slice(heading ? 1 : 0)
      .filter((line) => line.trim())
      .map((line) => {
        const match = line.match(/^\s*- \[([ xX]?)\][ \t]*(.*)$/);
        return {
          text: match ? match[2]! : line.replace(/^\s*-\s*/, ''),
          checked: !!match && /x/i.test(match[1]!),
        };
      }),
  };
}
export function todoMarkdown(todo: TodoData): string {
  return [
    `### ${todo.title.replace(/\r?\n/g, ' ')}`,
    ...todo.items.map(
      (item) =>
        `- [${item.checked ? 'x' : ' '}] ${item.text.replace(/\r?\n/g, ' ')}`,
    ),
  ].join('\n');
}

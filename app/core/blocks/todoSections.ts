import type { Block } from './Block';
import { createBlock } from './blockClasses';

/** Repair generated checklists containing multiple headings, including headings incorrectly marked as tasks. */
export function expandTodoSections(blocks: Block[]): Block[] {
  return blocks.flatMap(block => {
    if (block.blockType !== 'todo') return [block];
    const source = (block.data ?? '').replace(/\r\n?/g, '\n');
    const lines = source.split('\n').map(line => line.replace(/^\s*- \[[ xX]?\]\s+(?=###\s)/, ''));
    const sections: string[][] = [];
    for (const line of lines) {
      if (/^###\s/.test(line) && sections.at(-1)?.some(value => value.trim())) sections.push([]);
      if (!sections.length) sections.push([]);
      sections.at(-1)!.push(line);
    }
    return sections.map((section, index) => createBlock('todo', index ? `${block.id}-section-${index}` : block.id,
      block.version, section.join('\n').trimEnd(), block.blockSettings));
  });
}

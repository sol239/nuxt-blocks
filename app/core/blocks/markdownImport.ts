import { tableFromToken } from './tableData';
import type { Token, Tokens } from 'marked';
import { mathMarkdown } from './markdownMath';
import type { Block, BlockType } from './Block';
import { createBlock } from './blockClasses';
import type { StyleSpan } from './textSpans';
import { safeUrl } from './media';
import { parseInteractiveExperience } from './interactiveExperience';

function inlineContent(source: string) {
  let data = '';
  const styles: StyleSpan[] = [];
  function visit(tokens: Token[], inherited: string[] = []) {
    for (const token of tokens) {
      const style = ({ strong: 'bold', em: 'italic', del: 'strikethrough' } as Record<string, string>)[token.type];
      if (style && 'tokens' in token && Array.isArray(token.tokens)) {
        visit(token.tokens, [...inherited, style]);
        continue;
      }
      const text = token.type === 'inlineMath' ? token.text : token.type === 'codespan'
        ? token.text.replace(/&(amp|lt|gt|quot|#39);/g, (entity: string) => ({ '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" })[entity] ?? entity)
        : token.type === 'escape' ? token.raw.slice(1) : token.type === 'br' ? '\n' : token.raw;
      const start = data.length;
      data += text;
      const active = token.type === 'inlineMath' ? [...inherited, 'math'] : token.type === 'codespan' ? [...inherited, 'code'] : inherited;
      if (data.length > start) styles.push({ start, end: data.length, style: active.join(' ') || 'normal' });
    }
  }
  visit(mathMarkdown.Lexer.lexInline(source, mathMarkdown.defaults));
  return { data, styles };
}

export function importMarkdown(source: string, codeAllowed = true): Block[] {
  // The lexer consumes reference definitions; retain documents using them intact.
  if (/^ {0,3}\[[^\]\n]+\]:[ \t]*\S/m.test(source)) return [createBlock('markdown', undefined, 1, source)];
  const blocks: Block[] = [];
  function add(type: BlockType, data: string, settings?: object) {
    blocks.push(createBlock(type, undefined, 1, data, settings));
  }
  function addText(type: BlockType, text: string) {
    const content = inlineContent(text);
    add(type, content.data, { styles: content.styles });
  }
  for (const token of mathMarkdown.lexer(source.replace(/\r\n?/g, '\n'))) {
    switch (token.type) {
      case 'space': break;
      case 'displayMath': add('math', token.text); break;
      case 'heading': {
        const heading = token as Tokens.Heading;
        if (heading.depth <= 3) addText((['heading1', 'heading2', 'heading3'] as const)[heading.depth - 1]!, heading.text);
        else add('markdown', token.raw.trimEnd());
        break;
      }
      case 'table': add('table', JSON.stringify(tableFromToken(token as Tokens.Table))); break;
      case 'hr': add('divider', '---'); break;
      case 'code': {
        const code = token as Tokens.Code;
        if (code.lang === 'web') {
          add('web', code.text);
        } else if (code.lang === 'interactive') {
          try {
            parseInteractiveExperience(code.text);
            add('interactive', code.text);
          } catch { add('markdown', token.raw.trimEnd()); }
        } else if (codeAllowed) add('code', code.text, { language: code.lang?.split(/\s+/)[0] || 'plaintext' });
        else add('markdown', token.raw.trimEnd());
        break;
      }
      case 'list': {
        const list = token as Tokens.List;
        if (list.items.every(item => item.task)) {
          const previous = blocks.at(-1);
          const title = previous?.blockType === 'heading3' ? blocks.pop()!.data : 'To do';
          add('todo', `### ${title}\n${token.raw.trimEnd()}`);
          break;
        }
        if (list.items.some(item => item.task || item.text.includes('\n'))) {
          add('markdown', token.raw.trimEnd());
          break;
        }
        const first = Number(list.start) || 1;
        const text = list.items.map((item, index) => `${list.ordered ? `${first + index}.` : '-'} ${item.text}`).join('\n');
        addText(list.ordered ? 'numberedList' : 'bulletedList', text);
        break;
      }
      case 'blockquote': addText('quote', token.raw.trimEnd()); break;
      case 'paragraph': {
        const paragraph = token as Tokens.Paragraph;
        const only = paragraph.tokens.length === 1 ? paragraph.tokens[0] : null;
        if (only?.type === 'image' && safeUrl(only.href)) add('image', only.href, { alt: only.text, isUrl: true });
        else if (only?.type === 'link' && safeUrl(only.href)) add('link', only.href);
        else addText('paragraph', paragraph.text);
        break;
      }
      default: add('markdown', token.raw.trimEnd());
    }
  }
  return blocks;
}

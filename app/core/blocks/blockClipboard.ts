import { marked, type Token } from 'marked';
import type { Block } from './Block';
import { stripMarker } from './markedText';
import { buildRenderSpans } from './textSpans';

function markdownText(source: string): string {
  function inline(tokens: Token[]): string {
    return tokens.map(token => {
      if ('tokens' in token && Array.isArray(token.tokens)) return inline(token.tokens);
      if (token.type === 'br') return '\n';
      if (token.type === 'image') return token.text;
      if (token.type === 'escape') return token.raw.slice(1);
      return token.type === 'codespan' ? token.text.replace(/&(amp|lt|gt|quot|#39);/g, (entity: string) => ({ '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" })[entity] ?? entity) : token.raw;
    }).join('');
  }
  function blocks(tokens: Token[]): string {
    return tokens.filter(token => token.type !== 'space' && token.type !== 'hr').map(token => {
      if (token.type === 'list') return token.items.map((item: { tokens: Token[] }) => blocks(item.tokens)).join('\n');
      if (token.type === 'table') return [token.header, ...token.rows].map((row: { tokens: Token[] }[]) => row.map(cell => inline(cell.tokens)).join('\t')).join('\n');
      if (token.type === 'code') return token.text;
      if ('tokens' in token && Array.isArray(token.tokens)) return token.type === 'blockquote' ? blocks(token.tokens) : inline(token.tokens);
      return token.raw;
    }).join('\n\n');
  }
  return blocks(marked.lexer(source, { gfm: true }));
}

export function blocksToText(blocks: Block[]): string {
  return blocks.map(block => {
    const data = block.data ?? '';
    switch (block.blockType) {
      case 'divider': case 'drawing': return '';
      case 'todo': case 'table': return markdownText(block.toMarkdown());
      case 'markdown': return markdownText(data);
      case 'bulletedList': case 'numberedList': case 'quote':
        return data.split('\n').map(line => stripMarker(line, block.blockType as 'bulletedList' | 'numberedList' | 'quote')).join('\n');
      case 'image': return (block.blockSettings as { alt?: string }).alt || (/^https?:\/\//.test(data) ? data : '');
      default: return data;
    }
  }).filter(Boolean).join('\n\n');
}

export function blocksToMarkdown(blocks: Block[]): string {
  const textTypes = new Set(['paragraph', 'heading1', 'heading2', 'heading3', 'bulletedList', 'numberedList', 'quote']);
  return blocks.map(block => {
    if (!textTypes.has(block.blockType) || !block.blockSettings.styles?.length) return block.toMarkdown();
    const data = block.data ?? '';
    const spans = buildRenderSpans(data, block.blockSettings.styles, []);
    let offset = 0;
    const formatted = data.split('\n').map(line => {
      const prefix = block.blockType === 'quote' ? line.match(/^>\s?/)?.[0] ?? ''
        : block.blockType === 'bulletedList' ? line.match(/^-\s?/)?.[0] ?? ''
        : block.blockType === 'numberedList' ? line.match(/^\d+\.\s?/)?.[0] ?? '' : '';
      const start = offset + prefix.length;
      const end = offset + line.length;
      const result = prefix + spans.filter(span => span.end > start && span.start < end).map(span => {
        const text = data.slice(Math.max(start, span.start), Math.min(end, span.end));
        const leading = text.match(/^\s*/)?.[0] ?? '';
        const trailing = text.match(/\s*$/)?.[0] ?? '';
        let content = text.trim();
        if (!content) return text;
        if (span.styles.includes('code')) {
          const fence = '`'.repeat(Math.max(0, ...Array.from(content.matchAll(/`+/g), match => match[0].length)) + 1);
          content = `${fence} ${content} ${fence}`;
        }
        else if (span.styles.includes('math')) content = `\\(${content}\\)`;
        if (span.styles.includes('bold')) content = `**${content}**`;
        if (span.styles.includes('italic') || span.styles.includes('inverse')) content = `*${content}*`;
        if (span.styles.includes('strikethrough')) content = `~~${content}~~`;
        if (span.styles.includes('underline')) content = `<u>${content}</u>`;
        return leading + content + trailing;
      }).join('');
      offset += line.length + 1;
      return result;
    }).join('\n');
    return block.withData(formatted).toMarkdown();
  }).join('\n\n');
}

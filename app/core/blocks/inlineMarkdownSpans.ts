import type { Token } from 'marked';
import { mathMarkdown } from './markdownMath';
import type { RenderSpan } from './textSpans';

/** Parse inline Markdown only for the rendered view; source offsets stay editable. */
export function inlineMarkdownSpans(spans: RenderSpan[]): RenderSpan[] {
  const source = spans.map((span) => span.text).join('');
  const ranges = spans.map((span) => ({ span, start: 0, end: 0 }));
  let offset = 0;
  for (const range of ranges) {
    range.start = offset;
    offset += range.span.text.length;
    range.end = offset;
  }
  const result: RenderSpan[] = [];
  let rendered = 0;
  function append(text: string, start: number, inherited: string[]) {
    if (inherited.includes('math')) {
      const original = ranges.find(
        (item) => item.start <= start && item.end > start,
      )?.span;
      const styles = [
        ...new Set([...(original?.styles ?? []), ...inherited]),
      ].filter((style) => style !== 'normal');
      result.push({
        start: rendered,
        end: rendered + text.length,
        text,
        styles,
        style: styles.join(' '),
        color: original?.color,
      });
      rendered += text.length;
      return;
    }
    for (let index = 0; index < text.length;) {
      const range = ranges.find(
        (item) => item.start <= start + index && item.end > start + index,
      );
      const length = Math.min(
        text.length - index,
        range ? Math.max(1, range.end - start - index) : text.length,
      );
      const styles = [
        ...new Set([...(range?.span.styles ?? []), ...inherited]),
      ].filter((style) => style !== 'normal');
      const part = text.slice(index, index + length);
      result.push({
        start: rendered,
        end: rendered + part.length,
        text: part,
        styles,
        style: styles.join(' ') || 'normal',
        color: range?.span.color,
      });
      rendered += part.length;
      index += length;
    }
  }
  function visit(tokens: Token[], start = 0, inherited: string[] = []) {
    let cursor = start;
    for (const token of tokens) {
      const style = (
        { strong: 'bold', em: 'italic', del: 'strikethrough' } as Record<
          string,
          string
        >
      )[token.type];
      if (style && 'tokens' in token && Array.isArray(token.tokens)) {
        const delimiter = token.type === 'em' ? 1 : 2;
        visit(token.tokens, cursor + delimiter, [...inherited, style]);
      } else if (token.type === 'inlineMath') {
        append(token.text, cursor + token.delimiter, [...inherited, 'math']);
      } else if (token.type === 'codespan') {
        const text = token.text.replace(
          /&(amp|lt|gt|quot|#39);/g,
          (entity: string) =>
            ({
              '&amp;': '&',
              '&lt;': '<',
              '&gt;': '>',
              '&quot;': '"',
              '&#39;': "'",
            })[entity] ?? entity,
        );
        append(text, cursor + (token.raw.match(/^`+/)?.[0].length ?? 1), [
          ...inherited,
          'code',
        ]);
      } else if (token.type === 'escape')
        append(token.raw.slice(1), cursor + 1, inherited);
      else append(token.raw, cursor, inherited);
      cursor += token.raw.length;
    }
  }
  // Existing toolbar code formatting treats its contents literally.
  if (spans.length && spans.every((span) => span.styles.includes('code')))
    return spans;
  // Stored code/math spans are already decoded. Never lex their LaTeX again.
  let cursor = 0;
  for (let index = 0; index < ranges.length; index++) {
    const range = ranges[index]!;
    const literal = range.span.styles.includes('math')
      ? 'math'
      : range.span.styles.includes('code')
        ? 'code'
        : null;
    if (!literal) continue;
    if (range.start > cursor)
      visit(
        mathMarkdown.Lexer.lexInline(
          source.slice(cursor, range.start),
          mathMarkdown.defaults,
        ),
        cursor,
      );
    let end = range.end;
    if (literal === 'math') {
      while (ranges[index + 1]?.span.styles.includes('math'))
        end = ranges[++index]!.end;
    }
    append(source.slice(range.start, end), range.start, [literal]);
    cursor = end;
  }
  if (cursor < source.length)
    visit(
      mathMarkdown.Lexer.lexInline(source.slice(cursor), mathMarkdown.defaults),
      cursor,
    );
  return result;
}

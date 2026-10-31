import type { Block } from './Block';
import { createBlock } from './blockClasses';
import type { StyleSpan, ColorSpan } from './textSpans';

export const A4 = {
  width: 794,
  height: 1123,
  paddingX: 48,
  paddingY: 40,
  gap: 24,
} as const;
export const A4_CONTENT_HEIGHT = A4.height - 2 * A4.paddingY;
const textTypes = new Set([
  'paragraph',
  'heading1',
  'heading2',
  'heading3',
  'bulletedList',
  'numberedList',
  'quote',
  'code',
]);

export interface PageFragment {
  key: string;
  index: number;
  part: number;
  page: number;
  top: number;
  height: number;
  start: number;
  end: number;
  cropOffset: number;
  kind: 'text' | 'viewport';
  block: Block;
}

export function isPaginatedText(block: Block): boolean {
  return (
    textTypes.has(block.blockType) &&
    !(
      block.blockType === 'code' &&
      String(
        (block.blockSettings as { language?: string }).language,
      ).toLowerCase() === 'mermaid'
    )
  );
}

function sliceSpans<T extends StyleSpan | ColorSpan>(
  spans: T[],
  start: number,
  end: number,
): T[] {
  return spans
    .filter((span) => span.end > start && span.start < end)
    .map((span) => ({
      ...span,
      start: Math.max(start, span.start) - start,
      end: Math.min(end, span.end) - start,
    }));
}

export function fragmentBlock(block: Block, start: number, end: number): Block {
  if (start === 0 && end === (block.data ?? '').length) return block;
  return block.withData((block.data ?? '').slice(start, end)).withSettings({
    ...block.blockSettings,
    styles: sliceSpans(block.blockSettings.styles ?? [], start, end),
    colors: sliceSpans(block.blockSettings.colors ?? [], start, end),
  });
}

/** Presentation-only fragments. Source blocks and their IDs are never modified. */
export function paginateBlocks(
  blocks: Block[],
  measure: (block: Block, data: string) => number,
): PageFragment[] {
  const fragments: PageFragment[] = [];
  let page = 0,
    used = 0;
  function nextPage() {
    page++;
    used = 0;
  }
  blocks.forEach((source, index) => {
    const data = source.data ?? '';
    let start = 0,
      part = 0;
    const text = isPaginatedText(source);
    if (!text || measure(source, data.slice(0, 1)) > A4_CONTENT_HEIGHT) {
      let remaining = Math.max(1, measure(source, data)),
        cropOffset = 0;
      // Move ordinary indivisible blocks intact when they fit a fresh page.
      if (
        remaining <= A4_CONTENT_HEIGHT &&
        used + remaining > A4_CONTENT_HEIGHT
      )
        nextPage();
      while (remaining > 0) {
        if (used >= A4_CONTENT_HEIGHT - 1) nextPage();
        const height = Math.min(remaining, A4_CONTENT_HEIGHT - used);
        fragments.push({
          key: `${source.id}:${part}`,
          index,
          part: part++,
          page,
          top: used,
          height,
          start: 0,
          end: data.length,
          cropOffset,
          kind: 'viewport',
          block: source,
        });
        used += height;
        remaining -= height;
        cropOffset += height;
      }
      return;
    }
    do {
      const available = A4_CONTENT_HEIGHT - used;
      if (measure(source, data.slice(start, start + 1)) > available) {
        nextPage();
        continue;
      }
      let end = data.length;
      if (measure(source, data.slice(start)) > available) {
        let low = start + 1,
          high = data.length;
        while (low < high) {
          const mid = Math.ceil((low + high) / 2);
          if (measure(source, data.slice(start, mid)) <= available) low = mid;
          else high = mid - 1;
        }
        end = low;
        // Prefer a complete line/word without dropping its separating whitespace.
        const chunk = data.slice(start, end);
        const newline = chunk.lastIndexOf('\n');
        const space = chunk.search(/\s+\S*$/u);
        if (newline >= 0) end = start + newline + 1;
        else if (space > 0) end = start + space + 1;
        // Never cut a UTF-16 surrogate pair in half.
        if (end < data.length && /[\uDC00-\uDFFF]/u.test(data[end]!)) end--;
        if (end <= start) {
          nextPage();
          continue;
        }
      }
      const block = fragmentBlock(source, start, end);
      const height = Math.max(1, measure(source, block.data ?? ''));
      fragments.push({
        key: `${source.id}:${part}`,
        index,
        part: part++,
        page,
        top: used,
        height,
        start,
        end,
        cropOffset: 0,
        kind: 'text',
        block,
      });
      used += height;
      start = end;
      if (start < data.length) nextPage();
    } while (start < data.length);
  });
  return fragments;
}

function mergeSpans<T extends StyleSpan | ColorSpan>(
  original: T[],
  replacement: T[],
  start: number,
  end: number,
  delta: number,
): T[] {
  const before = original
    .filter((span) => span.start < start)
    .map((span) => ({ ...span, end: Math.min(span.end, start) }));
  const after = original
    .filter((span) => span.end > end)
    .map((span) => ({
      ...span,
      start: Math.max(span.start, end) + delta,
      end: span.end + delta,
    }));
  return [
    ...before,
    ...replacement.map((span) => ({
      ...span,
      start: span.start + start,
      end: span.end + start,
    })),
    ...after,
  ];
}

/** Merge a page edit into the original record, retaining all other page content. */
export function mergeFragmentEdit(
  source: Block,
  fragment: PageFragment,
  updated: Block,
): Block {
  if (source.id !== fragment.block.id || updated.id !== source.id)
    return source;
  if (fragment.kind === 'viewport') return updated;
  if (updated.blockType !== source.blockType) {
    return createBlock(
      updated.blockType,
      source.id,
      source.version,
      source.data,
      {
        ...updated.blockSettings,
        styles: source.blockSettings.styles,
        colors: source.blockSettings.colors,
      },
    );
  }
  const data = source.data ?? '';
  // Reject a stale view rather than overwrite a concurrent source edit.
  if (data.slice(fragment.start, fragment.end) !== (fragment.block.data ?? ''))
    return source;
  const replacement = updated.data ?? '';
  const delta = replacement.length - (fragment.end - fragment.start);
  return source
    .withData(
      data.slice(0, fragment.start) + replacement + data.slice(fragment.end),
    )
    .withSettings({
      ...updated.blockSettings,
      styles: mergeSpans(
        source.blockSettings.styles ?? [],
        updated.blockSettings.styles ?? [],
        fragment.start,
        fragment.end,
        delta,
      ),
      colors: mergeSpans(
        source.blockSettings.colors ?? [],
        updated.blockSettings.colors ?? [],
        fragment.start,
        fragment.end,
        delta,
      ),
    });
}

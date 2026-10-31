import { parseTable, tableFromToken } from './tableData';
import { importMarkdown } from './markdownImport';
import { lexer, type Tokens } from 'marked';
import { blockClasses, createBlock } from './blockClasses';
import { settingsClasses } from './settings';
import { parseInteractiveExperience } from './interactiveExperience';
import type { Block, BlockType } from './Block';

interface GenerationOptions { complete?: boolean; onError?: (message: string) => void }
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const knownType = (value: unknown): value is BlockType => typeof value === 'string' && Object.hasOwn(blockClasses, value);
const aliases: Record<string, string> = { html: 'web', htm: 'web', latex: 'math' };

function settingsFor(type: BlockType, value: unknown): object {
  if (value === undefined) return {};
  if (!object(value)) throw new Error('blockSettings must be an object.');
  const defaults = new settingsClasses[type]() as unknown as Record<string, unknown>;
  const optional: Record<string, string> = { width: 'number', height: 'number', fontSize: 'number', fontFamily: 'string' };
  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (['__proto__', 'constructor', 'prototype'].includes(key)) throw new Error('Invalid setting key.');
    if (!Object.hasOwn(defaults, key) && !Object.hasOwn(optional, key)) throw new Error(`Unknown ${type} setting: ${key}.`);
    if (key === 'alignment' && !['left', 'center', 'right'].includes(String(item))) throw new Error('Invalid alignment.');
    if (Array.isArray(defaults[key])) {
      if (!Array.isArray(item) || !item.every(span => object(span) && Number.isInteger(span.start) && Number.isInteger(span.end)
        && Number(span.start) >= 0 && Number(span.end) >= Number(span.start)
        && typeof span[key === 'colors' ? 'color' : 'style'] === 'string')) throw new Error(`Invalid ${key} spans.`);
    } else {
      const expected = optional[key] ?? typeof defaults[key];
      if (typeof item !== expected || (typeof item === 'number' && (!Number.isFinite(item) || item <= 0))) throw new Error(`Invalid ${key} setting.`);
    }
    result[key] = item;
  }
  return result;
}

function dataFor(type: BlockType, value: unknown): string | null {
  let data = value;
  if ((type === 'interactive' || type === 'drawing' || type === 'table') && object(data)) data = JSON.stringify(data);
  if (data !== null && typeof data !== 'string') throw new Error('data must be text (or JSON for Interactive/Drawing).');
  if (type === 'table') return JSON.stringify(parseTable(data as string | null));
  if (type === 'interactive') return JSON.stringify(parseInteractiveExperience(data as string | null));
  if (type === 'drawing') {
    const drawing: unknown = JSON.parse((data as string | null) || '{"strokes":[]}');
    if (!object(drawing) || !Array.isArray(drawing.strokes) || !drawing.strokes.every(stroke => object(stroke)
      && ['pen', 'eraser'].includes(String(stroke.tool)) && typeof stroke.width === 'number' && Number.isFinite(stroke.width) && stroke.width > 0
      && (stroke.color === undefined || typeof stroke.color === 'string') && Array.isArray(stroke.points)
      && stroke.points.every(point => object(point) && typeof point.x === 'number' && Number.isFinite(point.x) && typeof point.y === 'number' && Number.isFinite(point.y)))) throw new Error('Invalid drawing strokes.');
    return JSON.stringify(drawing);
  }
  return data as string | null;
}

function closedFence(raw: string): boolean {
  const opening = raw.match(/^\s{0,3}(`{3,}|~{3,})/);
  if (!opening) return false;
  const fence = opening[1]!;
  const last = raw.trimEnd().split('\n').at(-1)?.trim() || '';
  return last.length >= fence.length && [...last].every(character => character === fence[0]);
}

/** Completed typed fences become native blocks; incomplete payloads never mount active components. */
export function generatedBlocks(markdown: string, runId: string, options: GenerationOptions = {}): Block[] {
  const blocks: Block[] = [];
  const tokens = lexer(markdown).filter(token => token.type !== 'space');
  tokens.forEach((token, index) => {
    let type: BlockType = 'markdown', data: string | null = token.raw.trimEnd();
    let settings: object = {};
    if (token.type === 'heading' && token.depth <= 3) { type = ('heading' + token.depth) as BlockType; data = token.text; }
    else if (token.type === 'table') { type = 'table'; data = JSON.stringify(tableFromToken(token as Tokens.Table)); }
    else if (token.type === 'hr') { type = 'divider'; data = '---'; }
    else if (token.type === 'list') {
      if ((token as Tokens.List).items.every(item => item.task)) {
        type = 'todo';
        const previous = blocks.at(-1);
        const title = previous?.blockType === 'heading3' ? blocks.pop()!.data : 'To do';
        data = `### ${title}\n${token.raw.trimEnd()}`;
      } else type = token.ordered ? 'numberedList' : 'bulletedList';
    }
    else if (token.type === 'blockquote') { type = 'quote'; }
    else if (token.type === 'code') {
      const language = (token.lang || '').trim().split(/\s/)[0]!;
      const candidate = aliases[language] || language;
      const typed = language === 'rvn-block' || (knownType(candidate) && candidate !== 'code');
      if (typed && !closedFence(token.raw) && options.complete === false) return;
      try {
        if (typed && !closedFence(token.raw)) throw new Error('The generated block was incomplete.');
        if (language === 'rvn-block') {
          const value: unknown = JSON.parse(token.text);
          if (!object(value) || !knownType(value.blockType)) throw new Error('Unknown or missing blockType.');
          type = value.blockType;
          data = dataFor(type, value.data ?? null);
          settings = settingsFor(type, value.blockSettings);
        } else if (typed && knownType(candidate)) {
          type = candidate; data = dataFor(type, token.text);
        } else { type = 'code'; data = token.text; settings = { language: language || 'plaintext' }; }
      } catch (cause) {
        if (options.complete === false) return;
        options.onError?.(`A generated block was kept as code: ${cause instanceof Error ? cause.message : 'Invalid block data.'}`);
        type = 'code'; data = token.text; settings = { language: language === 'rvn-block' ? 'json' : language || 'plaintext' };
      }
    }
    if (type === 'markdown' && data && lexer(data).some(item => item.type === 'table')) {
      importMarkdown(data).forEach((block, child) => blocks.push(createBlock(block.blockType, `${runId}-${index}-${child}`, 1, block.data, { ...settings, ...block.blockSettings })));
      return;
    }
    blocks.push(createBlock(type, runId + '-' + index, 1, data, settings));
  });
  return blocks;
}

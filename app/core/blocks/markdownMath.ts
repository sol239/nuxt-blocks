import { Marked, type TokenizerExtension } from 'marked';
import katex from 'katex';

// Tokenize before Markdown escapes/emphasis can consume LaTeX delimiters or contents.
const displayMath: TokenizerExtension = {
  name: 'displayMath',
  level: 'block',
  start: (source) => source.search(/\\{1,2}\[|\$\$/),
  tokenizer(source) {
    const match =
      /^(?:(\\{1,2})\[([\s\S]*?)\1\]|\$\$([\s\S]*?)\$\$)(?:[ \t]*(?:\n|$))?/.exec(
        source,
      );
    if (match)
      return {
        type: 'displayMath',
        raw: match[0],
        text: (match[2] ?? match[3] ?? '').trim(),
      };
  },
};
const inlineMath: TokenizerExtension = {
  name: 'inlineMath',
  level: 'inline',
  start: (source) => source.search(/\\{1,2}\(|\$(?!\$)/),
  tokenizer(source) {
    const match = /^(\\{1,2})\(([^\n]*?)\1\)/.exec(source);
    if (match)
      return {
        type: 'inlineMath',
        raw: match[0],
        text: match[2],
        delimiter: match[1]!.length + 1,
      };
    // Scan dollar math explicitly. An alternation matching backslashes both as
    // escapes and ordinary characters causes exponential backtracking on pasted
    // Mermaid CSS (e.g. [id$="..."] followed by many escaped underscores).
    if (source[0] !== '$' || !source[1] || /[\s$]/.test(source[1])) return;
    for (let index = 1; index < source.length; index++) {
      const character = source[index];
      if (character === '\n') return;
      if (character === '\\') {
        if (source[index + 1] === '\n') return;
        index++;
        continue;
      }
      if (character !== '$') continue;
      if (
        index === 1 ||
        /\s/.test(source[index - 1]!) ||
        /[\d$]/.test(source[index + 1] ?? '')
      )
        return;
      return {
        type: 'inlineMath',
        raw: source.slice(0, index + 1),
        text: source.slice(1, index),
        delimiter: 1,
      };
    }
  },
};
export function createMathMarkdown() {
  return new Marked({
    gfm: true,
    extensions: [
      {
        ...displayMath,
        renderer: (token) =>
          katex.renderToString(token.text, {
            displayMode: true,
            throwOnError: false,
            trust: false,
          }),
      },
      {
        ...inlineMath,
        renderer: (token) =>
          katex.renderToString(token.text, {
            displayMode: false,
            throwOnError: false,
            trust: false,
          }),
      },
    ],
  });
}
export const mathMarkdown = createMathMarkdown();

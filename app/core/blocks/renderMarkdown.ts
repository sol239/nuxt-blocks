import { Renderer } from 'marked';
import { createMathMarkdown } from './markdownMath';
import { safeUrl } from './media';

const escapeHtml = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        character
      ]!,
  );
const renderer = new Renderer();
// Markdown previews display raw HTML as text and allow only HTTP(S) links.
renderer.html = ({ text }) => escapeHtml(text);
renderer.link = function ({ href, tokens }) {
  const text = this.parser.parseInline(tokens);
  const url = safeUrl(href);
  return url
    ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${text}</a>`
    : text;
};
renderer.image = ({ text }) => escapeHtml(text);
const markdown = createMathMarkdown().use({ breaks: false, renderer });

export function renderMarkdown(source: string): string {
  return markdown.parse(source, { async: false });
}

/** Render a single text field with the same safe Markdown rules as block previews. */
export function renderInlineMarkdown(source: string): string {
  return markdown.parseInline(source, { async: false });
}

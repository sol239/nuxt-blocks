# Blocks

Every block receives a `Block` instance through `v-model:block` and renders inside `BlockWrapper`.
The page's block list lives in `useBlocksStore`, with actions to add and delete blocks.
Wrappers have no background or border. Hover or focus a block to reveal its four-dot actions button;
open it to delete the block. Escape or clicking outside closes the menu. On touch devices the button stays visible.
The icon on the right identifies the block type and appears when the wrapper is hovered or focused.
The actions dropdown also contains a three-button
left, center, and right alignment control, which updates the block's `IBlockSettings.alignment` value.
The block holds `id`, `version`, `data`, `blockType`, and `blockSettings`.
Each type has its own settings class implementing `IBlockSettings` directly. There is no shared settings base class.
All settings include `alignment` (left, center, right, or justify).
Edits preserve identity, version, and settings. JSON restoration recreates the corresponding settings class.

Use the block picker to add a block. Code and math are enabled by default through
`AppConfiguration.codeBlocksAllowed` and `mathAllowed`. The text toolbar appears below the page blocks.

For an empty paragraph, heading, bulleted list, numbered list, or quote, press Backspace twice
to delete the block. List markers (`-`, `1.`, and `>`) do not count as content.

### Standard Block Types

#### Paragraph

Data is plain text. Settings: `ParagraphBlockSettings`.

##### Keyboard shortcuts

Enter inserts a newline. Alt+Enter inserts and focuses a paragraph after this block.

#### Heading 1

Data is heading text. Settings: `Heading1BlockSettings`.

##### Keyboard shortcuts

Alt+Enter inserts and focuses a paragraph after this block.

#### Heading 2

Data is heading text. Settings: `Heading2BlockSettings`.

##### Keyboard shortcuts

Alt+Enter inserts and focuses a paragraph after this block.

#### Heading 3

Data is heading text. Settings: `Heading3BlockSettings`.

##### Keyboard shortcuts

Alt+Enter inserts and focuses a paragraph after this block.

#### Divider

Data is `---`. Renders a horizontal rule. Settings: `DividerBlockSettings`.

##### Keyboard shortcuts

Tab focuses the wrapper. Alt+Enter inserts and focuses a paragraph after the divider.

#### Bulleted List

Data contains one item per line, e.g. `- First item\n- Second item`.
The editor maintains the markers and shows a list preview. Settings: `BulletedListBlockSettings`.

##### Keyboard shortcuts

Enter continues the list with `- `. Alt+Enter inserts and focuses a paragraph after the list.

#### Numbered List

Data contains one item per line, e.g. `1. First item\n2. Second item`.
The editor maintains sequential numbering. Settings: `NumberedListBlockSettings`.

##### Keyboard shortcuts

Enter adds the next numbered item. Alt+Enter inserts and focuses a paragraph after the list.

#### Quote

Data contains `> ` before each line, e.g. `> Quoted text`. Settings: `QuoteBlockSettings`.

##### Keyboard shortcuts

Enter continues the quote with `> `. Alt+Enter inserts and focuses a paragraph after the quote.

#### Link

Data is only the URL. HTTP and HTTPS URLs render as clickable links.
Settings: `LinkBlockSettings`.

##### Keyboard shortcuts

Tab focuses the URL field or link; Enter opens the focused link.
Alt+Enter inserts and focuses a paragraph after this block.

#### Image

Data is a URL when `ImageBlockSettings.isUrl` is true; otherwise it is base64.
Settings also include `mimeType` and `alt`. File upload stores raw base64 and the file MIME type.
The base64 editor also accepts a data URL with a matching MIME type setting.

##### Keyboard shortcuts

Tab moves between source, upload, and alternative-text controls.
Space toggles the focused URL checkbox. Alt+Enter inserts a paragraph after this block.

#### Video

Data is a direct media URL when `VideoBlockSettings.isUrl` is true; otherwise it is base64.
Settings also include `mimeType` and `controls`. Uploads store raw base64.
Use a direct playable video URL, not a YouTube or other sharing-page URL.

##### Keyboard shortcuts

Tab moves through the source and native player controls.
Space toggles a focused checkbox or native player button.
Alt+Enter inserts a paragraph after this block.

#### Audio

Data is a direct audio URL when `AudioBlockSettings.isUrl` is true; otherwise it is base64.
Settings also include `mimeType` and `controls`. Uploads store raw base64.

##### Keyboard shortcuts

Tab moves through the source and native player controls.
Space toggles a focused checkbox or native player button.
Alt+Enter inserts a paragraph after this block.

---

### Optional Block Types

#### Code (uses Monaco Editor)

Data is only the source code; no fences or language metadata.
`CodeBlockSettings.language` stores the selected language.
Supported choices: plaintext, JavaScript, TypeScript, HTML (`markup`), CSS, Python, JSON, and Bash.
Editing, highlighting, and language services use [Monaco Editor](https://github.com/microsoft/monaco-editor),
with a customized JetBrains Fleet dark theme and Vite-built language workers.

##### Keyboard shortcuts

Monaco provides its standard editor shortcuts, including Enter for a newline and Ctrl+] (Cmd+] on macOS)
to indent a line. Alt+Enter inserts a paragraph after this block.

#### Math (uses KaTeX)

Data is LaTeX source without dollar-sign delimiters.
`MathBlockSettings.displayMode` selects display or inline rendering.
Uses [KaTeX rendering options](https://katex.org/docs/options) with untrusted commands disabled
and invalid expressions displayed as errors without interrupting editing.

##### Keyboard shortcuts

Enter inserts a newline. Tab moves between the display checkbox and source.
Alt+Enter inserts a paragraph after this block.

---

### Layouts

### Development checks

Run `npm run typecheck` and `npm run build`.
For the regression tests, install Chromium once with `npx playwright install chromium`,
then run `npm test` after building. Tests cover settings restoration, data formats,
and browser editing for all block types.

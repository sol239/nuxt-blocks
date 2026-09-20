# nuxt-blocks

An extensible, modular rich-text, media, math, and code block editor for Nuxt 3 and Nuxt 4.

## Quick Start & Installation

Run the interactive setup wizard to configure the module and choose which optional capabilities to enable:

```bash
npx nuxt-blocks init
# or directly from GitHub:
npx github:sol239/blocks init
```

The interactive CLI will prompt you with checkboxes:
- **Monaco Code Editor**: Installs `monaco-editor` and `@monaco-editor/loader`
- **LaTeX Math Rendering**: Installs `katex`
- **Drawing Canvas**: Installs `pixi.js`

It will automatically update your `nuxt.config.ts` and install the selected dependencies.

### Installation

Install from npm:

```bash
npm install nuxt-blocks
```

Or install directly from GitHub (https://github.com/sol239/blocks):

```bash
npm install github:sol239/blocks
# or:
npm install https://github.com/sol239/blocks
# or with pnpm:
pnpm add github:sol239/blocks
# or with yarn:
yarn add github:sol239/blocks
```

And add it to your `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  modules: [
    ['nuxt-blocks', {
      code: false,    // Default: false. Enables Monaco code editor blocks
      math: false,    // Default: false. Enables KaTeX math blocks and inline math in toolbar
      drawing: false, // Default: false. Enables Pixi.js drawing blocks
    }]
  ]
})
```

When optional capabilities are disabled (`false` by default):
- Block types (`code`, `math`, `drawing`) are excluded from the wrapper's "Turn into" menu.
- Inline math is hidden from the text formatting toolbar, and math shortcuts are disabled.
- Heavy dependencies (`monaco-editor`, `katex`, `pixi.js`) are neither required nor bundled.

---

## How to Use

`nuxt-blocks` offers two primary integration patterns depending on your use case:

### 1) Using `BlockCanvas` (Full Document Editor)

`BlockCanvas` is the all-in-one document editor. It renders the full array of blocks, manages focus, block addition, deletion, turn-into transformation menus, and keyboard shortcuts. Pair it with `TextToolbar` for rich-text inline formatting (bold, italic, colors, math, fonts).

```vue
<template>
  <div class="max-w-4xl mx-auto py-8">
    <BlockCanvas
      :blocks="blocks"
      @add="onAddBlock"
      @add-after="onAddBlock('paragraph', $event)"
      @delete="onDeleteBlock"
      @update:block="onUpdateBlock"
      @focused-block="focusedBlock = $event"
    />

    <!-- Formatting toolbar floats when a text block is active -->
    <TextToolbar
      :visible="Boolean(focusedBlock)"
      :block="focusedBlock"
      @update:block="onUpdateBlock"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import {
  ParagraphBlock,
  Heading1Block,
  Heading2Block,
  type Block,
  type BlockType,
} from "nuxt-blocks";

const blocks = ref<Block[]>([
  new Heading1Block("b1", 1, "Welcome to My Page"),
  new ParagraphBlock("b2", 1, "Start typing your notes here with full markdown and rich-text spans support..."),
]);

const focusedBlock = ref<Block | null>(null);

function onUpdateBlock(updated: Block) {
  const index = blocks.value.findIndex((b) => b.id === updated.id);
  if (index !== -1) {
    blocks.value[index] = updated;
  }
}

function onDeleteBlock(id: string) {
  blocks.value = blocks.value.filter((b) => b.id !== id);
}

function onAddBlock(type: BlockType, afterIndex?: number) {
  // Add new block logic or use createBlock(type, ...)
}
</script>
```

---

### 2) Using Distinct Block Components (Standalone Block Units)

Every block component can also be used directly on its own, allowing you to embed individual block types inside custom cards, modals, sidebars, or custom layout builders without mounting the full canvas.

You can render them standalone or wrap them inside `<BlockWrapper>` to include the hover actions button, alignment controls, and deletion menu.

#### Available Distinct Block Components

| Component | Class | Stored Data |
|---|---|---|
| `<ParagraphBlock>` | `ParagraphBlock` | Plain text with rich style/color spans |
| `<Heading1Block>` | `Heading1Block` | Heading 1 text |
| `<Heading2Block>` | `Heading2Block` | Heading 2 text |
| `<Heading3Block>` | `Heading3Block` | Heading 3 text |
| `<CodeBlock>` | `CodeBlock` | Code string (requires `code: true`) |
| `<MathBlock>` | `MathBlock` | LaTeX formula string (requires `math: true`) |
| `<DrawingBlock>` | `DrawingBlock` | Pixi stroke data (requires `drawing: true`) |
| `<BulletedListBlock>` | `BulletedListBlock` | Markdown `- ` lines |
| `<NumberedListBlock>` | `NumberedListBlock` | Markdown `1. ` lines |
| `<QuoteBlock>` | `QuoteBlock` | Markdown `> ` lines |
| `<DividerBlock>` | `DividerBlock` | Fixed `---` horizontal rule |
| `<LinkBlock>` | `LinkBlock` | Clickable link URL |
| `<ImageBlock>` | `ImageBlock` | Image URL / base64 |
| `<VideoBlock>` | `VideoBlock` | Video URL / base64 |
| `<AudioBlock>` | `AudioBlock` | Audio URL / base64 |

#### Example: Standalone Embedding with & without `BlockWrapper`

```vue
<template>
  <div class="space-y-6 max-w-2xl mx-auto p-4">
    <!-- 1. Standalone Heading Block -->
    <Heading1Block
      :block="heading"
      @update:block="heading = $event"
    />

    <!-- 2. Standalone Paragraph wrapped in BlockWrapper for actions & alignment -->
    <BlockWrapper
      :block="paragraph"
      @update:block="paragraph = $event"
    >
      <ParagraphBlock
        :block="paragraph"
        @update:block="paragraph = $event"
      />
    </BlockWrapper>

    <!-- 3. Standalone Code Editor block -->
    <CodeBlock
      :block="code"
      @update:block="code = $event"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import {
  Heading1Block,
  ParagraphBlock,
  CodeBlock,
  CodeBlockSettings,
} from "nuxt-blocks";

const heading = ref(new Heading1Block("title", 1, "Section Title"));
const paragraph = ref(new ParagraphBlock("para", 1, "Editable single paragraph component."));
const code = ref(
  new CodeBlock(
    "code",
    1,
    'console.log("Embedded code block");',
    new CodeBlockSettings({ language: "typescript" }),
  ),
);
</script>
```

---

## Architecture & Concepts

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

Code, math, and drawing blocks are gated via `AppConfiguration.codeBlocksAllowed`, `mathAllowed`, and `drawingBlocksAllowed` (all default to `false`). The text toolbar appears below the page blocks.

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

#### Drawing (uses PixiJS)

Data contains stroke points serialized as JSON (`{"strokes": [...]}`).
Settings: `DrawingBlockSettings`.
Uses PixiJS for high-frequency client-side rendering while preserving immutable block updates on pointer release.

##### Pointer interaction

Pointer down initiates a stroke, pointer move renders local points with high refresh rate, and pointer release commits the stroke as an immutable block data update.
Alt+Enter inserts a paragraph after this block.

---

### Layouts

### Development checks

Run `npm run typecheck` and `npm run build`.
For the regression tests, install Chromium once with `npx playwright install chromium`,
then run `npm test` after building. Tests cover settings restoration, data formats,
and browser editing for all block types.

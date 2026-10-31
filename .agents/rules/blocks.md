# Blocks Architecture & Developer Guide for AI Agents

This guide is the single source of truth for developing, maintaining, and extending the **Blocks** application. Every AI agent working on this codebase must follow the architectural patterns, contracts, and invariants detailed below.

---

## 1. Project Overview & Tech Stack

- **Framework**: Nuxt 4 (Vue 3, `<script setup lang="ts">`, Composition API).
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`, `@reference "tailwindcss"`).
- **State Management**: Pinia (`useTypingStore` for active text formatting & selection, `useBlocksStore` for page-level state).
- **Code Editor**: Monaco Editor via `@monaco-editor/loader`, JetBrains Fleet dark theme, Vite worker plugins (`app/plugins/monaco.client.ts`).
- **Math Rendering**: KaTeX (`katex` + `katex/dist/katex.min.css`) used for `MathBlock` and inline math spans.
- **Icons**: Nuxt Icon (`@nuxt/icon` with `@iconify-json/material-symbols`).
- **Testing & Quality**: Playwright (`tests/blocks.spec.ts`), Vue TSC (`npx nuxi typecheck`).

---

## 2. Core Domain Model & Polymorphic Contracts

### 2.1 The `Block` Base Class
Located at `app/core/blocks/Block.ts`. Every block in the application inherits from this base class:
- **Properties**:
  - `id: string`: Unique block identifier (UUID or stable key).
  - `version: number`: Version counter for optimistic updates / history.
  - `data: string | null`: Raw textual payload (e.g. paragraph text, markdown marker text, image URL/base64, code snippet, LaTeX formula).
  - `blockType: BlockType | null`: One of the 14 recognized block types.
  - `blockSettings: IBlockSettings`: Concrete settings instance implementing `IBlockSettings`.
- **Abstract / Polymorphic Methods**:
  - `abstract toMarkdown(): string`: Serializes block state to Markdown representation.
  - `abstract fromMarkdown(markdown: string): Block`: Deserializes Markdown into a concrete block instance.
- **Immutable Updates**:
  - `withData(data: string | null): this`: Returns a new block instance preserving id, version, type, and settings.
  - `withSettings(settings: any): this`: Returns a new block instance preserving id, version, type, and data.
- **Serialization**:
  - `toJSON()`: Emits a plain JSON-serializable snapshot.
  - `Block.fromJSON(json)`: Re-instantiates the correct concrete `Block` subclass and concrete `IBlockSettings` class via `registry.ts`.
  - Nuxt hydration preserves concrete class instances via `app/plugins/block-payload.ts`.

### 2.2 The 15 Block Subclasses & Concrete Settings
Each block type has its own concrete class extending `Block` (`app/core/blocks/blockClasses.ts`) and its own concrete settings class implementing `IBlockSettings` directly:

| Block Type | Block Class | Settings Class | Stored `data` Format |
|---|---|---|---|
| `paragraph` | `ParagraphBlock` | `ParagraphBlockSettings` | Raw plain text |
| `heading1` | `Heading1Block` | `Heading1BlockSettings` | Heading level 1 text |
| `heading2` | `Heading2Block` | `Heading2BlockSettings` | Heading level 2 text |
| `heading3` | `Heading3Block` | `Heading3BlockSettings` | Heading level 3 text |
| `divider` | `DividerBlock` | `DividerBlockSettings` | Fixed as `---` |
| `bulletedList`| `BulletedListBlock`| `BulletedListBlockSettings` | Markdown lines: `- item` |
| `numberedList`| `NumberedListBlock`| `NumberedListBlockSettings` | Markdown lines: `1. item` |
| `quote` | `QuoteBlock` | `QuoteBlockSettings` | Markdown lines: `> item` |
| `link` | `LinkBlock` | `LinkBlockSettings` | Plain URL |
| `image` | `ImageBlock` | `ImageBlockSettings` | URL or base64 data string |
| `video` | `VideoBlock` | `VideoBlockSettings` | URL or base64 data string |
| `audio` | `AudioBlock` | `AudioBlockSettings` | URL or base64 data string |
| `code` | `CodeBlock` | `CodeBlockSettings` | Source code string |
| `math` | `MathBlock` | `MathBlockSettings` | LaTeX string (e.g. `E = mc^2`) |
| `drawing` | `DrawingBlock` | `DrawingBlockSettings` | JSON string: `{"strokes":[...]}` |

> [!IMPORTANT]
> **No Shared Settings Base Class**: Do NOT create a shared base class for settings. Each settings class must directly implement `IBlockSettings`.
> All block modifications must return a new instance via `.withData(...)` or `.withSettings(...)`. Never mutate blocks in place.

---

## 3. Rich Text Formatting & Span Architecture

Located in `app/core/blocks/textSpans.ts`. Text blocks (`paragraph`, `heading1`, `heading2`, `heading3`, `bulletedList`, `numberedList`, `quote`) support inline formatting, text coloring, and rounded highlights via compact range-based spans. Highlight colors are stored as `highlight:#rrggbb` tokens in `StyleSpan.style`; this preserves them through existing immutable block updates, JSON persistence, and text reconciliation. Use `applyHighlightToRange` to recolor/remove highlights while preserving other styles, and `highlightColor` to read them.

### 3.1 Data Structures
```ts
export interface StyleSpan {
  start: number; // 0-based character index (inclusive)
  end: number;   // 0-based character index (exclusive)
  style: string; // "normal", "bold", "italic", "underline", "strikethrough", "code", "math"
}

export interface ColorSpan {
  start: number; // 0-based character index (inclusive)
  end: number;   // 0-based character index (exclusive)
  color: string; // CSS color string (e.g. "#2563eb")
}
```

### 3.2 Pure Functions (`app/core/blocks/textSpans.ts`)
- `normalizeStyleSpans(spans, textLength)`: Clamps ranges, sorts, merges contiguous identical styles, fills gaps with `"normal"`.
- `normalizeColorSpans(spans, textLength)`: Clamps, sorts, and merges adjacent color ranges.
- `applyStyleToRange(spans, textLength, start, end, targetStyle)`: Toggles or adds a style flag across `[start, end)`.
- `applyColorToRange(spans, textLength, start, end, color)`: Sets character colors across `[start, end)`.
- `reconcileSpansOnTextChange(oldText, newText, styles, colors, activeStyle, activeColor)`: Reconciles spans after user typing/deleting text using prefix-suffix difference analysis and inherits active typing styles for newly inserted characters.
- `buildRenderSpans(text, styles, colors)`: Intersects style spans and color spans into disjoint `RenderSpan[]` for rendering.

### 3.3 Visual Layering & Dual-Layer WYSIWYG
- **Dual-Layer Architecture (`RichTextEditor.vue`)**:
  1. **Backdrop layer (`FormattedSpans.vue`)**: Positioned absolute behind the textarea (`pointer-events-none select-none`). Renders styled spans with `font-bold`, `italic`, `underline`, `line-through`, `font-mono bg-gray-100`, custom text color, or **KaTeX inline math** (`katex.renderToString(span.text)`).
  2. **Interactive layer (`<textarea>`)**: Transparent native textarea (`text-transparent caret-gray-900 selection:bg-blue-500/30`) on top. Handles native cursor navigation, keyboard shortcuts, IME, undo/redo, and text selection. When no formatting is active, falls back to `text-inherit`.

---

## 4. Component Hierarchy & Invariants

```mermaid
flowchart TD
    App[app.vue] --> Demo[DemoCanvas.vue]
    Demo --> Canvas[BlockCanvas.vue]
    Demo --> Toolbar[TextToolbar.vue]
    Canvas --> Wrapper1[BlockWrapper.vue]
    Canvas --> Wrapper2[BlockWrapper.vue]
    Wrapper1 --> RichText[RichTextEditor.vue / MarkedTextEditor.vue]
    Wrapper2 --> Media[ImageBlock.vue / CodeBlock.vue / etc.]
    RichText --> Backdrop[FormattedSpans.vue]
    RichText --> NativeTextarea[Native Textarea Overlay]
```

### 4.1 Component Contracts
1. **Block Props & Events**:
   - Every block component must accept `:block="block"` as an instance of `Block`.
   - Every editable component must emit `"update:block", [value: Block]`.
   - Never pass isolated primitive props (like `:text="string"` or `:id="string"`).

2. **`BlockWrapper.vue`**:
   - Must be transparent and borderless.
   - Root element must carry `tabindex="0"` and receive fallthrough `:data-block-id="block.id"`.
   - Left side: 4-dot actions menu trigger with delete button, alignment segmented control (left, center, right), and turn-into submenu with all 14 block types.
   - Right side: Icon identifying the block type (`blockIcons` mapping), revealed on hover or focus.
   - Deletes empty text blocks (`paragraph`, `heading1..3`, `bulletedList`, `numberedList`, `quote`) on two consecutive `Backspace` presses.

3. **`BlockCanvas.vue`**:
   - Manages block selection and custom mouse drag-selection rectangles.
   - Manages multi-block copy (`Ctrl+C`), paste (`Ctrl+V`), and delete (`Delete` / `Backspace`).
   - Emits `focused-block-type` and `focused-block` when focus enters an editable text block.
   - Handles `focusout` with a 250ms debounce and verifies `event.relatedTarget` and `document.activeElement` before emitting `null`.
   - Clicking empty canvas background cleanly dismisses the toolbar and deselects.

4. **`TextToolbar.vue`**:
   - Positioned fixed at bottom center of the editor (`z-50`).
   - Visible only when a text-editable block is focused.
   - **Button Layout**:
     - Left: Formatting buttons in order: **Bold** (`Ctrl+B`), **Italic** (`Ctrl+I`), **Underline** (`Ctrl+U`), **Strikethrough** (`Ctrl+Shift+X`), **Code** (`Ctrl+E`), **Math** (`Ctrl+M`, KaTeX inline math), **Highlight text**.
     - Divider: Vertical line.
     - Typography: Font family dropdown (`<select>`), Font size input (`<input type="number">`).
     - Middle: Highlight color picker (visible while highlighting is active), with pastel yellow, pink, mint, blue, lavender, and a custom color input. Highlight backgrounds have rounded corners and do not add padding that shifts textarea selection geometry.
     - Right: Centered color picker with presets (Black, Blue, Red, Green), custom color button, and color picker trigger (`<input type="color">`).

---

## 5. Vector Ink Engine (`DrawingBlock`)

`DrawingBlock` represents the 15th polymorphic block subclass, implementing a vector drawing canvas with **Pen** and **Eraser** tools using PixiJS v8 (`pixi.js`).

### 5.1 Architecture & Invariants
- **Data Model**: Stored in `block.data` as JSON string:
  ```ts
  interface DrawingStroke {
    tool: "pen" | "eraser";
    points: Array<{ x: number; y: number }>;
    width: number;
    color?: string;
  }
  interface DrawingData {
    strokes: DrawingStroke[];
  }
  ```
- **Eraser as Ordered Operations**: Erasing is stored as ordered stroke operations (`tool: "eraser"`) rather than destructively deleting previous points. Pixi renders erasers with `blendMode = "erase"`, producing true transparent erasing on a transparent canvas (`backgroundAlpha: 0`).
- **Separation of Concerns**: Editor state (`activeTool`, `penColor`, `penWidth`, `eraserWidth`, `smoothing`) belongs to `DrawingToolbar.vue` and `DrawingBlock.vue`, never stored in block data.
- **Pure Geometry**: `app/core/blocks/drawingGeometry.ts`:
  - `resamplePoints(points, minDistance = 1.5)`: Filters redundant jitter during sampling.
  - `smoothPoints(points, smoothing = 0.5)`: Quadratic Bézier / midpoint curve smoothing executed on `pointerup`.
- **Performance Pipeline**:
  - `event.getCoalescedEvents()` for high-refresh stylus/touch events.
  - Local mutable point array during active draw (no Vue reactivity on hot path).
  - High-frequency visual feedback scheduled via `requestAnimationFrame`.
  - Commits immutable `.withData(...)` only on `pointerup`.

---

## 6. Focus & Toolbar Retention Invariants

> [!CAUTION]
> **Focus Invariant**: Clicking any control in `TextToolbar.vue` (Bold, Italic, Underline, Strikethrough, Code, Math, Color, Font family, Font size) **MUST NOT** cause the text block to lose focus or cause the toolbar to close.

### How Focus is Preserved:
1. **Preventing Focus Stealing on Click**:
   - All buttons in `TextToolbar.vue` have `@mousedown.prevent`.
   - The toolbar container has `@mousedown="onToolbarMouseDown"`, which calls `event.preventDefault()` unless the user is clicking on `<select>` or `<input>`.
2. **Synchronous and Asynchronous Re-Focus**:
   - `restoreBlockFocus()` finds the active block's `<textarea>` using `props.block?.id ?? typingStore.activeBlockId`.
   - It calls `textarea.focus()` and re-applies `textarea.setSelectionRange(start, end)`.
   - Called both immediately and inside `nextTick()` after formatting updates.
3. **Safe Blur Handling**:
   - `RichTextEditor.vue` (`onBlur`) and `MarkedTextEditor.vue` (`stopEditing`) check `event.relatedTarget?.closest('[role="toolbar"]')` and `document.activeElement?.closest('[role="toolbar"]')`.
   - They delay selection clearing by 250ms and cancel it if focus was retained or restored to the block.
   - `BlockCanvas.vue` (`onFocusOut`) checks `activeEl?.closest('[role="toolbar"]')` and delays toolbar dismissal by 250ms.

---

## 7. Development & Verification Workflow

1. **Static Analysis & Type Checking**:
   ```bash
   npx nuxi typecheck
   ```
   Must always pass with 0 errors before finishing any task.

2. **Testing**:
   - E2E tests are configured in `tests/blocks.spec.ts`.
   - Run tests with `npx playwright test`.
   - *Note*: If the user specifies not to run test suites during interactive prototyping, rely on `npx nuxi typecheck` and targeted scratch verification scripts.

3. **Adding a New Block Type**:
   1. Create settings class in `app/core/blocks/<Name>BlockSettings.ts` implementing `IBlockSettings`.
   2. Create block class in `app/core/blocks/<Name>Block.ts` extending `Block` with `toMarkdown()` and `fromMarkdown()`.
   3. Register the type in `app/core/blocks/registry.ts` and `app/core/blocks/settings.ts`.
   4. Create Vue component in `app/components/<Name>Block.vue` accepting `block: Block` and emitting `update:block`.
   5. Register component and icon in `BlockWrapper.vue` and `registry.ts`.
   6. Add unit/E2E coverage in `tests/blocks.spec.ts`.

## Notebook creation blocks

`notebook` is a transient block type with its own `NotebookBlock` class and
`NotebookBlockSettings`. A host can provide `NOTEBOOK_CREATOR_KEY` from
`composables/useNotebookCreator.ts`. The callback receives the source block ID
and notebook name and returns an HTTP(S) URL. With that provider present, Notebook
appears in the slash and turn-into menus. On mount it creates the notebook, then
emits a new `LinkBlock` preserving the source ID, version, and alignment. Failures
retain the Notebook block and offer Retry; the host must make creation idempotent
by source block ID. Hosts may also provide `NOTEBOOK_CREATED_KEY` to open the
new notebook. NotebookBlock invokes it after emitting the replacement link and
waiting for the Vue update; host navigation must flush the source editor before
leaving. The library does not depend on any application's notebook API.

## Native tables

`table` uses `TableBlock`, `TableBlockSettings`, and `TableBlock.vue`. Data is a
JSON string with `header: string[]`, `rows: string[][]`, and an `align` entry per
column (`null`, `left`, `center`, or `right`). Cells contain inline Markdown.
Use `tableData.ts` for validation and Markdown import/export. Cell edits and row
or column changes emit immutable `withData` updates. Markdown imports and AI
generation convert GFM tables into this type, including tables returned inside
an explicit Markdown block. Keep `table` in the server notebook and task block
allowlists. Clipboard text uses tab-separated cells; Markdown export uses GFM.

## Mermaid code blocks

Mermaid remains a `code` block with `blockSettings.language = "mermaid"`, not a
separate block type. `CodeBlock.vue` switches between Monaco (plaintext for this
language) and `MermaidPreview.vue`. `renderMermaid.ts` lazily imports Mermaid and
serializes renders because its configuration is global. Keep securityLevel strict,
startOnLoad disabled, and SVG error rendering suppressed. Preview renders use
unique IDs, ignore stale asynchronous results, follow theme changes, and retain
source on errors. Export continues to use ordinary mermaid Markdown fences.

## Web block Tailwind

WebBlock bundles @tailwindcss/browser as raw script text and passes it to
`buildWebPreview`. It runs inside the opaque-origin iframe, without a CDN request.
Keep the sandbox and CSP restrictions intact; escape closing script tags in the
runtime. Utilities, dynamic class changes and `style type="text/tailwindcss"`
customizations are supported. Keep the runtime out of stored block data/export.

Web preview chrome belongs to BlockWrapper. Each wrapper provides its own
`WEB_BLOCK_CONTROLS` shallow ref; its WebBlock registers controls on mount and
unregisters on unmount. Keep this channel scoped per wrapper, with no global
state. The WebBlock renders a frameless iframe and optional source/status only;
edit/import/height/restart/stop controls live in the wrapper menu.

Drag selection anchors and endpoints use canvas-local coordinates. Convert the
last pointer position and wrapper rectangles against the current canvas bounds
on both mouse movement and captured ancestor scroll events. The fixed overlay
converts back to viewport coordinates. Keep the anchor unchanged while scrolling
and remove temporary scroll listeners on mouseup and unmount.

## Antigravity generator

`antigravity` has AntigravityBlock and AntigravityBlockSettings and uses AiBlock,
with independent model/effort preferences. Keep it in notebook/task server type
allowlists. Host AI integrations may supply `AiBlocks.icons.antigravity`;
BlockTypeIcon displays that image in slash/turn-into menus and the wrapper.
The block library remains independent of the host plugin's asset paths.

## Canvas edit mode

`BlockCanvas` accepts `canvasType: 'default' | 'a4'` (default `'default'`).
Default keeps the fluid, unlimited canvas. A4 renders 794 × 1123 CSS-pixel
pages (210 × 297 mm rounded at 96 DPI) with 40px vertical and 48px horizontal
padding and 24px gaps. `BlockCanvasLayout` measures content and reacts to editor,
font and media size changes. `a4Pagination.ts` creates presentation-only text/code
fragments; fragment edits merge into the original block and preserve source IDs,
other page content and span offsets. Code line numbers continue across pages.
Other block types use clipped viewports of their full rendered content.
Never persist page fragments as separate records. `BlockPageFragment` supplies
source selection offsets to rich-text editors; the layout restores caret positions
after reflow. Drag-selection coordinates include the canvas's own scroll offsets.
Only notebook detail secondary space offers the Canvas selector. That host
stores the preference per notebook in browser storage; other canvas hosts
omit the prop and keep the default layout.

`BlockCanvas` accepts `editmodeactivated: boolean` (default `true`). When false,
use `BlockReadView` instead of mounting editable components, hide wrapper actions/type icons
and add/selection controls, and reject canvas mutation events and paste/delete
shortcuts. Reset focus, selection and drag state when the mode changes. Reading
must preserve rich text, code, math and media without exposing editing controls.
The notebook host shares `notebooks-edit-mode` state between its primary canvas
and the Edit mode switch beside Show nodes in secondary space.

Read views reuse LinkBlock with readOnly to preserve project previews and navigation,
and CodeBlock with readOnly/domReadOnly for the same syntax colors and layout.
Hide language editing, formatting and link editing controls in read mode.

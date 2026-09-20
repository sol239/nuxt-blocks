# Blocks Architecture & Developer Guide for AI Agents

This directory contains instructions and context for AI coding assistants working in the **Blocks** project.

- For Antigravity agents: [agents/antigravity/AGENTS.md](file:///home/sol/Documents/Projects/blocks/agents/antigravity/AGENTS.md)
- For Codex agents: [agents/codex/AGENTS.md](file:///home/sol/Documents/Projects/blocks/agents/codex/AGENTS.md)

---

## Quick Reference

### Core Contracts
- Every block is an instance of a concrete subclass of `Block` (`app/core/blocks/Block.ts`).
- Each block has its own dedicated settings class directly implementing `IBlockSettings` (`app/core/blocks/IBlockSettings.ts`). No shared base class for settings.
- Immutable update convention: `block.withData(...)` and `block.withSettings(...)`.
- Polymorphic markdown transformation: all 15 block classes implement `toMarkdown()` and `fromMarkdown()`.

### Rich Text & Math Formatting
- Text formatting uses compact range-based spans:
  - `styles: StyleSpan[]` (`bold`, `italic`, `underline`, `strikethrough`, `code`, `math`).
  - `colors: ColorSpan[]` (hex color codes).
- Inline math (`style: "math"`) is rendered via **KaTeX** in `FormattedSpans.vue`.
- `RichTextEditor.vue` uses a dual-layer architecture: formatted backdrop underneath a transparent native `<textarea>` in front, maintaining natural typing, selection, and keyboard navigation.

### Focus Preservation Invariant
- Clicking formatting buttons, changing font family, changing font size, or selecting colors in `TextToolbar.vue` **must never** drop focus from the active text block or cause the toolbar to close.
- Toolbar buttons use `@mousedown.prevent` and `restoreBlockFocus()` re-focuses the `<textarea>` and restores `selectionRange`.
- `RichTextEditor.vue`, `MarkedTextEditor.vue`, and `BlockCanvas.vue` check `relatedTarget?.closest('[role="toolbar"]')` before clearing selection or dismissing the toolbar.

### Vector Ink Engine (`DrawingBlock`)
- 15th polymorphic block subclass using PixiJS v8 (`pixi.js`).
- Pen & Eraser tools with quadratic Bézier / midpoint smoothing before committing strokes.
- Pure geometry processing in `drawingGeometry.ts` (`resamplePoints`, `smoothPoints`, `getDistance`).
- Erasing stored as non-destructive ordered operations (`tool: "eraser"`) with Pixi `blendMode = "erase"` on transparent canvas (`backgroundAlpha: 0`).
- High-frequency rendering decoupled to `requestAnimationFrame` with pointer event coalescing (`getCoalescedEvents()`).

### Verification
- Always run `npx nuxi typecheck` to confirm 0 TypeScript errors before completing changes.


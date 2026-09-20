# Block component convention

The page block list is owned by `useBlocksStore`. Preserve `Block` instances across Nuxt hydration via the block payload plugin. `BlockWrapper` is borderless and transparent; its hover/focus actions menu emits deletion to the page, which calls the store.

Keep the complete `BlockType` to Iconify-name mapping and `getBlockIcon` function in `BlockWrapper`. Show the type icon on the right, opposite the actions trigger. Alignment is edited through the wrapper dropdown's left/center/right segmented control and emitted with `update:block` so the Pinia list receives the new settings.

`BlockWrapper` also deletes empty paragraph, heading, list, and quote blocks after two consecutive Backspace presses. Marker-only list and quote data is empty for this behavior. Code and math are enabled by default, and `TextToolbar` belongs at the bottom of the page editor.

Each block type has its own settings class implementing `IBlockSettings` directly. Do not introduce a shared settings base class. Preserve settings on every edit with `Block.withData` / `Block.withSettings`; JSON restoration must recreate the concrete settings class.

Store divider data as `---`, bulleted items as `- text`, numbered items as `1. text`, and quote lines as `> text`. Links contain only the URL. Media settings hold `isUrl` and MIME type; media data is a URL or base64. Code settings hold `language`; code data contains only source text. Keep the registry, picker, and per-block README keyboard shortcut sections up to date when adding block types.

Code blocks use `@monaco-editor/loader` with the local Monaco package, the JetBrains Fleet dark theme, and Vite worker imports in `app/plugins/monaco.client.ts`. Do not add PrismJS back. Keep source text in `Block.data` and the language in `CodeBlockSettings.language`.

Vue block components receive the complete `Block` class instance through a required `block` prop. Editable components expose `v-model:block` (`block` plus `update:block`) and return a new `Block` instance when its data changes. Keep block identity, version, data, and type together; do not replace this contract with standalone string props such as `data`.

Page-level content is an ordered `Block[]`. Select the Vue component from `block.blockType`, use `block.id` as the render key, and pass the instance with `v-model:block`. Every rendered block component must be a child of `BlockWrapper`; shared container presentation and behavior belong in the wrapper rather than individual block components.

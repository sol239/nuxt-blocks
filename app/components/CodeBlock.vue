<template>
  <div class="fleet-editor-frame" :data-code-style="codeStyle ?? 'default'">
    <!-- Header bar -->
    <div class="fleet-header">
      <button
        v-if="isMermaid"
        type="button"
        class="fleet-preview-toggle mr-auto rounded px-2 py-1 text-xs text-gray-200 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-blue-400"
        @click="showSource = !showSource"
      >
        {{ showSource ? 'Diagram' : 'Code' }}
      </button>
      <span v-if="readOnly" class="fleet-lang-trigger">{{
        settings.language
      }}</span>
      <div v-else ref="languagePicker" class="fleet-lang-picker">
        <button
          type="button"
          class="fleet-lang-trigger"
          aria-label="Language"
          aria-haspopup="listbox"
          :aria-expanded="languageMenuOpen"
          :aria-controls="languageMenuId"
          @click="toggleLanguageMenu"
          @keydown.down.prevent="openLanguageMenu"
          @keydown.up.prevent="openLanguageMenu"
        >
          <span>{{ settings.language }}</span>
          <Icon
            name="material-symbols:keyboard-arrow-down"
            class="size-4"
            aria-hidden="true"
          />
        </button>
        <div
          v-if="languageMenuOpen"
          ref="languageMenu"
          class="fleet-lang-menu"
          @keydown="onLanguageMenuKeydown"
        >
          <input
            ref="languageSearch"
            v-model="languageQuery"
            type="search"
            aria-label="Filter languages"
            placeholder="Filter languages…"
            class="fleet-lang-search"
            autocomplete="off"
            @keydown.enter.prevent="
              filteredLanguages[0] && setLanguage(filteredLanguages[0])
            "
          />
          <div
            :id="languageMenuId"
            role="listbox"
            aria-label="Code language"
            class="fleet-lang-options"
          >
            <button
              v-for="language in filteredLanguages"
              :key="language"
              type="button"
              role="option"
              :aria-selected="settings.language === language"
              class="fleet-lang-option"
              :class="{
                'fleet-lang-option-selected': settings.language === language,
              }"
              @click="setLanguage(language)"
            >
              <span>{{ language }}</span>
              <Icon
                v-if="settings.language === language"
                name="material-symbols:check"
                class="size-4"
                aria-hidden="true"
              />
            </button>
            <p
              v-if="!filteredLanguages.length"
              class="px-2 py-2 text-xs opacity-60"
            >
              No languages found
            </p>
          </div>
        </div>
      </div>
      <button
        v-if="!readOnly"
        type="button"
        class="fleet-lang-trigger disabled:cursor-default disabled:opacity-40"
        aria-label="Format code"
        title="Format code"
        :disabled="
          !ready || loadFailed || formatting || (isMermaid && !showSource)
        "
        @click="formatCode"
      >
        <Icon
          name="material-symbols:format-align-left"
          class="size-4"
          aria-hidden="true"
        />
      </button>
    </div>

    <!-- Divider -->
    <div class="fleet-divider" />

    <!-- Monaco editor -->
    <MermaidPreview
      v-if="isMermaid && !showSource"
      :source="block.data || ''"
    />
    <div
      v-show="!loadFailed && (!isMermaid || showSource)"
      ref="editorContainer"
      data-testid="code-editor"
      class="monaco-editor-surface"
      :style="{ height: editorHeight + 'px' }"
    />
    <textarea
      v-if="loadFailed && (!isMermaid || showSource)"
      aria-label="Code source"
      class="block w-full resize-y rounded-b-lg border-0 bg-transparent p-2 font-mono text-sm outline-none"
      :readonly="readOnly"
      :value="block.data ?? ''"
      :rows="Math.max(2, (block.data ?? '').split('\n').length)"
      spellcheck="false"
      @input="
        emit(
          'update:block',
          block.withData(($event.target as HTMLTextAreaElement).value),
        )
      "
    />
    <p
      v-if="!ready && !loadFailed && (!isMermaid || showSource)"
      class="pointer-events-none absolute inset-0 top-9 grid place-items-center text-sm text-gray-400"
    >
      <AppLoadingText text="Loading code editor…" />
    </p>
  </div>
</template>

<script setup lang="ts">
import AppLoadingText from '../../../../components/AppComponents/AppLoadingText.vue';
import MermaidPreview from './MermaidPreview.vue';
import type * as Monaco from 'monaco-editor';
import type { Block } from '~/core/blocks/Block';
import { CodeBlockSettings } from '~/core/blocks/CodeBlockSettings';
import { useBlocksConfig } from '~/composables/useBlocksConfig';

import { useCodeBlockStyle } from '../composables/useCodeBlockStyle';
import { registerCodeBlockThemes } from '../core/codeBlockThemes';
import { usePageFragment } from '../composables/usePageFragment';
const pageFragment = usePageFragment();
const codeStyle = useCodeBlockStyle();
const config = useBlocksConfig();

const props = withDefaults(
  defineProps<{
    block: Block;
    readOnly?: boolean;
    lineNumberOffset?: number;
  }>(),
  { readOnly: false, lineNumberOffset: 0 },
);
const emit = defineEmits<{ 'update:block': [value: Block] }>();
const editorContainer = ref<HTMLElement>();
const ready = ref(false);
const formatting = ref(false);
const loadFailed = ref(false);
/** Tracks the editor's content height so the wrapper div can match it exactly. */
const editorHeight = ref(22 + 16); // one line + top/bottom padding until Monaco loads
const languages = [
  ...new Set([...useRuntimeConfig().public.blocks.codeLanguages, 'mermaid']),
];
const settings = computed(() => props.block.blockSettings as CodeBlockSettings);
const isMermaid = computed(
  () => settings.value.language.toLowerCase() === 'mermaid',
);
const showSource = ref(false);
watch(showSource, async () => {
  await nextTick();
  editor?.layout();
});
const languagePicker = ref<HTMLElement>();
const languageMenu = ref<HTMLElement>();
const languageMenuOpen = ref(false);
const languageSearch = ref<HTMLInputElement>();
const languageQuery = ref('');
const filteredLanguages = computed(() => {
  const query = languageQuery.value.trim().toLowerCase();
  return languages.filter((language) => language.toLowerCase().includes(query));
});
const languageMenuId = `code-language-${useId()}`;
let monaco: typeof Monaco | undefined;
let editor: Monaco.editor.IStandaloneCodeEditor | undefined;
let changeListener: Monaco.IDisposable | undefined;
let sizeListener: Monaco.IDisposable | undefined;
let themeObserver: MutationObserver | undefined;
function editorTheme() {
  const dark = document.documentElement.classList.contains('dark');
  const style = codeStyle?.value ?? 'default';
  return style === 'default'
    ? dark
      ? 'jetbrains-fleet-dark'
      : 'vs'
    : `blocks-${style}-${dark ? 'dark' : 'light'}`;
}
function syncEditorTheme() {
  editor?.updateOptions({ theme: editorTheme() });
}
watch(() => codeStyle?.value, syncEditorTheme);

async function formatCode() {
  const instance = editor;
  const model = instance?.getModel();
  if (props.readOnly || !instance || !model || formatting.value) return;
  formatting.value = true;
  const selections = instance.getSelections();
  try {
    instance.focus();
    const documentAction = instance.getAction('editor.action.formatDocument');
    const rangeAction = instance.getAction('editor.action.formatSelection');
    if (documentAction?.isSupported()) {
      await documentAction.run();
    } else if (rangeAction?.isSupported()) {
      instance.setSelection(model.getFullModelRange());
      await rangeAction.run();
    } else {
      await instance.getAction('editor.action.reindentlines')?.run();
    }
  } finally {
    if (
      editor === instance &&
      instance.getModel() === model &&
      !model.isDisposed()
    ) {
      if (selections) instance.setSelections(selections);
      instance.focus();
    }
    formatting.value = false;
  }
}

function monacoLanguage(language: string) {
  if (language.toLowerCase() === 'mermaid') return 'plaintext';
  if (language === 'markup') return 'html';
  if (language === 'bash') return 'shell';
  if (language === 'jsonc') return 'json';
  if (language === 'protobuf') return 'proto';
  if (language === 'solidity') return 'sol';
  return language;
}

function setLanguage(language: string) {
  emit(
    'update:block',
    props.block.withSettings(
      Object.assign(new CodeBlockSettings(), settings.value, { language }),
    ),
  );
  closeLanguageMenu();
}

function openLanguageMenu() {
  languageQuery.value = '';
  languageMenuOpen.value = true;
  nextTick(() => languageSearch.value?.focus());
}

function closeLanguageMenu() {
  languageMenuOpen.value = false;
  languagePicker.value
    ?.querySelector<HTMLButtonElement>('.fleet-lang-trigger')
    ?.focus();
}

function toggleLanguageMenu() {
  if (languageMenuOpen.value) closeLanguageMenu();
  else openLanguageMenu();
}

function onLanguageMenuKeydown(event: KeyboardEvent) {
  const options = [
    ...(languageMenu.value?.querySelectorAll<HTMLButtonElement>(
      '[role="option"]',
    ) ?? []),
  ];
  const index = options.indexOf(document.activeElement as HTMLButtonElement);
  if (event.key === 'Escape') {
    event.preventDefault();
    closeLanguageMenu();
  } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
    if (
      event.target === languageSearch.value &&
      ['Home', 'End'].includes(event.key)
    )
      return;
    event.preventDefault();
    if (!options.length) return;
    const next =
      index === -1
        ? event.key === 'ArrowUp'
          ? options.length - 1
          : 0
        : event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? options.length - 1
            : (index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) %
              options.length;
    options[next]?.focus();
  }
}

function onDocumentPointerDown(event: PointerEvent) {
  if (
    languageMenuOpen.value &&
    !languagePicker.value?.contains(event.target as Node)
  ) {
    languageMenuOpen.value = false;
  }
}

onMounted(() => {
  document.addEventListener('pointerdown', onDocumentPointerDown);
  void initializeEditor();
});

async function initializeEditor() {
  loadFailed.value = false;
  if (!editorContainer.value) return;

  try {
    // Workers are configured by the client plugin; use the bundled ESM editor directly.
    const loadedMonaco = await import('monaco-editor');
    monaco = loadedMonaco;
    if (!editorContainer.value) return;

    loadedMonaco.editor.defineTheme('jetbrains-fleet-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '707070', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'E27E8D' },
        { token: 'string', foreground: '84B173' },
        { token: 'number', foreground: 'A48AE2' },
        { token: 'type', foreground: '5BA7E2' },
        { token: 'identifier', foreground: 'D0D0D0' },
        { token: 'delimiter', foreground: '909090' },
      ],
      colors: {
        'editor.background': '#181818',
        'editor.foreground': '#D0D0D0',
        'editor.lineHighlightBackground': '#222222',
        'editorGutter.background': '#181818',
        'editorLineNumber.foreground': '#505050',
        'editorLineNumber.activeForeground': '#A0A0A0',
        'editor.selectionBackground': '#2D4059',
        'editor.inactiveSelectionBackground': '#26354A',
        'editorCursor.foreground': '#A0A0A0',
      },
    });

    registerCodeBlockThemes(loadedMonaco);

    const editorInstance = loadedMonaco.editor.create(editorContainer.value, {
      readOnly: props.readOnly,
      domReadOnly: props.readOnly,
      value: props.block.data ?? '',
      language: monacoLanguage(settings.value.language),
      theme: editorTheme(),
      ariaLabel: 'Code source',
      fontFamily: "'JetBrains Mono', Consolas, monospace",
      fontSize: 14,
      fontLigatures: true,
      lineHeight: 22,
      minimap: { enabled: false },
      wordWrap: 'on',
      lineNumbers: (line) => String(line + props.lineNumberOffset),
      folding: true,
      renderLineHighlight: 'all',
      cursorBlinking: 'smooth',
      cursorSmoothCaretAnimation: 'on',
      cursorWidth: 2,
      hideCursorInOverviewRuler: true,
      scrollBeyondLastLine: false,
      tabSize: 2,
      padding: { top: 8, bottom: 8 },
      scrollbar: {
        vertical: 'hidden',
        horizontal: 'auto',
        verticalSliderSize: 8,
        horizontalSliderSize: 8,
        useShadows: false,
        alwaysConsumeMouseWheel: false,
      },
      automaticLayout: true,
      // Suggestions / IntelliSense — driven by AppConfiguration
      quickSuggestions: config.codeSuggestionsEnabled,
      suggestOnTriggerCharacters: config.codeSuggestionsEnabled,
      parameterHints: { enabled: config.codeSuggestionsEnabled },
      wordBasedSuggestions: (config.codeSuggestionsEnabled
        ? 'currentDocument'
        : 'off') as 'currentDocument' | 'off',
      snippetSuggestions: config.codeSuggestionsEnabled ? 'inline' : 'none',
    });
    editor = editorInstance;
    themeObserver = new MutationObserver(syncEditorTheme);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    // Auto-size: update wrapper height whenever content size changes
    function syncHeight() {
      const contentHeight = editorInstance.getContentHeight();
      editorHeight.value = contentHeight;
      editorInstance.layout();
    }
    syncHeight();
    sizeListener = editorInstance.onDidContentSizeChange(syncHeight);

    let changeOffset: number | undefined;
    if (pageFragment)
      pageFragment.codeCaret.value = {
        offset: () =>
          changeOffset ??
          editorInstance.getModel()!.getOffsetAt(editorInstance.getPosition()!),
        focus: (offset) => {
          const model = editorInstance.getModel();
          if (model) {
            editorInstance.focus();
            editorInstance.setPosition(model.getPositionAt(offset));
            editorInstance.revealPositionInCenterIfOutsideViewport(
              model.getPositionAt(offset),
            );
          }
        },
      };
    changeListener = editorInstance.onDidChangeModelContent((event) => {
      const value = editorInstance.getValue();
      const change = event.changes[0];
      changeOffset = change
        ? change.rangeOffset + change.text.length
        : undefined;
      if (!props.readOnly && value !== props.block.data)
        emit('update:block', props.block.withData(value));
      changeOffset = undefined;
    });
    ready.value = true;
  } catch (error) {
    themeObserver?.disconnect();
    sizeListener?.dispose();
    changeListener?.dispose();
    editor?.dispose();
    editor = undefined;
    loadFailed.value = true;
    console.error('Unable to initialize code editor', error);
  }
}

watch(
  () => props.readOnly,
  (readOnly) => {
    editor?.updateOptions({ readOnly, domReadOnly: readOnly });
  },
);
watch(
  () => props.lineNumberOffset,
  () => {
    editor?.updateOptions({
      lineNumbers: (line) => String(line + props.lineNumberOffset),
    });
  },
);

watch(
  () => props.block.data,
  (value) => {
    if (editor && editor.getValue() !== (value ?? ''))
      editor.setValue(value ?? '');
  },
);

watch(
  () => settings.value.language,
  (language) => {
    if (loadFailed.value) {
      void initializeEditor();
      return;
    }
    const model = editor?.getModel();
    if (monaco && model)
      monaco.editor.setModelLanguage(model, monacoLanguage(language));
  },
);

onBeforeUnmount(() => {
  if (pageFragment) pageFragment.codeCaret.value = undefined;
  document.removeEventListener('pointerdown', onDocumentPointerDown);
  themeObserver?.disconnect();
  sizeListener?.dispose();
  changeListener?.dispose();
  editor?.dispose();
});
</script>

<style scoped>
:global(html:not(.dark) .fleet-editor-frame .monaco-editor .suggest-widget),
:global(html:not(.dark) .fleet-editor-frame .monaco-editor .hover-widget) {
  border-color: #d1d5db !important;
  background-color: #fff !important;
}
:global(html:not(.dark) .fleet-editor-frame .monaco-editor .scrollbar .slider) {
  background: rgb(0 0 0 / 15%) !important;
}
:global(
  html:not(.dark) .fleet-editor-frame .monaco-editor .scrollbar .slider:hover
) {
  background: rgb(0 0 0 / 25%) !important;
}

:global(html:not(.dark) .fleet-editor-frame) {
  border-color: #d1d5db;
  background-color: #fff;
  box-shadow: 0 1px 3px rgb(0 0 0 / 5%);
}
:global(html:not(.dark) .fleet-divider) {
  background-color: #d1d5db;
}

:global(html:not(.dark) .fleet-header) {
  color: var(--color-text-primary, #111827);
  background-color: color-mix(in srgb, currentColor 5%, white);
}
:global(html:not(.dark) .fleet-lang-trigger),
:global(html:not(.dark) .fleet-preview-toggle) {
  color: #374151;
}
:global(html:not(.dark) .fleet-lang-trigger:hover),
:global(html:not(.dark) .fleet-lang-trigger[aria-expanded='true']),
:global(html:not(.dark) .fleet-preview-toggle:hover) {
  border-color: #d1d5db;
  background: #e5e7eb;
  color: #111827;
}
:global(html:not(.dark) .fleet-lang-menu) {
  color: #374151;
  border-color: #d1d5db;
  background: #fff;
  box-shadow: 0 8px 24px rgb(0 0 0 / 12%);
}
:global(html:not(.dark) .fleet-lang-option) {
  color: #374151;
}
:global(html:not(.dark) .fleet-lang-option:hover),
:global(html:not(.dark) .fleet-lang-option:focus-visible) {
  background: #f3f4f6;
}
:global(html:not(.dark) .fleet-lang-option-selected) {
  color: #1d4ed8;
  background: #eff6ff;
}

.fleet-editor-frame {
  position: relative;
  overflow: visible;
  border: 1px solid #282828;
  border-radius: 8px;
  background-color: #181818;
  box-shadow: 0 8px 24px rgb(0 0 0 / 30%);
}

.fleet-header {
  position: relative;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 12px;
  height: 36px;
  border-radius: 7px 7px 0 0;
  background-color: #1e1e1e;
}

.fleet-divider {
  height: 1px;
  background-color: #282828;
}

.fleet-lang-picker {
  position: relative;
}

.fleet-lang-trigger {
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 26px;
  padding: 2px 6px;
  border: 1px solid transparent;
  border-radius: 5px;
  background: transparent;
  color: #707070;
  font-size: 12px;
  font-family: 'JetBrains Mono', Consolas, monospace;
  cursor: pointer;
}

.fleet-lang-trigger:hover,
.fleet-lang-trigger[aria-expanded='true'] {
  border-color: #333;
  background: #292929;
  color: #d0d0d0;
}

.fleet-lang-trigger:focus-visible,
.fleet-lang-option:focus-visible {
  outline: 1px solid #5b8fc2;
  outline-offset: 1px;
}

.fleet-lang-menu {
  position: absolute;
  top: calc(100% + 5px);
  right: 0;
  z-index: 20;
  width: 172px;

  padding: 4px;
  border: 1px solid #383838;
  border-radius: 7px;
  background: #1e1e1e;
  color: #d0d0d0;
  box-shadow: 0 10px 24px rgb(0 0 0 / 45%);
}

.fleet-lang-search {
  display: block;
  box-sizing: border-box;
  width: 100%;
  padding: 6px 8px;
  margin-bottom: 4px;
  border: 1px solid #707070;
  border-radius: 4px;
  background: transparent;
  color: inherit;
  font-size: 12px;
}

.fleet-lang-search:focus {
  outline: 1px solid #5b8fc2;
  outline-offset: -1px;
}

.fleet-lang-options {
  max-height: 220px;
  overflow-y: auto;
}

.fleet-lang-option {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: #d0d0d0;
  font:
    12px 'JetBrains Mono',
    Consolas,
    monospace;
  text-align: left;
  cursor: pointer;
}

.fleet-lang-option:hover,
.fleet-lang-option:focus-visible {
  background: #303030;
}

.fleet-lang-option-selected {
  color: #8dbbea;
  background: #26354a;
}

/* Height is driven by JS (editorHeight ref) — no fixed height here */
.monaco-editor-surface {
  width: 100%;
  overflow: hidden;
  border-radius: 0 0 7px 7px;
  text-align: left;
}

:deep(.monaco-editor .suggest-widget),
:deep(.monaco-editor .hover-widget) {
  border: 1px solid #303030 !important;
  border-radius: 6px !important;
  background-color: #1e1e1e !important;
}

:deep(.monaco-editor .scrollbar .slider) {
  border-radius: 4px !important;
  background: rgb(255 255 255 / 8%) !important;
}

:deep(.monaco-editor .scrollbar .slider:hover) {
  background: rgb(255 255 255 / 18%) !important;
}
</style>

<style scoped>
/* ================= OVERRIDING DEFAULT ================= */
.fleet-editor-frame[data-code-style='fleet'] {
  --code-bg: #191a21;
  --code-header: #22232d;
  --code-border: #343643;
}
.fleet-editor-frame[data-code-style='monokai'] {
  --code-bg: #272822;
  --code-header: #303129;
  --code-border: #49483e;
}
:global(html:not(.dark) .fleet-editor-frame[data-code-style='fleet']) {
  --code-bg: #f7f8fa;
  --code-header: #eef0f4;
  --code-border: #d6d9e0;
}
:global(html:not(.dark) .fleet-editor-frame[data-code-style='monokai']) {
  --code-bg: #faf8f0;
  --code-header: #f0ede2;
  --code-border: #d9d4c3;
}
.fleet-editor-frame[data-code-style='fleet'],
.fleet-editor-frame[data-code-style='monokai'] {
  background: var(--code-bg);
  border-color: var(--code-border);
}
[data-code-style='fleet'] .fleet-header,
[data-code-style='monokai'] .fleet-header {
  background: var(--code-header);
}
[data-code-style='fleet'] .fleet-divider,
[data-code-style='monokai'] .fleet-divider {
  background: var(--code-border);
}
</style>

<style scoped>
/* ================= OVERRIDING DEFAULT ================= */
[data-code-style='fleet'] :deep(.monaco-editor .suggest-widget),
[data-code-style='fleet'] :deep(.monaco-editor .hover-widget),
[data-code-style='monokai'] :deep(.monaco-editor .suggest-widget),
[data-code-style='monokai'] :deep(.monaco-editor .hover-widget) {
  background-color: var(--code-header) !important;
  border-color: var(--code-border) !important;
}
</style>

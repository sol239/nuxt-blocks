<template>
  <div class="fleet-editor-frame">
    <!-- Header bar -->
    <div class="fleet-header">
      <!-- Decorative dots (like a terminal titlebar) -->
      <div class="flex items-center gap-1.5" aria-hidden="true">
        <span class="size-3 rounded-full bg-[#3a3a3a]" />
        <span class="size-3 rounded-full bg-[#3a3a3a]" />
        <span class="size-3 rounded-full bg-[#3a3a3a]" />
      </div>

      <div ref="languagePicker" class="fleet-lang-picker">
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
          <Icon name="material-symbols:keyboard-arrow-down" class="size-4" aria-hidden="true" />
        </button>
        <div
          v-if="languageMenuOpen"
          :id="languageMenuId"
          ref="languageMenu"
          role="listbox"
          aria-label="Code language"
          class="fleet-lang-menu"
          @keydown="onLanguageMenuKeydown"
        >
          <button
            v-for="language in languages"
            :key="language"
            type="button"
            role="option"
            :aria-selected="settings.language === language"
            class="fleet-lang-option"
            :class="{ 'fleet-lang-option-selected': settings.language === language }"
            @click="setLanguage(language)"
          >
            <span>{{ language }}</span>
            <Icon v-if="settings.language === language" name="material-symbols:check" class="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>

    <!-- Divider -->
    <div class="fleet-divider"></div>

    <!-- Monaco editor -->
    <div ref="editorContainer" data-testid="code-editor" class="monaco-editor-surface" :style="{ height: editorHeight + 'px' }"></div>
    <p v-if="!ready" class="pointer-events-none absolute inset-0 top-9 grid place-items-center text-sm text-gray-400">
      Loading code editor…
    </p>
  </div>
</template>

<script setup lang="ts">
import loader from "@monaco-editor/loader";
import type * as Monaco from "monaco-editor";
import type { Block } from "~/core/blocks/Block";
import { CodeBlockSettings } from "~/core/blocks/CodeBlockSettings";
import { useBlocksConfig } from "~/composables/useBlocksConfig";

const config = useBlocksConfig();

let monacoPromise: Promise<typeof Monaco> | undefined;

function loadMonaco() {
  monacoPromise ??= import("monaco-editor").then((localMonaco) => {
    loader.config({ monaco: localMonaco });
    return loader.init();
  });
  return monacoPromise;
}

const props = defineProps<{ block: Block }>();
const emit = defineEmits<{ "update:block": [value: Block] }>();
const editorContainer = ref<HTMLElement>();
const ready = ref(false);
/** Tracks the editor's content height so the wrapper div can match it exactly. */
const editorHeight = ref(22 + 16); // one line + top/bottom padding until Monaco loads
const languages = useRuntimeConfig().public.blocks.codeLanguages;
const settings = computed(() => props.block.blockSettings as CodeBlockSettings);
const languagePicker = ref<HTMLElement>();
const languageMenu = ref<HTMLElement>();
const languageMenuOpen = ref(false);
const languageMenuId = `code-language-${useId()}`;
let monaco: typeof Monaco | undefined;
let editor: Monaco.editor.IStandaloneCodeEditor | undefined;
let changeListener: Monaco.IDisposable | undefined;
let sizeListener: Monaco.IDisposable | undefined;

function monacoLanguage(language: string) {
  if (language === "markup") return "html";
  if (language === "bash") return "shell";
  return language;
}

function setLanguage(language: string) {
  emit("update:block", props.block.withSettings(Object.assign(
    new CodeBlockSettings(),
    settings.value,
    { language },
  )));
  closeLanguageMenu();
}

function openLanguageMenu() {
  languageMenuOpen.value = true;
  nextTick(() => {
    const index = Math.max(0, languages.indexOf(settings.value.language));
    languageMenu.value?.querySelectorAll<HTMLButtonElement>('[role="option"]')[index]?.focus();
  });
}

function closeLanguageMenu() {
  languageMenuOpen.value = false;
  languagePicker.value?.querySelector<HTMLButtonElement>(".fleet-lang-trigger")?.focus();
}

function toggleLanguageMenu() {
  if (languageMenuOpen.value) closeLanguageMenu();
  else openLanguageMenu();
}

function onLanguageMenuKeydown(event: KeyboardEvent) {
  const options = [...(languageMenu.value?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? [])];
  const index = options.indexOf(document.activeElement as HTMLButtonElement);
  if (event.key === "Escape") {
    event.preventDefault();
    closeLanguageMenu();
  } else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
    event.preventDefault();
    const next = event.key === "Home" ? 0 : event.key === "End" ? options.length - 1
      : (index + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length;
    options[next]?.focus();
  }
}

function onDocumentPointerDown(event: PointerEvent) {
  if (languageMenuOpen.value && !languagePicker.value?.contains(event.target as Node)) {
    languageMenuOpen.value = false;
  }
}

onMounted(async () => {
  document.addEventListener("pointerdown", onDocumentPointerDown);
  if (!editorContainer.value) return;

  const loadedMonaco = await loadMonaco();
  monaco = loadedMonaco;
  if (!editorContainer.value) return;

  loadedMonaco.editor.defineTheme("jetbrains-fleet-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "707070", fontStyle: "italic" },
      { token: "keyword", foreground: "E27E8D" },
      { token: "string", foreground: "84B173" },
      { token: "number", foreground: "A48AE2" },
      { token: "type", foreground: "5BA7E2" },
      { token: "identifier", foreground: "D0D0D0" },
      { token: "delimiter", foreground: "909090" },
    ],
    colors: {
      "editor.background": "#181818",
      "editor.foreground": "#D0D0D0",
      "editor.lineHighlightBackground": "#222222",
      "editorGutter.background": "#181818",
      "editorLineNumber.foreground": "#505050",
      "editorLineNumber.activeForeground": "#A0A0A0",
      "editor.selectionBackground": "#2D4059",
      "editor.inactiveSelectionBackground": "#26354A",
      "editorCursor.foreground": "#A0A0A0",
    },
  });

  const editorInstance = loadedMonaco.editor.create(editorContainer.value, {
    value: props.block.data ?? "",
    language: monacoLanguage(settings.value.language),
    theme: "jetbrains-fleet-dark",
    ariaLabel: "Code source",
    fontFamily: "'JetBrains Mono', Consolas, monospace",
    fontSize: 14,
    fontLigatures: true,
    lineHeight: 22,
    minimap: { enabled: false },
    wordWrap: "on",
    lineNumbers: "on",
    folding: true,
    renderLineHighlight: "all",
    cursorBlinking: "smooth",
    cursorSmoothCaretAnimation: "on",
    cursorWidth: 2,
    hideCursorInOverviewRuler: true,
    scrollBeyondLastLine: false,
    tabSize: 2,
    padding: { top: 8, bottom: 8 },
    scrollbar: {
      vertical: "hidden",
      horizontal: "auto",
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
    wordBasedSuggestions: (config.codeSuggestionsEnabled ? "currentDocument" : "off") as "currentDocument" | "off",
    snippetSuggestions: config.codeSuggestionsEnabled ? "inline" : "none",

  });
  editor = editorInstance;

  // Auto-size: update wrapper height whenever content size changes
  function syncHeight() {
    const contentHeight = editorInstance.getContentHeight();
    editorHeight.value = contentHeight;
    editorInstance.layout();
  }
  syncHeight();
  sizeListener = editorInstance.onDidContentSizeChange(syncHeight);

  changeListener = editorInstance.onDidChangeModelContent(() => {
    const value = editorInstance.getValue();
    if (value !== props.block.data) emit("update:block", props.block.withData(value));
  });
  ready.value = true;
});

watch(() => props.block.data, (value) => {
  if (editor && editor.getValue() !== (value ?? "")) editor.setValue(value ?? "");
});

watch(() => settings.value.language, (language) => {
  const model = editor?.getModel();
  if (monaco && model) monaco.editor.setModelLanguage(model, monacoLanguage(language));
});

onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", onDocumentPointerDown);
  sizeListener?.dispose();
  changeListener?.dispose();
  editor?.dispose();
});
</script>

<style scoped>
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
  justify-content: space-between;
  padding: 0 12px;
  height: 36px;
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
.fleet-lang-trigger[aria-expanded="true"] {
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
  max-height: 260px;
  overflow-y: auto;
  padding: 4px;
  border: 1px solid #383838;
  border-radius: 7px;
  background: #1e1e1e;
  box-shadow: 0 10px 24px rgb(0 0 0 / 45%);
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
  font: 12px 'JetBrains Mono', Consolas, monospace;
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

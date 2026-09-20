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

      <!-- Language select -->
      <select
        :value="settings.language"
        aria-label="Language"
        class="fleet-lang-select"
        @change="setLanguage"
      >
        <option v-for="language in languages" :key="language" :value="language">{{ language }}</option>
      </select>
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
import { AppConfiguration } from "~/core/AppConfiguration";

const config = new AppConfiguration();

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
const languages = ["plaintext", "javascript", "typescript", "markup", "css", "python", "json", "bash"];
const settings = computed(() => props.block.blockSettings as CodeBlockSettings);
let monaco: typeof Monaco | undefined;
let editor: Monaco.editor.IStandaloneCodeEditor | undefined;
let changeListener: Monaco.IDisposable | undefined;
let sizeListener: Monaco.IDisposable | undefined;

function monacoLanguage(language: string) {
  if (language === "markup") return "html";
  if (language === "bash") return "shell";
  return language;
}

function setLanguage(event: Event) {
  emit("update:block", props.block.withSettings(Object.assign(
    new CodeBlockSettings(),
    settings.value,
    { language: (event.target as HTMLSelectElement).value },
  )));
}

onMounted(async () => {
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
  sizeListener?.dispose();
  changeListener?.dispose();
  editor?.dispose();
});
</script>

<style scoped>
.fleet-editor-frame {
  position: relative;
  overflow: hidden;
  border: 1px solid #282828;
  border-radius: 8px;
  background-color: #181818;
  box-shadow: 0 8px 24px rgb(0 0 0 / 30%);
}

.fleet-header {
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

.fleet-lang-select {
  appearance: none;
  background: transparent;
  border: none;
  color: #707070;
  font-size: 12px;
  font-family: 'JetBrains Mono', Consolas, monospace;
  cursor: pointer;
  padding: 2px 4px;
  outline: none;
  text-align: right;
}

.fleet-lang-select:hover {
  color: #a0a0a0;
}

.fleet-lang-select option {
  background: #1e1e1e;
  color: #d0d0d0;
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


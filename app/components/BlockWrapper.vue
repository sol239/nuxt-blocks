<template>
  <div
    ref="wrapper"
    class="group relative pr-5 pl-5 transition-colors duration-150"
    :class="[blockSpacing[block?.blockType ?? 'paragraph'], { 'bg-gray-100 rounded-lg': selected }]"
    tabindex="0" :aria-label="block ? blockLabels[block.blockType ?? 'paragraph'] + ' block' : 'Block'"
    @keydown="shortcut"
    @focusout="onFocusOut">
    <!-- Trigger & Dropdown Menu Container -->
    <div v-if="editmodeactivated" class="absolute -left-6 top-2 z-20 flex items-center">
      <button
        type="button"
        aria-label="Add block below"
        title="Add block below (Ctrl + click to add above)"
        class="block-actions flex size-5 items-center justify-center rounded text-gray-400 opacity-0 transition hover:bg-gray-200 hover:text-gray-700 focus-visible:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100"
        @mousedown.prevent
        @click="$event.ctrlKey ? emit('add-before') : emit('add-after')"
      >
        <Icon name="material-symbols:add" class="size-4" aria-hidden="true" />
      </button>
      <button
        ref="trigger"
        type="button"
        aria-label="Block actions"
        aria-haspopup="menu"
        :aria-expanded="open"
        :aria-controls="menuId"
        class="block-actions flex size-5 items-center justify-center rounded text-gray-400 opacity-0 transition hover:bg-gray-200 hover:text-gray-700 focus-visible:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100"
        :class="{ 'opacity-100': open }"
        @click="toggleMenu"
        @keydown.down.prevent="showMenu"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">
          <circle cx="4" cy="4" r="1.5" />
          <circle cx="10" cy="4" r="1.5" />
          <circle cx="4" cy="10" r="1.5" />
          <circle cx="10" cy="10" r="1.5" />
        </svg>
      </button>

      <div
        v-if="open"
        :id="menuId"
        ref="menu"
        role="menu"
        aria-label="Block actions"
        class="absolute left-0 z-20 min-w-48 rounded-lg border border-gray-200 bg-white p-1 text-left text-sm font-sans shadow-lg"
        :class="openUpwards ? 'bottom-full mb-1' : 'top-full mt-1'"
      >
        <div v-if="block?.blockType === 'web' && webControls" class="space-y-1 border-b border-gray-100 pb-2">
          <button type="button" role="menuitem" class="w-full rounded px-3 py-2 text-left text-gray-700 hover:bg-gray-100" :aria-expanded="webControls.showSource" :aria-controls="webControls.sourceId" @click="webControls.toggleSource(); closeMenu()">{{ webControls.showSource ? 'Hide HTML' : 'Edit HTML' }}</button>
          <button type="button" role="menuitem" class="w-full rounded px-3 py-2 text-left text-gray-700 hover:bg-gray-100" @click="webFileInput?.click()">Import HTML file</button>
          <input ref="webFileInput" type="file" class="hidden" accept=".html,.htm,text/html" aria-label="Import HTML file" @change="webControls.importFile($event); closeMenu()">
          <label class="flex items-center gap-2 px-3 py-2 text-xs text-gray-600">Preview height <input data-control-size="field" type="number" aria-label="Preview height" class="w-20 rounded border border-gray-200 px-2 py-1" min="160" max="1600" step="1" :value="webControls.height" @change="webControls.resize"> px</label>
          <button type="button" role="menuitem" class="w-full rounded px-3 py-2 text-left text-gray-700 hover:bg-gray-100" @click="webControls.run(); closeMenu()">Run HTML</button>
          <button v-if="webControls.running" type="button" role="menuitem" class="w-full rounded px-3 py-2 text-left text-gray-700 hover:bg-gray-100" @click="webControls.stop(); closeMenu()">Stop</button>
        </div>
        <!-- Alignment -->
        <div class="px-2 py-1.5">
          <p class="mb-1 text-xs font-medium text-gray-500">Alignment</p>
          <div class="grid grid-cols-3 overflow-hidden rounded-md border border-gray-200" role="group" aria-label="Block alignment">
            <button
              v-for="alignment in alignments"
              :key="alignment.value"
              type="button"
              class="flex size-9 items-center justify-center text-gray-600 hover:bg-gray-100"
              :class="{ 'bg-gray-900 text-white hover:bg-gray-800': block?.blockSettings.alignment === alignment.value }"
              :aria-label="`Align ${alignment.value}`"
              :aria-pressed="block?.blockSettings.alignment === alignment.value"
              @click="setAlignment(alignment.value)"
            >
              <Icon :name="alignment.icon" class="size-5" />
            </button>
          </div>
        </div>

        <!-- Turn into menu option -->
        <div class="my-1 border-t border-gray-100" />
        <div class="relative">
          <button
            ref="turnIntoButton"
            type="button"
            role="menuitem"
            aria-haspopup="menu"
            :aria-expanded="turnIntoOpen"
            class="flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
            @click.stop="toggleTurnInto"
          >
            <span class="flex items-center gap-2">
              <Icon name="material-symbols:transform" class="size-4 text-gray-500" />
              <span>Turn into</span>
            </span>
            <Icon name="material-symbols:chevron-right" class="size-4 text-gray-400" />
          </button>

          <!-- Turn into submenu on the right -->
          <div
            v-if="turnIntoOpen"
            ref="turnIntoSubmenu"
            role="menu"
            aria-label="Turn into options"
            class="absolute left-full ml-1 z-30 max-h-72 w-48 overflow-y-auto rounded-lg border border-gray-200 bg-white p-1 text-left text-sm font-sans shadow-lg"
            :class="submenuOpenUpwards ? 'bottom-0' : 'top-0'"
            @click.stop
          >
            <button
              v-for="type in availableBlockTypes"
              :key="type"
              type="button"
              role="menuitem"
              class="flex w-full items-center justify-between rounded px-2.5 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
              :class="{ 'bg-gray-100 font-medium text-gray-900': block?.blockType === type }"
              @click.stop="turnInto(type)"
            >
              <span class="flex items-center gap-2">
                <BlockTypeIcon :type="type" class="size-4 text-gray-500" />
                <span>{{ blockLabels[type] }}</span>
              </span>
              <Icon
                v-if="block?.blockType === type"
                name="material-symbols:check"
                class="size-4 text-blue-600"
              />
            </button>
          </div>
        </div>

        <div class="my-1 border-t border-gray-100" />
        <button
          ref="deleteButton"
          type="button"
          role="menuitem"
          class="w-full rounded px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 focus:bg-red-50 focus:outline-none"
          @click="removeBlock"
        >Delete block</button>
      </div>
    </div>

    <BlockTypeIcon
      v-if="editmodeactivated"
      :type="block?.blockType ?? 'paragraph'"
      class="block-type-icon absolute -right-3 top-3 size-5 text-gray-400 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100"
      :aria-label="`${blockLabels[block?.blockType ?? 'paragraph']} block type`"
      :title="blockLabels[block?.blockType ?? 'paragraph']"
    />
    <div
      class="block-content"
      :style="{
        textAlign: block?.blockSettings.alignment ?? 'left',
        fontFamily: block?.blockSettings.fontFamily ? `'${block.blockSettings.fontFamily}', sans-serif` : undefined,
        fontSize: block?.blockSettings.fontSize ? `${block.blockSettings.fontSize}px` : undefined,
      }"
    >
      <slot />
    </div>
  </div>
</template>
<script setup lang="ts">
import BlockTypeIcon from "./BlockTypeIcon.vue";
import { WEB_BLOCK_CONTROLS, type WebBlockControls } from '../composables/useWebBlockControls';
import { tableFromMarkdown } from '../core/blocks/tableData';
import { useAiBlocks } from "../composables/useAiBlocks";
import { useNotebookCreator } from '../composables/useNotebookCreator';
import type { Block, BlockType } from "~/core/blocks/Block";
import type { BlockAllignment } from "~/core/blocks/IBlockSettings";
import { blockLabels, initialBlockData, createBlock } from "~/core/blocks/registry";
import { stripMarker, normalizeMarkedText, type MarkedKind } from "~/core/blocks/markedText";
import { useBlocksConfig } from "~/composables/useBlocksConfig";

const blockSpacing: Record<BlockType, string> = {
  notebook: 'py-1',
  ollama: 'py-2',
  codex: 'py-2',
  antigravity: 'py-2',
  paragraph: 'py-1',
  todo: 'py-1',
  table: 'py-1',
  markdown: 'py-1',
  interactive: 'py-1',
  web: 'py-1',
  heading1: 'py-2 mb-4',
  heading2: 'py-2 mb-3',
  heading3: 'py-2 mb-2',
  divider: 'py-1',
  bulletedList: 'py-1',
  numberedList: 'py-1',
  quote: 'py-1',
  link: 'py-1',
  image: 'py-1',
  video: 'py-1',
  audio: 'py-1',
  code: 'py-1',
  math: 'py-1',
  drawing: 'py-1',
};

const props = withDefaults(
  defineProps<{
    block?: Block;
    selected?: boolean;
    editmodeactivated?: boolean;
  }>(),
  {
    selected: false,
    editmodeactivated: true,
  },
);

const emit = defineEmits<{ "update:block": [value: Block]; "add-after": []; "add-before": []; delete: [] }>();
const webControls = shallowRef<WebBlockControls | null>(null);
const webFileInput = ref<HTMLInputElement>();
provide(WEB_BLOCK_CONTROLS, webControls);
const wrapper = ref<HTMLElement>();
const trigger = ref<HTMLButtonElement>();
const deleteButton = ref<HTMLButtonElement>();
const turnIntoButton = ref<HTMLButtonElement>();
const turnIntoSubmenu = ref<HTMLElement>();
const menu = ref<HTMLElement>();
const open = ref(false);
const turnIntoOpen = ref(false);
const openUpwards = ref(false);
const submenuOpenUpwards = ref(false);
const menuId = useId();
let emptyBackspaceCount = 0;

const alignments: Array<{ value: BlockAllignment; icon: string }> = [
  { value: "left", icon: "material-symbols:format-align-left" },
  { value: "center", icon: "material-symbols:format-align-center" },
  { value: "right", icon: "material-symbols:format-align-right" },
];

const textBlockTypes = new Set([
  "paragraph",
  "heading1",
  "heading2",
  "heading3",
  "bulletedList",
  "numberedList",
  "quote",
]);

function setAlignment(alignment: BlockAllignment) {
  if (!props.block) return;
  emit("update:block", props.block.withSettings({
    ...props.block.blockSettings,
    alignment,
  }));
}

const backspaceDeleteTypes = new Set([
  "paragraph",
  "heading1",
  "heading2",
  "heading3",
  "bulletedList",
  "numberedList",
  "quote",
]);

function hasEmptyEditableData() {
  const type = props.block?.blockType;
  if (!type || !backspaceDeleteTypes.has(type)) return false;

  const data = props.block?.data ?? "";
  if (type === "bulletedList") return data.replace(/^\s*-\s*/gm, "").trim() === "";
  if (type === "numberedList") return data.replace(/^\s*\d+\.\s*/gm, "").trim() === "";
  if (type === "quote") return data.replace(/^\s*>\s*/gm, "").trim() === "";
  return data.trim() === "";
}

const config = useBlocksConfig();
const notebookCreator = useNotebookCreator();
const aiBlocks = useAiBlocks();

const availableBlockTypes = computed<BlockType[]>(() => {
  const types: BlockType[] = [
    "paragraph",
    "table",
    "todo",
    "markdown",
    "interactive",
    "web",
    "heading1",
    "heading2",
    "heading3",
    "bulletedList",
    "numberedList",
    "quote",
    "divider",
  ];

  if (config.codeBlocksAllowed) {
    types.push("code");
  }
  if (config.mathAllowed) {
    types.push("math");
  }
  if (config.drawingBlocksAllowed) {
    types.push("drawing");
  }

  if (notebookCreator) types.push("notebook");
  if (aiBlocks) types.push("ollama", "codex", "antigravity");
  types.push("link", "image", "video", "audio");
  return types;
});

function toggleTurnInto() {
  turnIntoOpen.value = !turnIntoOpen.value;
  if (turnIntoOpen.value) {
    updateSubmenuDirection();
    nextTick(() => updateSubmenuDirection());
  }
}

function turnInto(targetType: BlockType) {
  if (!props.block) return;
  if (
    (targetType === "code" && !config.codeBlocksAllowed) ||
    (targetType === "math" && !config.mathAllowed) ||
    (targetType === "drawing" && !config.drawingBlocksAllowed)
  ) {
    return;
  }
  if (props.block.blockType === targetType) {
    turnIntoOpen.value = false;
    open.value = false;
    return;
  }

  const currentType = props.block.blockType ?? "paragraph";
  let rawText = props.block.blockType === "table" ? props.block.toMarkdown() : props.block.data ?? "";

  // If current block is a marked list or quote, strip markers to keep the actual text content
  if (currentType === "bulletedList" || currentType === "numberedList" || currentType === "quote") {
    rawText = rawText
      .split("\n")
      .map((line) => stripMarker(line, currentType as MarkedKind))
      .join("\n");
  } else if (currentType === "divider" && rawText === "---") {
    rawText = "";
  } else if (currentType === "drawing") {
    rawText = "";
  }

  let newData = rawText;
  if (targetType === "todo") {
    newData = rawText ? `### To do\n${rawText.split("\n").map(line => `- [ ] ${line}`).join("\n")}` : initialBlockData("todo");
  } else if (targetType === "bulletedList") {
    newData = rawText ? normalizeMarkedText(rawText, "bulletedList") : "- ";
  } else if (targetType === "numberedList") {
    newData = rawText ? normalizeMarkedText(rawText, "numberedList") : "1. ";
  } else if (targetType === "quote") {
    newData = rawText ? normalizeMarkedText(rawText, "quote") : "> ";
  } else if (targetType === "divider") {
    newData = "---";
  } else if (targetType === "web") {
    newData = rawText || initialBlockData("web");
  } else if (targetType === "table") {
    try { newData = JSON.stringify(tableFromMarkdown(rawText)); }
    catch { newData = initialBlockData("table"); }
  } else if (targetType === "interactive") {
    newData = initialBlockData("interactive");
  } else if (targetType === "drawing") {
    newData = JSON.stringify({ strokes: [] });
  }

  // Determine appropriate font size for target block
  let fontSize: number | undefined;
  if (textBlockTypes.has(targetType)) {
    if (targetType === "heading1") fontSize = 28;
    else if (targetType === "heading2") fontSize = 24;
    else if (targetType === "heading3") fontSize = 20;
    else fontSize = 16;
  }

  const newBlock = createBlock(
    targetType,
    props.block.id,
    props.block.version,
    newData,
    {
      alignment: props.block.blockSettings.alignment ?? "left",
      fontFamily: props.block.blockSettings.fontFamily ?? "Inter",
      ...(fontSize !== undefined ? { fontSize } : {}),
    },
  );

  emit("update:block", newBlock);
  turnIntoOpen.value = false;
  open.value = false;

  nextTick(() => {
    const input = wrapper.value?.querySelector<HTMLElement>("textarea, input, [contenteditable='true'], button");
    input?.focus();
  });
}

function updateMenuDirection() {
  if (!trigger.value) return;
  const rect = trigger.value.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom;
  const spaceAbove = rect.top;
  const menuHeight = menu.value?.offsetHeight || 300;
  openUpwards.value = spaceBelow < menuHeight && spaceAbove > spaceBelow;
}

function updateSubmenuDirection() {
  if (!turnIntoButton.value) return;
  const rect = turnIntoButton.value.getBoundingClientRect();
  const submenuHeight = turnIntoSubmenu.value?.offsetHeight || 280;
  const spaceBelow = window.innerHeight - rect.top;
  const spaceAbove = rect.bottom;
  submenuOpenUpwards.value = openUpwards.value || (spaceBelow < submenuHeight && spaceAbove > spaceBelow);
}

function showMenu() {
  updateMenuDirection();
  open.value = true;
  turnIntoOpen.value = false;
  nextTick(() => {
    updateMenuDirection();
    deleteButton.value?.focus();
  });
}
function closeMenu() {
  open.value = false;
  turnIntoOpen.value = false;
  nextTick(() => trigger.value?.focus());
}
function toggleMenu() {
  if (open.value) {
    open.value = false;
    turnIntoOpen.value = false;
  } else {
    showMenu();
  }
}
function removeBlock() {
  const next = wrapper.value?.nextElementSibling as HTMLElement | null;
  const previous = wrapper.value?.previousElementSibling as HTMLElement | null;
  open.value = false;
  turnIntoOpen.value = false;
  emit("delete");
  nextTick(async () => {
    const target = previous ?? next;
    const field = target?.querySelector<HTMLTextAreaElement | HTMLInputElement>('textarea, input[type="text"], input[type="url"], input:not([type])');
    if (field) {
      if (!field.getClientRects().length) {
        field.parentElement?.click();
        await nextTick();
      }
      field.focus();
      const position = previous ? field.value.length : 0;
      field.setSelectionRange(position, position);
    } else target?.focus();
  });
}
function onOutsideClick(event: PointerEvent) {
  const target = event.target as Node;
  if (!menu.value?.contains(target) && !trigger.value?.contains(target)) {
    open.value = false;
    turnIntoOpen.value = false;
  }
}
function onFocusOut(event: FocusEvent) {
  const target = event.relatedTarget as Node | null;
  if (!menu.value?.contains(target) && !trigger.value?.contains(target)) {
    open.value = false;
    turnIntoOpen.value = false;
  }
  if (!wrapper.value?.contains(target)) emptyBackspaceCount = 0;
}

function onViewportChange() {
  if (open.value) {
    updateMenuDirection();
    if (turnIntoOpen.value) updateSubmenuDirection();
  }
}

onMounted(() => {
  document.addEventListener("pointerdown", onOutsideClick);
  window.addEventListener("resize", onViewportChange);
  window.addEventListener("scroll", onViewportChange, true);
});
onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", onOutsideClick);
  window.removeEventListener("resize", onViewportChange);
  window.removeEventListener("scroll", onViewportChange, true);
});
function shortcut(event: KeyboardEvent) {
  if (!props.editmodeactivated) return;
  if (event.key === "Enter" && event.ctrlKey && !event.altKey && !event.metaKey && !event.isComposing) {
    event.preventDefault();
    event.stopPropagation();
    emit("add-before");
    return;
  }
  if (event.key === "Backspace" && !event.repeat && !event.altKey && !event.ctrlKey && !event.metaKey && hasEmptyEditableData()) {
    emptyBackspaceCount += 1;
    if (emptyBackspaceCount === 2) {
      event.preventDefault();
      event.stopPropagation();
      emptyBackspaceCount = 0;
      removeBlock();
    }
    return;
  }
  if (event.key !== "Backspace") emptyBackspaceCount = 0;
  if (event.key === "Escape" && open.value) {
    event.preventDefault();
    event.stopPropagation();
    if (turnIntoOpen.value) {
      turnIntoOpen.value = false;
    } else {
      open.value = false;
      trigger.value?.focus();
    }
    return;
  }
  const target = event.target as HTMLElement;
  const textBlock = ["paragraph", "heading1", "heading2", "heading3", "bulletedList", "numberedList", "quote"].includes(props.block?.blockType ?? "paragraph");
  if (textBlock && target.tagName === "TEXTAREA" && !event.defaultPrevented && !event.altKey && event.key === "Enter" && !event.ctrlKey && !event.metaKey && !event.isComposing) {
    event.preventDefault();
    event.stopPropagation();
    emit("add-after");
  }
}
</script>

<style scoped>
.block-content,
.block-content :deep(textarea),
.block-content :deep(input),
.block-content :deep(p),
.block-content :deep(li),
.block-content :deep(blockquote) {
  text-align: inherit;
  font-family: inherit;
  font-size: inherit;
}

@media (hover: none) {
  .block-actions,
  .block-type-icon {
    opacity: 1;
  }
}
</style>

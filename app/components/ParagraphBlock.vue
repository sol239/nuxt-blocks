<template>
  <div ref="containerRef" class="relative w-full">
    <RichTextEditor
      ref="editorRef"
      :block="block"
      placeholder="Start writing…"
      aria-label="Paragraph"
      class="leading-7 text-gray-700"
      @update:block="handleUpdateBlock"
      @keydown="handleKeydown"
    />

    <!-- Slash command turn into dropdown -->
    <div
      v-if="isOpen"
      ref="dropdownRef"
      role="menu"
      aria-label="Turn into options"
      data-testid="turn-into-dropdown"
      class="turn-into-dropdown absolute left-0 z-50 max-h-72 w-56 overflow-y-auto rounded-lg border border-gray-200 bg-white p-1 text-left text-sm font-sans shadow-lg"
      :class="openUpwards ? 'bottom-full mb-1' : 'top-full mt-1'"
    >
      <div class="flex items-center justify-between px-2 py-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
        <span>Turn into</span>
        <span v-if="searchQuery" class="font-mono text-blue-600 lowercase tracking-normal">/{{ searchQuery }}</span>
      </div>
      <template v-if="filteredOptions.length > 0">
        <button
          v-for="(type, index) in filteredOptions"
          :key="type"
          :ref="el => { if (index === selectedIndex) selectedButtonRef = el as HTMLButtonElement }"
          type="button"
          role="menuitem"
          :data-block-type="type"
          class="flex w-full items-center justify-between rounded px-2.5 py-1.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
          :class="{ 'bg-gray-100 font-medium text-gray-900': index === selectedIndex }"
          @mousedown.prevent="selectOption(type)"
          @click="selectOption(type)"
        >
          <span class="flex items-center gap-2">
            <Icon :name="blockIcons[type]" class="size-4 text-gray-500" />
            <span>{{ blockLabels[type] }}</span>
          </span>
        </button>
      </template>
      <div v-else class="px-3 py-2 text-xs text-gray-400">
        No matching blocks
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted, watch } from "vue";
import type { Block, BlockType } from "~/core/blocks/Block";
import { blockLabels, blockIcons, createBlock } from "~/core/blocks/registry";
import { normalizeMarkedText } from "~/core/blocks/markedText";
import { useBlocksConfig } from "~/composables/useBlocksConfig";
import RichTextEditor from "./RichTextEditor.vue";

const props = defineProps<{
  block: Block;
}>();

const emit = defineEmits<{
  "update:block": [value: Block];
}>();

const containerRef = ref<HTMLElement>();
const editorRef = ref<InstanceType<typeof RichTextEditor>>();
const dropdownRef = ref<HTMLElement>();
const selectedButtonRef = ref<HTMLButtonElement | null>(null);

const isOpen = ref(false);
const searchQuery = ref("");
const selectedIndex = ref(0);
const closedExplicitly = ref(false);
const openUpwards = ref(false);

const config = useBlocksConfig();

const availableBlockTypes = computed<BlockType[]>(() => {
  const types: BlockType[] = [
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

  types.push("link", "image", "video", "audio");
  return types;
});

const filteredOptions = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  if (!query) return availableBlockTypes.value;
  return availableBlockTypes.value.filter((type) => {
    const label = (blockLabels[type] ?? "").toLowerCase();
    const typeStr = type.toLowerCase();
    return label.includes(query) || typeStr.includes(query);
  });
});

watch(filteredOptions, () => {
  selectedIndex.value = 0;
});

function updateDropdownDirection() {
  if (!containerRef.value) return;
  const rect = containerRef.value.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom;
  const spaceAbove = rect.top;
  const menuHeight = dropdownRef.value?.offsetHeight || 280;
  openUpwards.value = spaceBelow < menuHeight && spaceAbove > spaceBelow;
}

function scrollSelectedIntoView() {
  nextTick(() => {
    selectedButtonRef.value?.scrollIntoView({ block: "nearest" });
  });
}

function handleUpdateBlock(updatedBlock: Block) {
  const oldText = props.block.data ?? "";
  const newText = updatedBlock.data ?? "";

  // Always emit the typing update so the block stays in sync
  emit("update:block", updatedBlock);

  // If new text ended with a newly typed slash, reset closedExplicitly
  if (newText.endsWith("/") && !oldText.endsWith("/")) {
    closedExplicitly.value = false;
  }

  // Check if text ends with a slash command trigger: e.g. /(^|[\s\n])\/$/
  const match = newText.match(/(^|[\s\n])\/$/);

  if (match) {
    if (!closedExplicitly.value) {
      isOpen.value = true;
      searchQuery.value = "";
      nextTick(() => updateDropdownDirection());
    }
  } else if (!isOpen.value) {
    closedExplicitly.value = false;
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === "/") {
    closedExplicitly.value = false;
  }

  if (!isOpen.value) return;

  if (event.key === "ArrowDown") {
    event.preventDefault();
    if (filteredOptions.value.length > 0) {
      selectedIndex.value = (selectedIndex.value + 1) % filteredOptions.value.length;
      scrollSelectedIntoView();
    }
    return;
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    if (filteredOptions.value.length > 0) {
      selectedIndex.value =
        (selectedIndex.value - 1 + filteredOptions.value.length) % filteredOptions.value.length;
      scrollSelectedIntoView();
    }
    return;
  }

  if (event.key === "Enter" || event.key === "Tab") {
    if (filteredOptions.value.length > 0) {
      event.preventDefault();
      const target = filteredOptions.value[selectedIndex.value];
      if (target) {
        selectOption(target);
      }
    }
    return;
  }

  if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    isOpen.value = false;
    searchQuery.value = "";
    closedExplicitly.value = true;
    return;
  }

  if (event.key === "Backspace") {
    if (searchQuery.value.length > 0) {
      event.preventDefault();
      searchQuery.value = searchQuery.value.slice(0, -1);
      return;
    }
    // If searchQuery is empty, let backspace delete the '/' in the textarea
    isOpen.value = false;
    closedExplicitly.value = false;
    return;
  }

  if (event.key === " ") {
    // Space cancels slash menu and resumes normal writing
    isOpen.value = false;
    searchQuery.value = "";
    closedExplicitly.value = true;
    return;
  }

  // Prevent writing characters into the textarea while dropdown is open, and use them to filter
  if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
    event.preventDefault();
    searchQuery.value += event.key;
    return;
  }
}

function stripSlashCommand(text: string): string {
  const match = text.match(/(^|[\s\n])\/$/);
  if (match && match.index !== undefined) {
    const keepUntil = match.index + (match[1] ?? "").length;
    return text.slice(0, keepUntil).trimEnd();
  }
  return text.replace(/\/$/, "").trimEnd();
}

function selectOption(targetType: BlockType) {
  isOpen.value = false;
  searchQuery.value = "";
  closedExplicitly.value = false;

  const rawText = stripSlashCommand(props.block.data ?? "");

  let newData = rawText;
  if (targetType === "bulletedList") {
    newData = rawText ? normalizeMarkedText(rawText, "bulletedList") : "- ";
  } else if (targetType === "numberedList") {
    newData = rawText ? normalizeMarkedText(rawText, "numberedList") : "1. ";
  } else if (targetType === "quote") {
    newData = rawText ? normalizeMarkedText(rawText, "quote") : "> ";
  } else if (targetType === "divider") {
    newData = "---";
  } else if (targetType === "drawing") {
    newData = JSON.stringify({ strokes: [] });
  }

  const textBlockTypes = new Set([
    "paragraph",
    "heading1",
    "heading2",
    "heading3",
    "bulletedList",
    "numberedList",
    "quote",
  ]);

  let fontSize: number | undefined;
  if (textBlockTypes.has(targetType)) {
    if (targetType === "heading1") fontSize = 36;
    else if (targetType === "heading2") fontSize = 28;
    else if (targetType === "heading3") fontSize = 22;
    else fontSize = 16;
  }

  const newBlock = createBlock(
    targetType,
    props.block.id,
    props.block.version,
    newData,
    {
      alignment: props.block.blockSettings?.alignment ?? "left",
      fontFamily: props.block.blockSettings?.fontFamily ?? "Inter",
      ...(fontSize !== undefined ? { fontSize } : {}),
    },
  );

  const blockId = props.block.id;
  const parentEl = containerRef.value?.parentElement;
  emit("update:block", newBlock);

  nextTick(() => {
    const focusTarget = () => {
      const blockEl =
        document.querySelector(`[data-block-id="${blockId}"]`) ??
        parentEl;
      if (!blockEl) return false;
      const input =
        blockEl.querySelector<HTMLTextAreaElement | HTMLInputElement>(
          "textarea, input, [contenteditable='true']"
        ) ?? blockEl.querySelector<HTMLElement>("button, [tabindex='0']");
      if (input) {
        input.focus();
        if (input instanceof HTMLTextAreaElement || input instanceof HTMLInputElement) {
          const len = input.value.length;
          input.setSelectionRange(len, len);
        }
        return true;
      }
      return false;
    };

    if (!focusTarget()) {
      requestAnimationFrame(() => {
        if (!focusTarget()) {
          setTimeout(focusTarget, 50);
        }
      });
    }
  });
}

function onOutsidePointer(event: MouseEvent | PointerEvent) {
  if (!isOpen.value) return;
  const target = event.target as Node | null;
  if (containerRef.value && !containerRef.value.contains(target)) {
    isOpen.value = false;
    searchQuery.value = "";
    closedExplicitly.value = true;
  }
}

onMounted(() => {
  document.addEventListener("pointerdown", onOutsidePointer);
});

onUnmounted(() => {
  document.removeEventListener("pointerdown", onOutsidePointer);
});

defineExpose({
  editor: editorRef,
  textarea: computed(() => editorRef.value?.textarea),
});
</script>

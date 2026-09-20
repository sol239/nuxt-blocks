<template>
  <div
    ref="wrapper"
    class="group relative py-2 pr-5 pl-5 transition-colors duration-150"
    :class="{ 'bg-gray-100 rounded-lg': selected }"
    tabindex="0" :aria-label="block ? blockLabels[block.blockType ?? 'paragraph'] + ' block' : 'Block'"
    @keydown="shortcut"
    @focusout="onFocusOut">
    <!-- Trigger & Dropdown Menu Container -->
    <div class="absolute -left-3 top-2 z-20">
      <button
        ref="trigger"
        type="button"
        aria-label="Block actions"
        aria-haspopup="menu"
        :aria-expanded="open"
        :aria-controls="menuId"
        class="block-actions flex size-7 items-center justify-center rounded text-gray-400 opacity-0 transition hover:bg-gray-200 hover:text-gray-700 focus-visible:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100"
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
                <Icon :name="getBlockIcon(type)" class="size-4 text-gray-500" />
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

    <Icon
      :name="getBlockIcon(block?.blockType)"
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
import { Block, type BlockType } from "~/core/blocks/Block";
import type { BlockAllignment } from "~/core/blocks/IBlockSettings";
import { blockLabels, createBlock } from "~/core/blocks/registry";
import { stripMarker, normalizeMarkedText, type MarkedKind } from "~/core/blocks/markedText";
import { useBlocksConfig } from "~/composables/useBlocksConfig";

const props = withDefaults(
  defineProps<{
    block?: Block;
    selected?: boolean;
  }>(),
  {
    selected: false,
  },
);

const emit = defineEmits<{ "update:block": [value: Block]; "add-after": []; delete: [] }>();
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

const blockIcons: Record<BlockType, string> = {
  paragraph: "material-symbols:notes",
  heading1: "material-symbols:format-h1",
  heading2: "material-symbols:format-h2",
  heading3: "material-symbols:format-h3",
  divider: "material-symbols:horizontal-rule",
  bulletedList: "material-symbols:format-list-bulleted",
  numberedList: "material-symbols:format-list-numbered",
  quote: "material-symbols:format-quote",
  link: "material-symbols:link",
  image: "material-symbols:image",
  video: "material-symbols:movie",
  audio: "material-symbols:audio-file",
  code: "material-symbols:code",
  math: "material-symbols:function",
  drawing: "material-symbols:draw",
};

function getBlockIcon(type: BlockType | null | undefined): string {
  return blockIcons[type ?? "paragraph"];
}

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

const availableBlockTypes = computed<BlockType[]>(() => {
  const types: BlockType[] = [
    "paragraph",
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
  let rawText = props.block.data ?? "";

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

  // Determine appropriate font size for target block
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
      alignment: props.block.blockSettings.alignment ?? "left",
      fontFamily: props.block.blockSettings.fontFamily ?? "Inter",
      ...(fontSize !== undefined ? { fontSize } : {}),
    },
  );

  emit("update:block", newBlock);
  turnIntoOpen.value = false;
  open.value = false;
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
  nextTick(() => {
    const target = next ?? previous;
    (target?.querySelector<HTMLElement>("textarea, input, select, button") ?? target)?.focus();
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
  if (event.altKey && event.key === "Enter" && !event.ctrlKey && !event.metaKey && !event.isComposing) {
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

<template>
  <div
    ref="canvasRef"
    tabindex="-1"
    class="relative outline-none"
    :class="canvasType === 'a4' ? 'block-canvas--a4' : 'min-h-screen w-full px-6 py-10 pb-32'"
    :data-canvas-type="canvasType"
    @mousedown="onMouseDown"
    @paste.capture="onBlockPaste"
  >
    <BlockCanvasLayout ref="canvasLayout" :blocks="blocks" :canvas-type="canvasType">
      <template #default="{ block, index, fragment }">
      <BlockWrapper
        :block="block"
        :editmodeactivated="editmodeactivated"
        :selected="selectedBlockIds.has(block.id)"
        :data-block-id="block.id"
        @update:block="onUpdateFragment(index, fragment, $event)"
        @add-after="addAfterAndFocus(index + 1)"
        @add-before="addAfterAndFocus(index)"
        @delete="editmodeactivated && $emit('delete', block.id)"
        @focusin="onFocusIn(blocks[index]!)"
        @focusout="onFocusOut"
      >
        <BlockReadView v-if="!editmodeactivated" :block="block" :line-number-offset="fragment ? codeLineOffset(fragment) : 0" @update:block="onReadTodoUpdate(index, $event)" />
        <component
          :is="blockComponents[block.blockType ?? 'paragraph']"
          v-else
          :block="block"
          v-bind="block.blockType === 'code' ? { lineNumberOffset: fragment ? codeLineOffset(fragment) : 0 } : {}"
          @update:block="onUpdateFragment(index, fragment, $event)"
          @add-after="addAfterAndFocus(index + 1)"
          @replace-block="replaceBlock(index, $event)"
          @generated-blocks="insertGenerated(block.id, $event)"
          @generation-complete="finishGeneration(block.id)"
        />
      </BlockWrapper>
      </template>

      <!-- Empty state: Add Block placeholder button with the width of the blocks -->
      <template #empty>
      <div v-if="editmodeactivated && blocks.length === 0" class="w-full pt-8">
        <button
          type="button"
          aria-label="Add Block"
          class="add-block-placeholder group flex w-full flex-col items-center justify-center gap-2.5 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50/60 p-10 text-gray-500 transition-all hover:border-blue-400 hover:bg-blue-50/30 hover:text-blue-600 focus:border-blue-500 focus:bg-blue-50/40 focus:text-blue-600 focus:outline-none"
          @click="onAddPlaceholder"
        >
          <div class="flex size-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 shadow-xs transition-colors group-hover:border-blue-300 group-hover:text-blue-600">
            <Icon name="material-symbols:add" class="size-6" />
          </div>
          <span class="text-sm font-medium">Add Block</span>
        </button>
      </div>
      </template>
    </BlockCanvasLayout>

    <BlockSelectionToolbar
      v-if="editmodeactivated && !cardBlocks"
      :count="selectedBlocks.length"
      :can-create-card="Boolean(cardCreator)"
      :message="clipboardMessage"
      :error="clipboardError"
      @delete="deleteSelectedBlocks"
      @copy="copySelection"
      @create-card="openCardCreator"
    />
    <component :is="cardCreator" v-if="cardCreator && cardBlocks" :blocks="cardBlocks" @close="cardBlocks = null" />

    <!-- Desktop-style custom drag selection rectangle -->
    <Teleport to="body">
      <div
        v-if="isDragging"
        class="pointer-events-none fixed z-50 rounded border border-blue-600 bg-blue-500/20"
        :style="selectionBoxStyle"
      />
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import type { Block, BlockType } from "~/core/blocks/Block";
import { blockComponents, createBlock } from "~/core/blocks/registry";
import { blocksToMarkdown, blocksToText } from "~/core/blocks/blockClipboard";
import { useBlockCardCreator } from "../composables/useBlockCardCreator";
import { parseTodo, todoMarkdown } from "../core/blocks/todoData";
import BlockReadView from "./BlockReadView.vue";
import BlockSelectionToolbar from "./BlockSelectionToolbar.vue";
import BlockCanvasLayout from './BlockCanvasLayout.vue';
import { mergeFragmentEdit, type PageFragment } from '../core/blocks/a4Pagination';

const props = withDefaults(defineProps<{
  blocks: Block[];
  editmodeactivated?: boolean;
  canvasType?: 'default' | 'a4';
}>(), { editmodeactivated: true, canvasType: 'default' });

const emit = defineEmits<{
  "update:blocks": [blocks: Block[]];
  "update:block": [index: number, block: Block];
  "add-after": [index: number];
  "delete": [id: string];
  "add": [type: BlockType];
  "focused-block-type": [type: BlockType | null];
  "focused-block": [block: Block | null];
  "update:selectedBlockIds": [ids: string[]];
}>();

function codeLineOffset(fragment: PageFragment) {
  return ((props.blocks[fragment.index]?.data ?? '').slice(0, fragment.start).match(/\n/g) ?? []).length;
}

function onUpdateFragment(index: number, fragment: PageFragment | undefined, updated: Block) {
  const source = props.blocks[index];
  if (!source) return;
  if (fragment) canvasLayout.value?.captureCaret(fragment);
  const merged = fragment ? mergeFragmentEdit(source, fragment, updated) : updated;
  if (merged !== source) onUpdateBlock(index, merged);
}
const canvasLayout = ref<InstanceType<typeof BlockCanvasLayout>>();

function finishGeneration(sourceId: string) {
  if (!props.editmodeactivated) return;
  const index = props.blocks.findIndex(block => block.id === sourceId);
  if (index < 0) return;
  // eslint-disable-next-line vue/no-mutating-props -- Hosts persist the shared editor array.
  props.blocks.splice(index, 1);
  selectedBlockIds.value.delete(sourceId);
  if (lastFocusedBlockId.value === sourceId) {
    lastFocusedBlockId.value = null;
    emit("focused-block-type", null);
    emit("focused-block", null);
  }
  emit("update:selectedBlockIds", Array.from(selectedBlockIds.value));
  emit("update:blocks", props.blocks);
}

function insertGenerated(sourceId: string, generated: Block[]) {
  if (!props.editmodeactivated) return;
  let anchor = props.blocks.findIndex(block => block.id === sourceId);
  if (anchor < 0) return;
  for (const block of generated) {
    const existing = props.blocks.findIndex(item => item.id === block.id);
    if (existing >= 0) {
      // eslint-disable-next-line vue/no-mutating-props -- Hosts persist the shared editor array.
      props.blocks.splice(existing, 1, block); anchor = existing;
    } else {
      // eslint-disable-next-line vue/no-mutating-props -- Hosts persist the shared editor array.
      props.blocks.splice(++anchor, 0, block);
    }
  }
  emit("update:blocks", props.blocks);
}

const canvasRef = ref<HTMLElement>();

// Set of currently selected block IDs
const selectedBlockIds = ref<Set<string>>(new Set());
const selectedBlocks = computed(() => props.blocks.filter(block => selectedBlockIds.value.has(block.id)));
const cardCreator = useBlockCardCreator();
const cardBlocks = ref<Block[] | null>(null);
const clipboardMessage = ref("");
const clipboardError = ref(false);
watch(selectedBlockIds, ids => {
  if (ids.size) {
    emit("focused-block-type", null);
    emit("focused-block", null);
  }
}, { deep: true });

watch(() => props.editmodeactivated, () => {
  onMouseUp(new MouseEvent('mouseup'));
  clearSelection();
  cardBlocks.value = null;
  lastFocusedBlockId.value = null;
  if (blurTimeout) clearTimeout(blurTimeout);
  emit('focused-block-type', null);
  emit('focused-block', null);
});

function clearSelection() {
  selectedBlockIds.value.clear();
  clipboardMessage.value = "";
  emit("update:selectedBlockIds", []);
}

function openCardCreator() {
  cardBlocks.value = selectedBlocks.value.map(block => createBlock(block.blockType, `block-${crypto.randomUUID()}`, 1, block.data, JSON.parse(JSON.stringify(block.blockSettings))));
}

async function copySelection(format: "blocks" | "markdown" | "text" | "ids") {
  const blocks = selectedBlocks.value;
  if (!blocks.length) return;
  clipboardMessage.value = "";
  clipboardError.value = false;
  if (format === "blocks") clipboardBlocks.value = blocks.map(block => JSON.parse(JSON.stringify(block.toJSON())));
  else clipboardBlocks.value = [];
  const text = format === "blocks" ? JSON.stringify({ format: "hummingbird-blocks", blocks: clipboardBlocks.value })
    : format === "ids" ? blocks.map(block => block.id).join("\n")
    : format === "markdown" ? blocksToMarkdown(blocks) : blocksToText(blocks);
  try {
    await navigator.clipboard.writeText(text);
    clipboardMessage.value = format === "blocks" ? "Blocks copied" : format === "ids" ? "IDs copied" : format === "markdown" ? "Markdown copied" : "Text copied";
  } catch {
    clipboardError.value = true;
    clipboardMessage.value = format === "blocks" ? "Blocks copied inside this editor; system clipboard is unavailable." : "Unable to copy to the clipboard. Try again.";
  }
}

function onBlockPaste(event: ClipboardEvent) {
  if (!props.editmodeactivated) return;
  if (event.target instanceof Element && event.target.closest('.fleet-editor-frame')) return;
  try {
    const value = JSON.parse(event.clipboardData?.getData("text/plain") ?? "");
    if (value?.format !== "hummingbird-blocks" || !Array.isArray(value.blocks) || !value.blocks.length) return;
    if (!value.blocks.every((block: Record<string, unknown>) => block && typeof block.blockType === "string"
      && Object.hasOwn(blockComponents, block.blockType) && (block.data === null || typeof block.data === "string")
      && block.blockSettings && typeof block.blockSettings === "object" && !Array.isArray(block.blockSettings))) return;
    clipboardBlocks.value = value.blocks;
    event.preventDefault();
    event.stopPropagation();
    pasteBlocks();
  } catch { /* Ordinary text paste continues normally. */ }
}

// Internal clipboard for copied blocks
const clipboardBlocks = ref<Array<ReturnType<Block["toJSON"]>>>([]);

// Last known focused block ID (for pasting below cursor/focus)
const lastFocusedBlockId = ref<string | null>(null);

// Drag selection state
const isDragging = ref(false);
const dragStart = ref({ x: 0, y: 0 });
const dragCurrent = ref({ x: 0, y: 0 });
// Store the anchor in canvas coordinates so ancestor scrolling cannot move it.
const dragOrigin = ref({ x: 0, y: 0 });
let dragPointer = { x: 0, y: 0 };
let mouseDownPointer = { x: 0, y: 0 };
let isMouseDown = false;
let hasMoved = false;

const selectionBoxStyle = computed(() => {
  const left = Math.min(dragStart.value.x, dragCurrent.value.x);
  const top = Math.min(dragStart.value.y, dragCurrent.value.y);
  const width = Math.abs(dragCurrent.value.x - dragStart.value.x);
  const height = Math.abs(dragCurrent.value.y - dragStart.value.y);
  return {
    left: `${left + dragOrigin.value.x}px`,
    top: `${top + dragOrigin.value.y}px`,
    width: `${width}px`,
    height: `${height}px`,
  };
});

const textEditableTypes = new Set<BlockType>([
  "paragraph",
  "heading1",
  "heading2",
  "heading3",
  "bulletedList",
  "numberedList",
  "quote",
]);

let blurTimeout: ReturnType<typeof setTimeout> | null = null;

function onAddPlaceholder() {
  if (!props.editmodeactivated) return;
  emit("add", "paragraph");
  addAfterAndFocus(0);
}

async function addAfterAndFocus(index: number) {
  if (!props.editmodeactivated) return;
  emit("add-after", index);
  await nextTick();
  const block = props.blocks[index];
  if (!block) return;
  const wrapper = Array.from(canvasRef.value?.querySelectorAll<HTMLElement>("[data-block-id]") ?? [])
    .find(element => element.dataset.blockId === block.id);
  const field = wrapper?.querySelector<HTMLTextAreaElement>("textarea");
  if (field) {
    field.focus();
    field.setSelectionRange(0, 0);
  } else wrapper?.focus();
}

// Read mode permits completion changes only, preserving text and block settings.
function onReadTodoUpdate(index: number, updated: Block) {
  const original = props.blocks[index];
  if (!original || original.blockType !== 'todo' || updated.id !== original.id || updated.blockType !== 'todo') return;
  const before = parseTodo(original.data);
  const after = parseTodo(updated.data);
  if (before.title !== after.title || before.items.length !== after.items.length
      || before.items.some((item, i) => item.text !== after.items[i]?.text)) return;
  const next = original.withData(todoMarkdown(after));
  // eslint-disable-next-line vue/no-mutating-props -- Hosts persist the shared editor array.
  props.blocks[index] = next;
  emit('update:block', index, next);
  emit('update:blocks', props.blocks);
}

function onUpdateBlock(index: number, updated: Block) {
  if (!props.editmodeactivated) return;
  // eslint-disable-next-line vue/no-mutating-props -- Hosts persist the shared editor array.
  props.blocks[index] = updated;
  emit("update:block", index, updated);
  emit("update:blocks", props.blocks);
  if (lastFocusedBlockId.value === updated.id) {
    emit("focused-block", updated);
  }
}

async function replaceBlock(index: number, blocks: Block[]) {
  if (!props.editmodeactivated) return;
  const current = props.blocks[index];
  if (!current || !blocks.length) return;
  blocks[0] = createBlock(blocks[0]!.blockType, current.id, current.version, blocks[0]!.data, blocks[0]!.blockSettings);
  // Hosts share this array and may use update:blocks only to trigger persistence.
  // eslint-disable-next-line vue/no-mutating-props
  props.blocks.splice(index, 1, ...blocks);
  emit("update:blocks", props.blocks);
  await nextTick();
  const wrapper = Array.from(canvasRef.value?.querySelectorAll<HTMLElement>("[data-block-id]") ?? [])
    .find(element => element.dataset.blockId === current.id);
  const field = wrapper?.querySelector<HTMLTextAreaElement>("textarea");
  if (field) {
    if (!field.getClientRects().length) {
      field.parentElement?.click();
      await nextTick();
    }
    field.focus();
    field.setSelectionRange(0, 0);
  } else wrapper?.focus();
}

function onFocusIn(block: Block) {
  if (!props.editmodeactivated) return;
  if (selectedBlockIds.value.size) {
    emit("focused-block-type", null);
    emit("focused-block", null);
    return;
  }
  lastFocusedBlockId.value = block.id;
  if (blurTimeout) {
    clearTimeout(blurTimeout);
    blurTimeout = null;
  }
  const type = block.blockType ?? "paragraph";
  emit("focused-block-type", textEditableTypes.has(type) ? type : null);
  emit("focused-block", block);
}

function onFocusOut(event: FocusEvent) {
  if (!props.editmodeactivated) return;
  const related = event.relatedTarget as HTMLElement | null;
  if (related?.closest?.('[role="toolbar"]')) {
    return;
  }
  if (blurTimeout) clearTimeout(blurTimeout);
  blurTimeout = setTimeout(() => {
    const activeEl = document.activeElement;
    if (activeEl?.closest('[role="toolbar"]')) {
      return;
    }
    const wrapper = activeEl?.closest<HTMLElement>("[data-block-id]");
    if (wrapper && canvasRef.value?.contains(wrapper)) {
      const blockId = wrapper.getAttribute("data-block-id");
      const currentBlock = props.blocks.find(b => b.id === blockId);
      if (!selectedBlockIds.value.size && currentBlock?.blockType && textEditableTypes.has(currentBlock.blockType)) {
        emit("focused-block-type", currentBlock.blockType);
        emit("focused-block", currentBlock);
        return;
      }
    }
    emit("focused-block-type", null);
    emit("focused-block", null);
  }, 250);
}

// Check which block wrappers intersect the drag selection rectangle
function checkIntersections() {
  const boxLeft = Math.min(dragStart.value.x, dragCurrent.value.x);
  const boxTop = Math.min(dragStart.value.y, dragCurrent.value.y);
  const boxRight = Math.max(dragStart.value.x, dragCurrent.value.x);
  const boxBottom = Math.max(dragStart.value.y, dragCurrent.value.y);

  const intersected = new Set<string>();
  const wrappers = canvasRef.value?.querySelectorAll<HTMLElement>("[data-block-id]");
  if (!wrappers) return;

  wrappers.forEach((wrapper) => {
    const id = wrapper.getAttribute("data-block-id");
    if (!id) return;
    const rect = wrapper.getBoundingClientRect();
    const overlaps = !(
      rect.right - dragOrigin.value.x < boxLeft ||
      rect.left - dragOrigin.value.x > boxRight ||
      rect.bottom - dragOrigin.value.y < boxTop ||
      rect.top - dragOrigin.value.y > boxBottom
    );
    if (overlaps) {
      intersected.add(id);
    }
  });

  selectedBlockIds.value = intersected;
  emit("update:selectedBlockIds", Array.from(intersected));
}

function onMouseDown(event: MouseEvent) {
  if (!props.editmodeactivated) return;
  if (event.button !== 0) return;

  const target = event.target as HTMLElement;
  if (target.closest("[role='toolbar']")) return;
  // If clicking on inputs, textareas, buttons, or editor surfaces, don't drag-select
  if (target.closest("textarea, input, select, button, a, .monaco-editor, [role='menu'], [role='toolbar'], .drawing-canvas-container, canvas")) {
    if (selectedBlockIds.value.size) {
      clearSelection();
      const wrapper = target.closest<HTMLElement>("[data-block-id]");
      const block = props.blocks.find(item => item.id === wrapper?.dataset.blockId);
      if (block) onFocusIn(block);
    }
    return;
  }

  // Clear focused block when clicking on empty canvas background
  emit("focused-block-type", null);
  emit("focused-block", null);
  if (document.activeElement instanceof HTMLElement && canvasRef.value?.contains(document.activeElement)) document.activeElement.blur();
  canvasRef.value?.focus({ preventScroll: true });
  clipboardMessage.value = "";

  isMouseDown = true;
  hasMoved = false;
  dragPointer = mouseDownPointer = { x: event.clientX, y: event.clientY };
  syncDragPosition();
  dragStart.value = { ...dragCurrent.value };

  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mouseup", onMouseUp);
  window.addEventListener("scroll", onDragScroll, true);
}

function syncDragPosition() {
  const rect = canvasRef.value?.getBoundingClientRect();
  if (!rect) return;
  dragOrigin.value = { x: rect.left - (canvasRef.value?.scrollLeft ?? 0), y: rect.top - (canvasRef.value?.scrollTop ?? 0) };
  dragCurrent.value = { x: dragPointer.x - dragOrigin.value.x, y: dragPointer.y - dragOrigin.value.y };
}

function onDragScroll() {
  if (!isMouseDown) return;
  syncDragPosition();
  if (isDragging.value) checkIntersections();
}

function onMouseMove(event: MouseEvent) {
  if (!isMouseDown) return;

  const dx = event.clientX - mouseDownPointer.x;
  const dy = event.clientY - mouseDownPointer.y;
  dragPointer = { x: event.clientX, y: event.clientY };

  if (!hasMoved && Math.hypot(dx, dy) > 4) {
    hasMoved = true;
    isDragging.value = true;
    document.body.style.userSelect = "none";
    window.getSelection()?.removeAllRanges();
  }

  if (isDragging.value) {
    syncDragPosition();
    checkIntersections();
  }
}

function onMouseUp(_event: MouseEvent) {
  window.removeEventListener("mousemove", onMouseMove);
  window.removeEventListener("mouseup", onMouseUp);
  window.removeEventListener("scroll", onDragScroll, true);
  document.body.style.userSelect = "";

  if (isDragging.value) {
    isDragging.value = false;
  } else if (isMouseDown) {
    // Simple click without drag: clicking on a wrapper does NOT select the block, only drag selects
    if (selectedBlockIds.value.size > 0) {
      selectedBlockIds.value.clear();
      emit("update:selectedBlockIds", []);
    }
  }

  isMouseDown = false;
}

// Delete selected blocks
function deleteSelectedBlocks() {
  if (!props.editmodeactivated) return;
  if (selectedBlockIds.value.size === 0) return;
  const toDelete = new Set(selectedBlockIds.value);
  const remaining = props.blocks.filter(b => !toDelete.has(b.id));
  // eslint-disable-next-line vue/no-mutating-props -- Hosts persist the shared editor array.
  props.blocks.splice(0, props.blocks.length, ...remaining);
  emit("update:blocks", props.blocks);
  selectedBlockIds.value.clear();
  emit("update:selectedBlockIds", []);
}

// Copy selected blocks to clipboard list
function copySelectedBlocks() {
  void copySelection("blocks");
}

// Paste blocks under cursor / focus or at the end
function pasteBlocks() {
  if (!props.editmodeactivated) return;
  if (clipboardBlocks.value.length === 0) return;

  // Find block where cursor / focus is
  let targetIndex = -1;
  const activeEl = document.activeElement;
  const wrapper = activeEl?.closest<HTMLElement>("[data-block-id]");
  if (wrapper) {
    const blockId = wrapper.getAttribute("data-block-id");
    targetIndex = props.blocks.findIndex(b => b.id === blockId);
  }
  if (selectedBlockIds.value.size) {
    props.blocks.forEach((block, index) => {
      if (selectedBlockIds.value.has(block.id)) targetIndex = index;
    });
  }
  if (targetIndex === -1 && lastFocusedBlockId.value) {
    targetIndex = props.blocks.findIndex(b => b.id === lastFocusedBlockId.value);
  }

  const insertIndex = targetIndex !== -1 ? targetIndex + 1 : props.blocks.length;

  const newBlocks: Block[] = clipboardBlocks.value.map(saved => {
    return createBlock(
      saved.blockType,
      crypto.randomUUID(),
      1,
      saved.data,
      saved.blockSettings ? JSON.parse(JSON.stringify(saved.blockSettings)) : null,
    );
  });

  // eslint-disable-next-line vue/no-mutating-props -- Hosts persist the shared editor array.
  props.blocks.splice(insertIndex, 0, ...newBlocks);
  emit("update:blocks", props.blocks);

  // Select the newly pasted blocks
  selectedBlockIds.value = new Set(newBlocks.map(b => b.id));
  emit("update:selectedBlockIds", Array.from(selectedBlockIds.value));

  // Focus the first pasted block
  nextTick(() => {
    if (newBlocks[0]) {
      lastFocusedBlockId.value = newBlocks[0].id;
      const el = canvasRef.value?.querySelector<HTMLElement>(`[data-block-id="${newBlocks[0].id}"]`);
      (el?.querySelector<HTMLElement>("textarea, input, select, button") ?? el)?.focus();
    }
  });
}

function onKeyDown(event: KeyboardEvent) {
  if (!props.editmodeactivated) return;
  if (!(event.target instanceof Node) || !canvasRef.value?.contains(event.target)) return;
  // Code editors own their text clipboard and editing shortcuts, even when blocks are selected.
  if (event.target instanceof Element && event.target.closest('.fleet-editor-frame')) return;
  const isCtrlOrCmd = event.ctrlKey || event.metaKey;

  // Delete shortcut
  if (event.key === "Delete") {
    if (selectedBlockIds.value.size > 0) {
      event.preventDefault();
      deleteSelectedBlocks();
      return;
    }
  }

  // Backspace shortcut when block is selected and not editing inside an input/textarea
  if (event.key === "Backspace" && selectedBlockIds.value.size > 0) {
    const activeEl = document.activeElement;
    const isInput = activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA");
    if (!isInput) {
      event.preventDefault();
      deleteSelectedBlocks();
      return;
    }
  }

  // Escape clears selection
  if (event.key === "Escape" && selectedBlockIds.value.size > 0) {
    selectedBlockIds.value.clear();
    emit("update:selectedBlockIds", []);
    return;
  }

  // Ctrl+C / Cmd+C: copies selected blocks
  if (isCtrlOrCmd && event.key.toLowerCase() === "c") {
    if (selectedBlockIds.value.size > 0) {
      const activeEl = document.activeElement as HTMLInputElement | HTMLTextAreaElement | null;
      if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA")) {
        if (activeEl.selectionStart !== activeEl.selectionEnd) {
          return; // Let user copy text inside input
        }
      }
      event.preventDefault();
      copySelectedBlocks();
      return;
    }
  }

  // Ctrl+V / Cmd+V: pastes blocks under cursor/focus or at the end
  if (isCtrlOrCmd && event.key.toLowerCase() === "v") {
    if (clipboardBlocks.value.length > 0) {
      event.preventDefault();
      pasteBlocks();
      return;
    }
  }
}

function onCopy() {
  // If user copied text inside a text field, clear block clipboard so normal text pasting works
  const activeEl = document.activeElement as HTMLInputElement | HTMLTextAreaElement | null;
  if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA")) {
    if (activeEl.selectionStart !== activeEl.selectionEnd) {
      clipboardBlocks.value = [];
    }
  }
}

onMounted(() => {
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("copy", onCopy);
  document.addEventListener("pointerdown", onOutsidePointerDown);
});

onBeforeUnmount(() => {
  if (blurTimeout) clearTimeout(blurTimeout);
  window.removeEventListener("keydown", onKeyDown);
  window.removeEventListener("copy", onCopy);
  document.removeEventListener("pointerdown", onOutsidePointerDown);
  window.removeEventListener("mousemove", onMouseMove);
  window.removeEventListener("mouseup", onMouseUp);
  window.removeEventListener("scroll", onDragScroll, true);
  document.body.style.userSelect = "";
});

function onOutsidePointerDown(event: PointerEvent) {
  if (cardBlocks.value) return;
  if (selectedBlockIds.value.size && event.target instanceof Node && !canvasRef.value?.contains(event.target)) clearSelection();
}
</script>

<style scoped>
/* ================= OVERRIDING DEFAULT ================= */
.block-canvas--a4 {
  box-sizing: border-box;
  width: 794px;
  min-width: 794px;
  min-height: 0;
  margin-inline: auto;
}
</style>

<template>
  <div
    ref="canvasRef"
    class="relative min-h-screen w-full px-6 py-10 pb-32"
    @mousedown="onMouseDown"
  >
    <div class="mx-auto max-w-4xl space-y-3">
      <BlockWrapper
        v-for="(block, index) in blocks"
        :key="block.id"
        :block="block"
        :selected="selectedBlockIds.has(block.id)"
        :data-block-id="block.id"
        @update:block="onUpdateBlock(index, $event)"
        @add-after="$emit('add-after', index + 1)"
        @delete="$emit('delete', block.id)"
        @focusin="onFocusIn(block)"
        @focusout="onFocusOut"
      >
        <component
          :is="blockComponents[block.blockType ?? 'paragraph']"
          :block="block"
          @update:block="onUpdateBlock(index, $event)"
        />
      </BlockWrapper>
    </div>

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
import { Block, type BlockType } from "~/core/blocks/Block";
import { blockComponents, createBlock } from "~/core/blocks/registry";

const props = defineProps<{ blocks: Block[] }>();

const emit = defineEmits<{
  "update:blocks": [blocks: Block[]];
  "update:block": [index: number, block: Block];
  "add-after": [index: number];
  "delete": [id: string];
  "add": [type: BlockType];
  "focused-block-type": [type: BlockType | null];
  "update:selectedBlockIds": [ids: string[]];
}>();

const canvasRef = ref<HTMLElement>();

// Set of currently selected block IDs
const selectedBlockIds = ref<Set<string>>(new Set());

// Internal clipboard for copied blocks
const clipboardBlocks = ref<Array<ReturnType<Block["toJSON"]>>>([]);

// Last known focused block ID (for pasting below cursor/focus)
const lastFocusedBlockId = ref<string | null>(null);

// Drag selection state
const isDragging = ref(false);
const dragStart = ref({ x: 0, y: 0 });
const dragCurrent = ref({ x: 0, y: 0 });
let isMouseDown = false;
let hasMoved = false;

const selectionBoxStyle = computed(() => {
  const left = Math.min(dragStart.value.x, dragCurrent.value.x);
  const top = Math.min(dragStart.value.y, dragCurrent.value.y);
  const width = Math.abs(dragCurrent.value.x - dragStart.value.x);
  const height = Math.abs(dragCurrent.value.y - dragStart.value.y);
  return {
    left: `${left}px`,
    top: `${top}px`,
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

function onUpdateBlock(index: number, updated: Block) {
  props.blocks[index] = updated;
  emit("update:block", index, updated);
  emit("update:blocks", props.blocks);
}

function onFocusIn(block: Block) {
  lastFocusedBlockId.value = block.id;
  if (blurTimeout) {
    clearTimeout(blurTimeout);
    blurTimeout = null;
  }
  const type = block.blockType ?? "paragraph";
  emit("focused-block-type", textEditableTypes.has(type) ? type : null);
}

function onFocusOut() {
  if (blurTimeout) clearTimeout(blurTimeout);
  blurTimeout = setTimeout(() => {
    const activeEl = document.activeElement;
    const wrapper = activeEl?.closest<HTMLElement>("[data-block-id]");
    if (wrapper && canvasRef.value?.contains(wrapper)) {
      const blockId = wrapper.getAttribute("data-block-id");
      const currentBlock = props.blocks.find(b => b.id === blockId);
      if (currentBlock?.blockType && textEditableTypes.has(currentBlock.blockType)) {
        emit("focused-block-type", currentBlock.blockType);
        return;
      }
    }
    emit("focused-block-type", null);
  }, 100);
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
      rect.right < boxLeft ||
      rect.left > boxRight ||
      rect.bottom < boxTop ||
      rect.top > boxBottom
    );
    if (overlaps) {
      intersected.add(id);
    }
  });

  selectedBlockIds.value = intersected;
  emit("update:selectedBlockIds", Array.from(intersected));
}

function onMouseDown(event: MouseEvent) {
  if (event.button !== 0) return;

  const target = event.target as HTMLElement;
  // If clicking on inputs, textareas, buttons, or editor surfaces, don't drag-select
  if (target.closest("textarea, input, select, button, a, .monaco-editor, [role='menu']")) {
    return;
  }

  isMouseDown = true;
  hasMoved = false;
  dragStart.value = { x: event.clientX, y: event.clientY };
  dragCurrent.value = { x: event.clientX, y: event.clientY };

  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mouseup", onMouseUp);
}

function onMouseMove(event: MouseEvent) {
  if (!isMouseDown) return;

  const dx = event.clientX - dragStart.value.x;
  const dy = event.clientY - dragStart.value.y;

  if (!hasMoved && Math.hypot(dx, dy) > 4) {
    hasMoved = true;
    isDragging.value = true;
    document.body.style.userSelect = "none";
    window.getSelection()?.removeAllRanges();
  }

  if (isDragging.value) {
    dragCurrent.value = { x: event.clientX, y: event.clientY };
    checkIntersections();
  }
}

function onMouseUp(event: MouseEvent) {
  window.removeEventListener("mousemove", onMouseMove);
  window.removeEventListener("mouseup", onMouseUp);
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
  if (selectedBlockIds.value.size === 0) return;
  const toDelete = new Set(selectedBlockIds.value);
  const remaining = props.blocks.filter(b => !toDelete.has(b.id));
  props.blocks.splice(0, props.blocks.length, ...remaining);
  emit("update:blocks", props.blocks);
  selectedBlockIds.value.clear();
  emit("update:selectedBlockIds", []);
}

// Copy selected blocks to clipboard list
function copySelectedBlocks() {
  const blocksToCopy = props.blocks.filter(b => selectedBlockIds.value.has(b.id));
  if (blocksToCopy.length === 0) return;
  clipboardBlocks.value = blocksToCopy.map(b => b.toJSON());
}

// Paste blocks under cursor / focus or at the end
function pasteBlocks() {
  if (clipboardBlocks.value.length === 0) return;

  // Find block where cursor / focus is
  let targetIndex = -1;
  const activeEl = document.activeElement;
  const wrapper = activeEl?.closest<HTMLElement>("[data-block-id]");
  if (wrapper) {
    const blockId = wrapper.getAttribute("data-block-id");
    targetIndex = props.blocks.findIndex(b => b.id === blockId);
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
});

onBeforeUnmount(() => {
  if (blurTimeout) clearTimeout(blurTimeout);
  window.removeEventListener("keydown", onKeyDown);
  window.removeEventListener("copy", onCopy);
  window.removeEventListener("mousemove", onMouseMove);
  window.removeEventListener("mouseup", onMouseUp);
  document.body.style.userSelect = "";
});
</script>

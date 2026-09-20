<template>
  <div class="rich-text-editor relative w-full" :class="$attrs.class">
    <!-- Formatted backdrop layer -->
    <div
      aria-hidden="true"
      class="rich-text-backdrop pointer-events-none absolute inset-0 overflow-hidden select-none whitespace-pre-wrap break-words"
      style="text-align: inherit; font-family: inherit; font-size: inherit; line-height: inherit; letter-spacing: inherit"
    >
      <FormattedSpans :spans="renderSpans" />
    </div>

    <!-- Interactive native textarea -->
    <textarea
      ref="textareaRef"
      :value="block.data ?? ''"
      :aria-label="ariaLabel"
      :placeholder="placeholder"
      :rows="rows ?? 1"
      style="text-align: inherit; font-family: inherit; font-size: inherit; line-height: inherit; letter-spacing: inherit"
      class="field-sizing-content relative block w-full resize-none overflow-hidden bg-transparent focus:outline-none whitespace-pre-wrap break-words placeholder:text-gray-400"
      :class="hasFormatting ? 'text-transparent caret-gray-900 selection:bg-blue-500/30' : 'text-inherit'"
      @input="onInput"
      @select="onSelection"
      @keyup="onSelection"
      @mouseup="onSelection"
      @focus="onFocus"
      @blur="onBlur"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import type { Block } from "~/core/blocks/Block";
import {
  buildRenderSpans,
  reconcileSpansOnTextChange,
  type RenderSpan,
  type StyleSpan,
  type ColorSpan,
} from "~/core/blocks/textSpans";
import { useTypingStore } from "~/stores/useTypingStore";
import FormattedSpans from "./FormattedSpans.vue";

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    block: Block;
    placeholder?: string;
    ariaLabel?: string;
    rows?: number;
  }>(),
  {
    placeholder: "Start writing…",
    ariaLabel: "Text",
    rows: 1,
  },
);

const emit = defineEmits<{
  "update:block": [value: Block];
}>();

const textareaRef = ref<HTMLTextAreaElement>();
const typingStore = useTypingStore();

const styleSpans = computed<StyleSpan[]>(() => props.block.blockSettings?.styles ?? []);
const colorSpans = computed<ColorSpan[]>(() => props.block.blockSettings?.colors ?? []);

const renderSpans = computed<RenderSpan[]>(() => {
  const text = props.block.data ?? "";
  if (!text) return [];
  return buildRenderSpans(text, styleSpans.value, colorSpans.value);
});

const hasFormatting = computed(() => {
  const styles = styleSpans.value;
  const colors = colorSpans.value;
  const hasNonNormalStyle = styles.some(s => s.style && s.style !== "normal");
  const hasColor = colors.length > 0;
  return hasNonNormalStyle || hasColor;
});

function onInput(event: Event) {
  const target = event.currentTarget as HTMLTextAreaElement;
  const newText = target.value;
  const oldText = props.block.data ?? "";

  const reconciled = reconcileSpansOnTextChange(
    oldText,
    newText,
    styleSpans.value,
    colorSpans.value,
    typingStore.getActiveStyleString(),
    typingStore.selectedColor,
  );

  const updatedBlock = props.block
    .withData(newText)
    .withSettings({
      ...props.block.blockSettings,
      styles: reconciled.styles,
      colors: reconciled.colors,
    });

  emit("update:block", updatedBlock);
  onSelection();
}

function onSelection() {
  if (!textareaRef.value) return;
  const start = textareaRef.value.selectionStart;
  const end = textareaRef.value.selectionEnd;
  typingStore.setSelection(props.block.id, start, end);
  typingStore.syncFromSpans(styleSpans.value, colorSpans.value, start, end);
}

let blurTimer: ReturnType<typeof setTimeout> | null = null;

function onFocus() {
  if (blurTimer) {
    clearTimeout(blurTimer);
    blurTimer = null;
  }
  onSelection();
}

function onBlur(event: FocusEvent) {
  const related = event.relatedTarget as HTMLElement | null;
  if (related?.closest?.('[role="toolbar"]') || document.activeElement?.closest?.('[role="toolbar"]')) {
    return;
  }
  if (blurTimer) clearTimeout(blurTimer);
  blurTimer = setTimeout(() => {
    const active = document.activeElement;
    if (active?.closest?.('[role="toolbar"]') || active?.closest?.(`[data-block-id="${props.block.id}"]`)) {
      return;
    }
    if (typingStore.activeBlockId === props.block.id) {
      typingStore.setSelection(null, 0, 0);
    }
  }, 250);
}

defineExpose({
  textarea: textareaRef,
});
</script>


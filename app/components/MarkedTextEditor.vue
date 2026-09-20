<template>
  <div @click="startEditing" @keydown.enter.prevent="startEditing">
    <!-- Edit mode: raw textarea -->
    <textarea
      v-show="editing"
      ref="textarea"
      :value="block.data ?? ''"
      :aria-label="label"
      :placeholder="marker(kind, 0) + 'Text'"
      style="text-align: inherit; font-family: inherit; font-size: inherit"
      class="field-sizing-content w-full resize-none bg-transparent focus:outline-none"
      @input="update"
      @keydown.enter="continueLine"
      @blur="stopEditing"
      @select="onSelection"
      @keyup="onSelection"
      @mouseup="onSelection"
      @focus="onSelection"
    />

    <!-- Rendered view (always present for layout stability) -->
    <div v-show="!editing">
      <!-- Empty placeholder -->
      <p v-if="!hasContent" class="cursor-text text-gray-400 select-none" aria-hidden="true">
        {{ placeholder }}
      </p>

      <!-- Quote -->
      <blockquote
        v-else-if="kind === 'quote'"
        class="cursor-text border-l-4 border-gray-300 pl-4 italic"
      >
        <p v-for="(line, i) in lines" :key="i">
          <FormattedSpans :spans="getLineSpans(i)" />
        </p>
      </blockquote>

      <!-- Bulleted list -->
      <ul v-else-if="kind === 'bulletedList'" class="cursor-text list-disc pl-6">
        <li v-for="(line, i) in lines" :key="i">
          <FormattedSpans :spans="getLineSpans(i)" />
        </li>
      </ul>

      <!-- Numbered list -->
      <ol v-else class="cursor-text list-decimal pl-6">
        <li v-for="(line, i) in lines" :key="i">
          <FormattedSpans :spans="getLineSpans(i)" />
        </li>
      </ol>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from "vue";
import type { Block } from "~/core/blocks/Block";
import { marker, stripMarker, normalizeMarkedText, type MarkedKind } from "~/core/blocks/markedText";
import { buildRenderSpans, reconcileSpansOnTextChange, type RenderSpan } from "~/core/blocks/textSpans";
import { useTypingStore } from "~/stores/useTypingStore";
import FormattedSpans from "./FormattedSpans.vue";

const props = defineProps<{ block: Block; kind: MarkedKind }>();
const emit = defineEmits<{ "update:block": [value: Block] }>();

const textarea = ref<HTMLTextAreaElement>();
const editing = ref(false);
const typingStore = useTypingStore();

const label = computed(() =>
  props.kind === "quote" ? "Quote" : props.kind === "numberedList" ? "Numbered list" : "Bulleted list",
);

const placeholders: Record<MarkedKind, string> = {
  quote: "Click to add a quote…",
  bulletedList: "Click to add a bulleted list…",
  numberedList: "Click to add a numbered list…",
};
const placeholder = computed(() => placeholders[props.kind]);

const lines = computed(() =>
  (props.block.data ?? "").split("\n").map(line => stripMarker(line, props.kind)),
);

const hasContent = computed(() => lines.value.some(l => l.trim() !== ""));

function getLineSpans(lineIndex: number): RenderSpan[] {
  const fullText = props.block.data ?? "";
  const linesRaw = fullText.split("\n");
  let charOffset = 0;
  for (let i = 0; i < lineIndex; i++) {
    charOffset += (linesRaw[i]?.length ?? 0) + 1;
  }
  const currentLineRaw = linesRaw[lineIndex] ?? "";
  const m = marker(props.kind, lineIndex);
  const markerLen = currentLineRaw.startsWith(m) ? m.length : 0;
  const lineStart = charOffset + markerLen;
  const lineEnd = charOffset + currentLineRaw.length;

  const fullSpans = buildRenderSpans(
    fullText,
    props.block.blockSettings?.styles ?? [],
    props.block.blockSettings?.colors ?? [],
  );
  const lineSpans: RenderSpan[] = [];

  for (const span of fullSpans) {
    const s = Math.max(span.start, lineStart);
    const e = Math.min(span.end, lineEnd);
    if (s < e) {
      lineSpans.push({
        start: s - lineStart,
        end: e - lineStart,
        text: fullText.slice(s, e),
        style: span.style,
        styles: span.styles,
        color: span.color,
      });
    }
  }

  if (lineSpans.length === 0) {
    const text = stripMarker(currentLineRaw, props.kind);
    return [{ start: 0, end: text.length, text, style: "normal", styles: [] }];
  }
  return lineSpans;
}

let blurTimer: ReturnType<typeof setTimeout> | null = null;

function startEditing() {
  if (blurTimer) {
    clearTimeout(blurTimer);
    blurTimer = null;
  }
  editing.value = true;
  nextTick(() => {
    textarea.value?.focus();
    onSelection();
  });
}

function stopEditing(event?: FocusEvent) {
  const related = event?.relatedTarget as HTMLElement | null;
  if (related?.closest?.('[role="toolbar"]') || document.activeElement?.closest?.('[role="toolbar"]')) {
    return;
  }
  if (blurTimer) clearTimeout(blurTimer);
  blurTimer = setTimeout(() => {
    const active = document.activeElement;
    if (active?.closest?.('[role="toolbar"]') || active?.closest?.(`[data-block-id="${props.block.id}"]`)) {
      return;
    }
    editing.value = false;
    if (typingStore.activeBlockId === props.block.id) {
      typingStore.setSelection(null, 0, 0);
    }
  }, 250);
}

function onSelection() {
  if (!textarea.value) return;
  const start = textarea.value.selectionStart;
  const end = textarea.value.selectionEnd;
  typingStore.setSelection(props.block.id, start, end);
  typingStore.syncFromSpans(
    props.block.blockSettings?.styles ?? [],
    props.block.blockSettings?.colors ?? [],
    start,
    end,
  );
}

function commit(field: HTMLTextAreaElement) {
  const start = field.selectionStart;
  const old = field.value;
  const value = normalizeMarkedText(old, props.kind);
  const oldText = props.block.data ?? "";

  const reconciled = reconcileSpansOnTextChange(
    oldText,
    value,
    props.block.blockSettings?.styles ?? [],
    props.block.blockSettings?.colors ?? [],
    typingStore.getActiveStyleString(),
    typingStore.selectedColor,
  );

  emit(
    "update:block",
    props.block.withData(value).withSettings({
      ...props.block.blockSettings,
      styles: reconciled.styles,
      colors: reconciled.colors,
    }),
  );

  const before = old.slice(0, start);
  const lineIndex = before.split("\n").length - 1;
  const previousLines = value.split("\n").slice(0, lineIndex).join("\n");
  const oldLine = before.split("\n").at(-1) ?? "";
  const position =
    (lineIndex ? previousLines.length + 1 : 0) +
    marker(props.kind, lineIndex).length +
    stripMarker(oldLine, props.kind).length;
  nextTick(() => {
    field.setSelectionRange(position, position);
    onSelection();
  });
}

function update(event: Event) {
  commit(event.target as HTMLTextAreaElement);
}

function continueLine(event: KeyboardEvent) {
  if (event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return;
  event.preventDefault();
  const field = event.target as HTMLTextAreaElement;
  const index = field.value.slice(0, field.selectionStart).split("\n").length;
  field.setRangeText("\n" + marker(props.kind, index), field.selectionStart, field.selectionEnd, "end");
  commit(field);
}
</script>

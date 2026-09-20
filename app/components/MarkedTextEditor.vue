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
        <p v-for="(line, i) in lines" :key="i">{{ line }}</p>
      </blockquote>

      <!-- Bulleted list -->
      <ul v-else-if="kind === 'bulletedList'" class="cursor-text list-disc pl-6">
        <li v-for="(line, i) in lines" :key="i">{{ line }}</li>
      </ul>

      <!-- Numbered list -->
      <ol v-else class="cursor-text list-decimal pl-6">
        <li v-for="(line, i) in lines" :key="i">{{ line }}</li>
      </ol>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Block } from "~/core/blocks/Block";
import { marker, stripMarker, normalizeMarkedText, type MarkedKind } from "~/core/blocks/markedText";

const props = defineProps<{ block: Block; kind: MarkedKind }>();
const emit = defineEmits<{ "update:block": [value: Block] }>();

const textarea = ref<HTMLTextAreaElement>();
const editing = ref(false);

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

function startEditing() {
  editing.value = true;
  nextTick(() => textarea.value?.focus());
}

function stopEditing() {
  editing.value = false;
}

function commit(field: HTMLTextAreaElement) {
  const start = field.selectionStart;
  const old = field.value;
  const value = normalizeMarkedText(old, props.kind);
  emit("update:block", props.block.withData(value));
  const before = old.slice(0, start);
  const lineIndex = before.split("\n").length - 1;
  const previousLines = value.split("\n").slice(0, lineIndex).join("\n");
  const oldLine = before.split("\n").at(-1) ?? "";
  const position =
    (lineIndex ? previousLines.length + 1 : 0) +
    marker(props.kind, lineIndex).length +
    stripMarker(oldLine, props.kind).length;
  nextTick(() => field.setSelectionRange(position, position));
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

<template>
  <div>
    <!-- Rendered view (default) -->
    <div
      v-if="!editing"
      class="cursor-text"
      role="button"
      tabindex="0"
      :aria-label="rendered ? 'Rendered math, click to edit' : 'Click to add math'"
      @click="startEditing"
      @keydown.enter.prevent="startEditing"
    >
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div v-if="rendered" class="overflow-auto" aria-hidden="true" v-html="rendered" />
      <p v-else class="text-gray-400 select-none">Click to write math…</p>
    </div>

    <!-- Edit mode -->
    <div v-else class="space-y-3">
      <textarea
        ref="textarea"
        :value="block.data ?? ''"
        aria-label="LaTeX source"
        placeholder="E = mc^2"
        spellcheck="false"
        class="min-h-20 w-full rounded border border-gray-300 p-3 font-mono focus:outline-none"
        @input="$emit('update:block', block.withData(($event.target as HTMLTextAreaElement).value))"
        @blur="stopEditing"
      />
      <!-- Live preview while editing -->
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div v-if="rendered" class="overflow-auto rounded bg-gray-50 px-3 py-2" aria-label="Rendered math preview" v-html="rendered" />
    </div>
  </div>
</template>

<script setup lang="ts">
import katex from "katex";
import "katex/dist/katex.min.css";
import type { Block } from "~/core/blocks/Block";
import type { MathBlockSettings } from "~/core/blocks/MathBlockSettings";

const props = defineProps<{ block: Block }>();
const emit = defineEmits<{ "update:block": [value: Block] }>();

const textarea = ref<HTMLTextAreaElement>();
const editing = ref(false);

const settings = computed(() => props.block.blockSettings as MathBlockSettings);

const rendered = computed(() => {
  const src = props.block.data?.trim() ?? "";
  if (!src) return "";
  return katex.renderToString(src, {
    displayMode: settings.value.displayMode,
    throwOnError: false,
    trust: false,
    maxExpand: 1000,
    maxSize: 20,
  });
});

function startEditing() {
  editing.value = true;
  nextTick(() => textarea.value?.focus());
}

function stopEditing() {
  editing.value = false;
}
</script>

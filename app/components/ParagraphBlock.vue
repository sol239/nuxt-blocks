<template>
  <textarea
    aria-label="Paragraph"
    style="text-align: inherit; font-family: inherit; font-size: inherit"
    :value="block.data ?? ''"
    class="field-sizing-content block w-full resize-none overflow-hidden bg-transparent leading-7 text-gray-700 focus:outline-none"
    placeholder="Start writing…"
    @input="updateData"
    @select="logSelectedText"
  />
</template>

<script setup lang="ts">
import type { Block } from "~/core/blocks/Block";

const props = defineProps<{
  block: Block;
}>();

const emit = defineEmits<{
  "update:block": [value: Block];
}>();

function updateData(event: Event) {
  emit(
    "update:block",
    props.block.withData((event.currentTarget as HTMLTextAreaElement).value),
  );
}

function logSelectedText(event: Event) {
  const textarea = event.currentTarget as HTMLTextAreaElement;
  const selectedText = textarea.value.slice(
    textarea.selectionStart,
    textarea.selectionEnd,
  );

  console.log(selectedText);
}
</script>

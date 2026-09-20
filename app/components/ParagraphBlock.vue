<template>
  <RichTextEditor
    :block="block"
    placeholder="Start writing…"
    aria-label="Paragraph"
    class="leading-7 text-gray-700"
    @update:block="emit('update:block', $event)"
  />
</template>

<script setup lang="ts">
import type { Block } from "~/core/blocks/Block";
import RichTextEditor from "./RichTextEditor.vue";

defineProps<{
  block: Block;
}>();

const emit = defineEmits<{
  "update:block": [value: Block];
}>();
</script>

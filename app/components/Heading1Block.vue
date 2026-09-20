<template>
  <RichTextEditor
    :block="block"
    placeholder="Heading 1"
    aria-label="Heading 1"
    class="font-bold tracking-tight text-gray-950"
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

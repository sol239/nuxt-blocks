<template>
  <textarea
    aria-label="Heading 3"
    style="text-align: inherit; font-family: inherit; font-size: inherit"
    :value="block.data ?? ''"
    rows="1"
    class="field-sizing-content block w-full resize-none overflow-hidden bg-transparent font-bold tracking-tight text-gray-900 focus:outline-none"
    placeholder="Heading 3"
    @input="updateData"
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
</script>

<template>
  <MediaBlockEditor :block="block" kind="video" @update:block="$emit('update:block', $event)" />
</template>
<script setup lang="ts">
import type { Block } from "~/core/blocks/Block";
defineProps<{ block: Block }>();
defineEmits<{ "update:block": [value: Block] }>();
</script>

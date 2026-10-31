<template>
  <img
    v-if="image"
    :src="image"
    alt=""
    aria-hidden="true"
    class="object-contain"
  />
  <Icon v-else :name="blockIcons[type]" />
</template>
<script setup lang="ts">
import { computed } from 'vue';
import type { BlockType } from '../core/blocks/Block';
import { blockIcons } from '../core/blocks/registry';
import { useAiBlocks } from '../composables/useAiBlocks';
const props = defineProps<{ type: BlockType }>();
const service = useAiBlocks();
const image = computed(() =>
  props.type === 'antigravity' ||
  props.type === 'ollama' ||
  props.type === 'codex'
    ? service?.icons?.[props.type]
    : undefined,
);
</script>

<template>
  <div class="a4-fragment-content"><slot /></div>
</template>
<script setup lang="ts">
import { computed, provide, shallowRef } from 'vue';
import type { PageFragment } from '../core/blocks/a4Pagination';
import {
  PAGE_FRAGMENT_KEY,
  type FragmentCodeCaret,
} from '../composables/usePageFragment';
const props = defineProps<{ fragment: PageFragment }>();
const codeCaret = shallowRef<FragmentCodeCaret>();
provide(PAGE_FRAGMENT_KEY, {
  start: computed(() => props.fragment.start),
  codeCaret,
});
defineExpose({ codeCaret });
</script>
<style scoped>
.a4-fragment-content {
  display: flow-root;
}
</style>

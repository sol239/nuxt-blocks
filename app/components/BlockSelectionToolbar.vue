<template>
  <Transition enter-active-class="transition duration-200" enter-from-class="translate-y-4 opacity-0" leave-active-class="transition duration-150" leave-to-class="translate-y-4 opacity-0">
    <div v-if="count" ref="toolbar" :style="position" class="fixed bottom-6 left-1/2 z-50 flex w-[calc(100%-3rem)] max-w-4xl -translate-x-1/2 flex-wrap items-center gap-2 rounded-2xl border border-gray-200 bg-white/95 px-4 py-2 text-gray-700 shadow-xl backdrop-blur-sm" role="toolbar" aria-label="Selected block actions" @mousedown.prevent>
      <span class="mr-auto text-sm">{{ count }} {{ count === 1 ? 'block' : 'blocks' }}</span>
      <button data-control-size="field" type="button" aria-label="Delete selected blocks" title="Delete selected blocks" class="selection-action text-red-600" @click="emit('delete')"><Icon name="material-symbols:delete-outline" class="size-5" /></button>
      <button data-control-size="field" type="button" aria-label="Copy blocks" title="Copy blocks (Ctrl+C)" class="selection-action" @click="emit('copy', 'blocks')"><Icon name="material-symbols:content-paste" class="size-5" /></button>
      <button data-control-size="field" type="button" class="selection-action" @click="emit('copy', 'markdown')">Copy Markdown</button>
      <button data-control-size="field" type="button" class="selection-action" @click="emit('copy', 'text')">Copy text</button>
      <button data-control-size="field" type="button" class="selection-action" @click="emit('copy', 'ids')">Copy IDs</button>
      <button v-if="canCreateCard" data-control-size="field" type="button" class="selection-action" @click="emit('create-card')"><Icon name="material-symbols:note-add-outline" class="size-5" />Create card</button>
      <p v-if="message" role="status" class="w-full text-sm" :class="{ 'text-red-600': error }">{{ message }}</p>
    </div>
  </Transition>
</template>
<script setup lang="ts">
defineProps<{ count: number; canCreateCard: boolean; message: string; error: boolean }>();
const emit = defineEmits<{ delete: []; copy: [format: 'blocks' | 'markdown' | 'text' | 'ids']; 'create-card': [] }>();
const toolbar = ref<HTMLElement>();
const position = ref<Record<string, string>>({});
let observer: ResizeObserver | null = null;
function align() {
  const bounds = toolbar.value?.parentElement?.getBoundingClientRect();
  if (bounds) position.value = { left: `${bounds.left + bounds.width / 2}px`, width: `${Math.max(0, bounds.width - 48)}px` };
}
watch(toolbar, element => {
  observer?.disconnect();
  if (!element?.parentElement) return;
  observer = new ResizeObserver(align);
  observer.observe(element.parentElement);
  const main = element.closest('main');
  if (main) observer.observe(main);
  align();
}, { flush: 'post' });
onMounted(() => { window.addEventListener('resize', align); window.addEventListener('scroll', align, true); });
onBeforeUnmount(() => { observer?.disconnect(); window.removeEventListener('resize', align); window.removeEventListener('scroll', align, true); });
</script>
<style scoped>
.selection-action { display: inline-flex; align-items: center; gap: .375rem; min-height: 2rem; padding: .375rem .5rem; border-radius: .5rem; font-size: .875rem; }
.selection-action:hover, .selection-action:focus-visible { background: #f3f4f6; }
.selection-action:focus-visible { outline: 2px solid #2563eb; }
</style>

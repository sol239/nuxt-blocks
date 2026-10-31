<template>
  <div
    class="overflow-auto rounded-b-lg bg-white p-4 text-zinc-800 dark:bg-slate-900 dark:text-zinc-100"
    aria-label="Mermaid diagram"
  >
    <p v-if="!source.trim()" class="text-sm text-zinc-500">
      Write Mermaid code to create a diagram.
    </p>
    <p v-else-if="loading" role="status" class="text-sm">
      <AppLoadingText text="Rendering diagram…" />
    </p>
    <p
      v-else-if="error"
      role="alert"
      class="whitespace-pre-wrap text-sm text-rose-600 dark:text-rose-300"
    >
      {{ error }}
    </p>
    <!-- Mermaid renders SVG with its strict sanitization policy. -->
    <!-- eslint-disable-next-line vue/no-v-html -->
    <div v-else class="mermaid-diagram flex justify-center" v-html="svg" />
  </div>
</template>
<script setup lang="ts">
import AppLoadingText from '../../../../components/AppComponents/AppLoadingText.vue';
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { renderMermaid } from '../core/blocks/renderMermaid';
const props = defineProps<{ source: string }>();
const svg = ref(''),
  error = ref(''),
  loading = ref(false),
  dark = ref(false);
let observer: MutationObserver | undefined;
let timer: ReturnType<typeof setTimeout> | undefined;
let revision = 0;
function scheduleRender() {
  const current = ++revision;
  clearTimeout(timer);
  svg.value = '';
  error.value = '';
  loading.value = Boolean(props.source.trim());
  if (!loading.value) return;
  timer = setTimeout(async () => {
    try {
      const result = await renderMermaid(
        props.source,
        `mermaid-${crypto.randomUUID()}`,
        dark.value,
      );
      if (current === revision) svg.value = result;
    } catch (cause) {
      if (current === revision)
        error.value = `Unable to render Mermaid. Edit the code to fix it.\n${cause instanceof Error ? cause.message : 'Invalid diagram syntax.'}`;
    } finally {
      if (current === revision) loading.value = false;
    }
  }, 200);
}
onMounted(() => {
  dark.value = document.documentElement.classList.contains('dark');
  observer = new MutationObserver(() => {
    dark.value = document.documentElement.classList.contains('dark');
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });
  scheduleRender();
});
watch([() => props.source, dark], scheduleRender);
onBeforeUnmount(() => {
  revision++;
  clearTimeout(timer);
  observer?.disconnect();
});
</script>

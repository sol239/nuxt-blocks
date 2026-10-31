<template>
  <div class="flex items-center gap-3 rounded-xl border border-gray-200 p-4 text-sm">
    <Icon name="material-symbols:book-2" class="size-5 text-violet-500" aria-hidden="true" />
    <span v-if="creating" role="status"><AppLoadingText text="Creating notebook…" /></span>
    <div v-else-if="error" class="space-y-2">
      <p role="alert" class="text-red-600">{{ error }}</p>
      <button v-if="createNotebook" data-control-size="field" type="button" class="rounded-lg bg-blue-600 px-3 py-1.5 text-white" @click="create">Retry</button>
    </div>
  </div>
</template>
<script setup lang="ts">
import AppLoadingText from '../../../../components/AppComponents/AppLoadingText.vue';
import { nextTick, onMounted, ref } from 'vue';
import type { Block } from '~/core/blocks/Block';
import { LinkBlock } from '~/core/blocks/LinkBlock';
import { useNotebookCreator, useNotebookCreated } from '../composables/useNotebookCreator';
const props = defineProps<{ block: Block }>();
const emit = defineEmits<{ 'update:block': [block: Block] }>();
const createNotebook = useNotebookCreator();
const notebookCreated = useNotebookCreated();
const creating = ref(false);
const error = ref('');
async function create() {
  if (creating.value) return;
  if (!createNotebook) { error.value = 'Notebook creation is not available in this editor.'; return; }
  creating.value = true; error.value = '';
  try {
    const path = await createNotebook(props.block.id, props.block.data?.trim() || 'Untitled notebook');
    emit('update:block', new LinkBlock(props.block.id, props.block.version, path, { alignment: props.block.blockSettings.alignment }));
    await nextTick();
    await notebookCreated?.(path);
  } catch (cause) { error.value = cause instanceof Error ? cause.message : 'Unable to create notebook.'; }
  finally { creating.value = false; }
}
onMounted(create);
</script>

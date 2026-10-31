<template>
  <div class="space-y-2">
    <template v-if="block.data?.trim() && !editing">
      <!-- renderMarkdown escapes raw HTML and restricts link protocols. -->
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div class="markdown-preview overflow-x-auto" v-html="preview" />
      <button v-if="hasTable" data-control-size="field" type="button" class="mr-2 rounded-lg border border-gray-200 px-3 py-2 text-sm" @click="split(block.data ?? '')">Convert to blocks</button>
      <button data-control-size="field" type="button" class="rounded-lg border border-gray-200 px-3 py-2 text-sm" @click="editing = true">Edit Markdown</button>
    </template>
    <template v-else>
    <p class="text-sm text-gray-500">Paste Markdown to create blocks automatically, or write it below and choose Split into blocks.</p>
    <textarea
      ref="field"
      data-control-size="area"
      :value="block.data ?? ''"
      aria-label="Markdown source"
      placeholder="# Heading&#10;&#10;Paragraph&#10;&#10;- First item"
      class="min-h-32 w-full resize-y rounded-lg border border-gray-200 bg-transparent p-3 font-mono text-sm focus:outline-blue-500"
      @input="emit('update:block', block.withData(($event.target as HTMLTextAreaElement).value))"
      @paste="onPaste"
    />
    <button data-control-size="field" type="button" class="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50" :disabled="!block.data?.trim()" @click="split(block.data ?? '')">
      Split into blocks
    </button>
    <button v-if="block.data?.trim()" data-control-size="field" type="button" class="ml-2 rounded-lg border border-gray-200 px-3 py-2 text-sm" @click="editing = false">Preview</button>
    </template>
    <p v-if="error" role="alert" class="text-sm text-red-600">{{ error }}</p>
  </div>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue';
import { lexer } from 'marked';
import { renderMarkdown } from '../core/blocks/renderMarkdown';
import type { Block } from '~/core/blocks/Block';
import { importMarkdown } from '~/core/blocks/markdownImport';
import { useBlocksConfig } from '~/composables/useBlocksConfig';
const props = defineProps<{ block: Block }>();
const emit = defineEmits<{ 'update:block': [block: Block]; 'replace-block': [blocks: Block[]] }>();
const config = useBlocksConfig();
const field = ref<HTMLTextAreaElement>();
const error = ref('');
const editing = ref(false);
const hasTable = computed(() => lexer(props.block.data ?? '').some(token => token.type === 'table'));
const preview = computed(() => renderMarkdown(props.block.data ?? ''));
function split(source: string) {
  error.value = '';
  try {
    const blocks = importMarkdown(source, config.codeBlocksAllowed);
    if (blocks.length) emit('replace-block', blocks);
  } catch {
    error.value = 'Unable to import Markdown. Your source is preserved; edit it and try again.';
    emit('update:block', props.block.withData(source));
  }
}
function onPaste(event: ClipboardEvent) {
  if (!event.clipboardData || !field.value) return;
  const pasted = event.clipboardData.getData('text/plain');
  if (!pasted.trim()) return;
  event.preventDefault();
  split(field.value.value.slice(0, field.value.selectionStart) + pasted + field.value.value.slice(field.value.selectionEnd));
}
</script>

<style scoped>
.markdown-preview { font-family: inherit; font-size: inherit; line-height: inherit; }
.markdown-preview :deep(table) { border-collapse: collapse; width: 100%; font-family: inherit; font-size: inherit; line-height: inherit; }
.markdown-preview :deep(th), .markdown-preview :deep(td) { border: 1px solid var(--color-border, #a1a1aa); padding: 0.5rem 0.75rem; }
.markdown-preview :deep(th) { font-weight: 600; background: color-mix(in srgb, currentColor 5%, transparent); }
.markdown-preview :deep(p), .markdown-preview :deep(table), .markdown-preview :deep(pre) { margin-bottom: 0.75rem; }
.markdown-preview :deep(code) { font-family: monospace; font-size: 1em; }
.markdown-preview :deep(:not(pre) > code) { color: #e11d48; background-color: #fff1f2; padding: 0.1em 0.25em; border-radius: 0.2em; -webkit-box-decoration-break: clone; box-decoration-break: clone; }
:global(.dark) .markdown-preview :deep(:not(pre) > code) { color: #fda4af; background-color: rgb(136 19 55 / 0.25); }
.markdown-preview :deep(pre) { overflow-x: auto; padding: 0.75rem; }
.markdown-preview :deep(a) { color: #2563eb; text-decoration: underline; }
.markdown-preview :deep(ul) { list-style: disc; padding-left: 1.5rem; }
.markdown-preview :deep(ol) { list-style: decimal; padding-left: 1.5rem; }
.markdown-preview :deep(h1), .markdown-preview :deep(h2), .markdown-preview :deep(h3) { font-weight: 700; margin-bottom: 0.5rem; }
</style>

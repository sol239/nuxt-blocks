<template>
  <component :is="textTag" v-if="textTag" class="whitespace-pre-wrap break-words" :class="textClass">
    <FormattedSpans :spans="spans" />
  </component>
  <TodoBlock v-else-if="block.blockType === 'todo'" :block="block" read-only @update:block="emit('update:block', $event)" />
  <CodeBlock v-else-if="block.blockType === 'code'" :block="block" :line-number-offset="lineNumberOffset" read-only />
  <!-- renderMarkdown escapes raw HTML and restricts link protocols. -->
  <!-- eslint-disable-next-line vue/no-v-html -->
  <div v-else-if="markdownTypes.has(block.blockType ?? '')" class="read-markdown" v-html="markdown" />
  <LinkBlock v-else-if="block.blockType === 'link'" :block="block" read-only />
  <img v-else-if="block.blockType === 'image' && mediaUrl" :src="mediaUrl" :alt="mediaSettings.alt ?? ''" class="max-w-full" :width="mediaSettings.width" :height="mediaSettings.height">
  <video v-else-if="block.blockType === 'video' && mediaUrl" :src="mediaUrl" controls class="max-w-full" :width="mediaSettings.width" :height="mediaSettings.height" />
  <audio v-else-if="block.blockType === 'audio' && mediaUrl" :src="mediaUrl" controls />
  <component :is="blockComponents[block.blockType ?? 'paragraph']" v-else-if="!['notebook', 'ollama', 'codex', 'antigravity'].includes(block.blockType ?? '')" :block="block" inert />
  <p v-else class="whitespace-pre-wrap">{{ block.data }}</p>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import type { ImageBlockSettings } from '../core/blocks/ImageBlockSettings';
import type { Block } from '../core/blocks/Block';
import { blockComponents } from '../core/blocks/registry';
import { inlineMarkdownSpans } from '../core/blocks/inlineMarkdownSpans';
import { buildRenderSpans } from '../core/blocks/textSpans';
import { blocksToMarkdown } from '../core/blocks/blockClipboard';
import { mediaSource } from '../core/blocks/media';
import { renderMarkdown } from '../core/blocks/renderMarkdown';
import FormattedSpans from './FormattedSpans.vue';
import TodoBlock from './TodoBlock.vue';
import CodeBlock from './CodeBlock.vue';
import LinkBlock from './LinkBlock.vue';
const props = withDefaults(defineProps<{ block: Block; lineNumberOffset?: number }>(), { lineNumberOffset: 0 });
const emit = defineEmits<{ "update:block": [value: Block] }>();
const textTags: Record<string, string> = { paragraph: 'p', heading1: 'h1', heading2: 'h2', heading3: 'h3' };
const textTag = computed(() => textTags[props.block.blockType ?? 'paragraph']);
const textClasses: Record<string, string> = { paragraph: 'leading-7', heading1: 'text-3xl font-bold', heading2: 'text-2xl font-semibold', heading3: 'text-xl font-semibold' };
const textClass = computed(() => textClasses[props.block.blockType ?? 'paragraph']);
const spans = computed(() => inlineMarkdownSpans(buildRenderSpans(props.block.data ?? '', props.block.blockSettings.styles ?? [], props.block.blockSettings.colors ?? [])));
const mediaSettings = computed(() => props.block.blockSettings as ImageBlockSettings);
const mediaUrl = computed(() => mediaSource(props.block.data ?? '', mediaSettings.value.isUrl, mediaSettings.value.mimeType ?? '', props.block.blockType ?? ''));
const markdownTypes = new Set(['markdown', 'table', 'math', 'divider', 'bulletedList', 'numberedList', 'quote']);
const markdown = computed(() => renderMarkdown(blocksToMarkdown([props.block])));
</script>
<style scoped>
.read-markdown :deep(table) { width: 100%; border-collapse: collapse; }
.read-markdown :deep(th), .read-markdown :deep(td) { border: 1px solid #a1a1aa; padding: 0.5rem; }
.read-markdown :deep(ul) { list-style: disc; padding-left: 1.5rem; }
.read-markdown :deep(ol) { list-style: decimal; padding-left: 1.5rem; }
.read-markdown :deep(blockquote) { border-left: 4px solid #d1d5db; padding-left: 1rem; }
.read-markdown :deep(pre) { overflow-x: auto; }
</style>

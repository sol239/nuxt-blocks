<template>
  <!-- HTML comes from the block renderer or KaTeX with trust disabled. -->
  <!-- eslint-disable vue/no-v-html -->
  <template v-for="(span, idx) in spans" :key="idx">
    <!-- KaTeX generates this HTML with trust disabled. -->

    <span
      v-if="span.styles.includes('math')"
      class="inline-math inline-block align-baseline"
      :class="getSpanClasses(span)"
      :style="getSpanStyles(span)"
      v-html="renderKatex(span.text)"
    />
    <!-- Standard text span -->
    <span v-else :class="getSpanClasses(span)" :style="getSpanStyles(span)">{{
      span.text
    }}</span>
  </template>
</template>

<script setup lang="ts">
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { highlightColor } from '~/core/blocks/textSpans';
import type { RenderSpan } from '~/core/blocks/textSpans';

defineProps<{
  spans: RenderSpan[];
}>();

function renderKatex(text: string): string {
  if (!text) return '';
  try {
    return katex.renderToString(text, {
      displayMode: false,
      throwOnError: false,
      trust: false,
      maxExpand: 1000,
      maxSize: 20,
    });
  } catch {
    return text;
  }
}

function getSpanClasses(span: RenderSpan): string[] {
  const classes: string[] = [];
  // The text is painted behind a plain textarea. Font changes here alter glyph
  // advances without changing the textarea's selection geometry. Paint bold
  // weight without changing the inline layout instead.
  if (span.styles.includes('bold')) classes.push('rich-text-bold');
  if (span.styles.includes('italic') || span.styles.includes('inverse'))
    classes.push('italic');
  if (span.styles.includes('underline')) classes.push('underline');
  if (span.styles.includes('strikethrough')) classes.push('line-through');
  if (span.styles.includes('code')) classes.push('rich-text-inline-code');
  if (highlightColor(span.style)) classes.push('rich-text-highlight');
  return classes;
}

function getSpanStyles(span: RenderSpan): Record<string, string> {
  const styles: Record<string, string> = {};
  if (span.styles.includes('code')) {
    styles.color = 'var(--inline-code-color, #e11d48)';
  } else if (span.color) {
    styles.color = span.color;
  }
  const highlight = highlightColor(span.style);
  if (highlight) styles.backgroundColor = highlight;
  return styles;
}
</script>

<style scoped>
.rich-text-inline-code {
  --inline-code-color: #e11d48;
  background-color: #fff1f2;
  border-radius: 0.2em;
  -webkit-box-decoration-break: clone;
  box-decoration-break: clone;
}
:global(.dark) .rich-text-inline-code {
  --inline-code-color: #fda4af;
  background-color: rgb(136 19 55 / 0.25);
}

.rich-text-highlight {
  border-radius: 0.3em;
  -webkit-box-decoration-break: clone;
  box-decoration-break: clone;
}

.rich-text-bold {
  -webkit-text-stroke: 0.45px currentColor;
  paint-order: stroke fill;
}
</style>

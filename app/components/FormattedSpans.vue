<template>
  <template v-for="(span, idx) in spans" :key="idx">
    <!-- Inline KaTeX math rendering -->
    <span
      v-if="span.styles.includes('math')"
      class="inline-math inline-block align-baseline"
      :class="getSpanClasses(span)"
      :style="getSpanStyles(span)"
      v-html="renderKatex(span.text)"
    />
    <!-- Standard text span -->
    <span
      v-else
      :class="getSpanClasses(span)"
      :style="getSpanStyles(span)"
    >{{ span.text }}</span>
  </template>
</template>

<script setup lang="ts">
import katex from "katex";
import "katex/dist/katex.min.css";
import type { RenderSpan } from "~/core/blocks/textSpans";

defineProps<{
  spans: RenderSpan[];
}>();

function renderKatex(text: string): string {
  if (!text) return "";
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
  if (span.styles.includes("bold")) classes.push("rich-text-bold");
  if (span.styles.includes("italic") || span.styles.includes("inverse")) classes.push("italic");
  if (span.styles.includes("underline")) classes.push("underline");
  if (span.styles.includes("strikethrough")) classes.push("line-through");
  if (span.styles.includes("code")) classes.push("bg-gray-100 text-red-600 rounded");
  return classes;
}

function getSpanStyles(span: RenderSpan): Record<string, string> {
  const styles: Record<string, string> = {};
  if (span.color) {
    styles.color = span.color;
  }
  return styles;
}
</script>

<style scoped>
.rich-text-bold {
  -webkit-text-stroke: 0.45px currentColor;
  paint-order: stroke fill;
}

</style>

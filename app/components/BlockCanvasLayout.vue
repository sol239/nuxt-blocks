<template>
  <div v-if="canvasType === 'default'" class="mx-auto max-w-4xl">
    <slot
      v-for="(block, index) in blocks"
      :key="block.id"
      :block="block"
      :index="index"
      :fragment="undefined"
    />
    <slot name="empty" />
  </div>
  <div
    v-else
    ref="root"
    class="a4-pages"
    :style="{ height: `${pageCount * (A4.height + A4.gap) - A4.gap}px` }"
  >
    <div
      v-for="page in pageCount"
      :key="page"
      data-a4-page
      class="a4-sheet"
      :style="{ top: `${(page - 1) * (A4.height + A4.gap)}px` }"
      aria-hidden="true"
    >
      <span class="a4-page-number">{{ page }}</span>
    </div>
    <div
      v-for="fragment in fragments"
      :key="fragment.key"
      :data-a4-fragment="fragment.key"
      :data-source-block-id="fragment.block.id"
      :data-page="fragment.page + 1"
      class="a4-fragment"
      :style="fragmentStyle(fragment)"
    >
      <BlockPageFragment
        :ref="(el) => setFragmentRef(fragment.key, el)"
        :fragment="fragment"
        :data-fragment-content="fragment.key"
        :style="
          fragment.cropOffset
            ? { transform: `translateY(-${fragment.cropOffset}px)` }
            : undefined
        "
      >
        <slot
          :block="fragment.block"
          :index="fragment.index"
          :fragment="fragment"
        />
      </BlockPageFragment>
    </div>
    <div v-if="!blocks.length" class="a4-empty"><slot name="empty" /></div>
    <div ref="probe" class="a4-measure" aria-hidden="true" />
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  watch,
  nextTick,
  onMounted,
  onBeforeUnmount,
} from 'vue';
import type { Block } from '../core/blocks/Block';
import {
  A4,
  paginateBlocks,
  isPaginatedText,
  type PageFragment,
} from '../core/blocks/a4Pagination';
import BlockPageFragment from './BlockPageFragment.vue';
import type { FragmentCodeCaret } from '../composables/usePageFragment';

const props = defineProps<{ blocks: Block[]; canvasType: 'default' | 'a4' }>();
const root = ref<HTMLElement>();
const probe = ref<HTMLElement>();
const revision = ref(0);
const corrections = new Map<string, number>();
const objectHeights = new Map<string, { source: Block; height: number }>();
let observer: ResizeObserver | undefined;
let frame = 0;
let disposed = false;
const fragmentRefs = new Map<string, { codeCaret?: FragmentCodeCaret }>();
function setFragmentRef(key: string, instance: unknown) {
  if (instance)
    fragmentRefs.set(key, instance as { codeCaret?: FragmentCodeCaret });
  else fragmentRefs.delete(key);
}

function captureCaret(fragment: PageFragment) {
  const element = root.value?.querySelector<HTMLElement>(
    `[data-a4-fragment="${CSS.escape(fragment.key)}"]`,
  );
  const active = document.activeElement;
  if (!active || !element?.contains(active)) return;
  const codeCaret = fragmentRefs.get(fragment.key)?.codeCaret;
  const field = active instanceof HTMLTextAreaElement ? active : undefined;
  if (!codeCaret && !field) return;
  const start = fragment.start + (codeCaret?.offset() ?? field!.selectionStart);
  const end = fragment.start + (codeCaret?.offset() ?? field!.selectionEnd);
  void nextTick(() =>
    requestAnimationFrame(async () => {
      if (
        disposed ||
        (document.activeElement !== active &&
          document.activeElement !== document.body)
      )
        return;
      const matches = fragments.value.filter(
        (part) => part.block.id === fragment.block.id,
      );
      const target =
        matches.find((part) => part.start <= start && start < part.end) ??
        matches.at(-1);
      if (!target) return;
      const code = fragmentRefs.get(target.key)?.codeCaret;
      if (code) {
        code.focus(start - target.start);
        return;
      }
      const wrapper = root.value?.querySelector<HTMLElement>(
        `[data-a4-fragment="${CSS.escape(target.key)}"]`,
      );
      const textarea = wrapper?.querySelector<HTMLTextAreaElement>('textarea');
      if (!textarea) return;
      if (!textarea.getClientRects().length) {
        textarea.parentElement?.parentElement?.click();
        await nextTick();
      }
      textarea.focus({ preventScroll: true });
      textarea.setSelectionRange(start - target.start, end - target.start);
      textarea.dispatchEvent(new Event('select'));
    }),
  );
}
defineExpose({ captureCaret });

function baseHeight(block: Block, data: string) {
  const code = block.blockType === 'code';
  const heading = block.blockType.startsWith('heading');
  const size = code ? 14 : (block.blockSettings.fontSize ?? 16);
  const lineHeight = code
    ? 22
    : block.blockType === 'paragraph'
      ? 28
      : size * 1.5;
  // Includes BlockWrapper padding/margins and the code header/editor padding.
  const headingMargins: Record<string, number> = {
    heading1: 16,
    heading2: 12,
    heading3: 8,
  };
  const overhead = code
    ? 63
    : heading
      ? 16 + (headingMargins[block.blockType] ?? 0)
      : 8;
  if (probe.value) {
    const el = probe.value;
    el.style.width = `${A4.width - 2 * A4.paddingX - 40 - (code ? 74 : ['bulletedList', 'numberedList', 'quote'].includes(block.blockType) ? 24 : 0)}px`;
    el.style.fontFamily = code
      ? "'JetBrains Mono', Consolas, monospace"
      : `'${block.blockSettings.fontFamily ?? 'Inter'}', sans-serif`;
    el.style.fontSize = `${size}px`;
    el.style.lineHeight = `${lineHeight}px`;
    el.style.fontWeight = heading ? '700' : '400';
    el.textContent = data + '\u200b';
    return el.getBoundingClientRect().height + overhead;
  }
  return Math.max(1, data.split('\n').length) * lineHeight + overhead;
}

function measure(block: Block, data: string) {
  if (!isPaginatedText(block)) {
    const known = objectHeights.get(block.id);
    return known?.source === block
      ? known.height
      : Math.max(40, block.blockSettings.height ?? 200);
  }
  return baseHeight(block, data) + (corrections.get(block.id) ?? 0);
}

const fragments = computed(() => {
  void revision.value;
  return props.canvasType === 'a4' ? paginateBlocks(props.blocks, measure) : [];
});
const pageCount = computed(() =>
  Math.max(1, (fragments.value.at(-1)?.page ?? 0) + 1),
);

function fragmentStyle(fragment: PageFragment) {
  return {
    top: `${fragment.page * (A4.height + A4.gap) + A4.paddingY + fragment.top}px`,
    ...(fragment.kind === 'viewport'
      ? { height: `${fragment.height}px`, overflow: 'hidden' }
      : {}),
  };
}

function requestMeasure() {
  if (frame || disposed) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    revision.value++;
  });
}

async function observeContent() {
  await nextTick();
  observer?.disconnect();
  if (!root.value || props.canvasType !== 'a4' || disposed) return;
  observer ??= new ResizeObserver((entries) => {
    let changed = false;
    for (const entry of entries) {
      const element = entry.target as HTMLElement;
      const fragment = fragments.value.find(
        (item) => item.key === element.dataset.fragmentContent,
      );
      if (!fragment) continue;
      const actual = element.getBoundingClientRect().height;
      if (!actual) continue;
      if (fragment.kind === 'viewport') {
        const source = props.blocks[fragment.index]!;
        const known = objectHeights.get(source.id);
        if (known?.source !== source || Math.abs(known.height - actual) > 0.5) {
          objectHeights.set(source.id, { source, height: actual });
          changed = true;
        }
      } else {
        const extra =
          actual - baseHeight(fragment.block, fragment.block.data ?? '');
        if (extra > (corrections.get(fragment.block.id) ?? 0) + 0.5) {
          corrections.set(fragment.block.id, extra);
          changed = true;
        }
      }
    }
    if (changed) requestMeasure();
  });
  root.value
    .querySelectorAll<HTMLElement>('[data-fragment-content]')
    .forEach((el) => observer!.observe(el));
}

watch([fragments, () => props.canvasType], observeContent, { flush: 'post' });
onMounted(() => {
  revision.value++;
  void observeContent();
  void document.fonts.ready.then(() => {
    if (!disposed) {
      corrections.clear();
      requestMeasure();
    }
  });
});
onBeforeUnmount(() => {
  disposed = true;
  observer?.disconnect();
  cancelAnimationFrame(frame);
});
</script>

<style scoped>
.a4-pages {
  position: relative;
  width: 794px;
}
.a4-sheet {
  position: absolute;
  left: 0;
  width: 794px;
  height: 1123px;
  background: white;
  box-shadow: 0 1px 8px rgb(0 0 0 / 0.12);
  pointer-events: none;
}
:global(.dark) .a4-sheet {
  background: #18181b;
}
.a4-page-number {
  position: absolute;
  bottom: 12px;
  inset-inline: 0;
  text-align: center;
  font-size: 11px;
  color: #71717a;
}
.a4-fragment {
  position: absolute;
  left: 48px;
  width: 698px;
}
.a4-empty {
  position: absolute;
  top: 40px;
  left: 48px;
  width: 698px;
}
.a4-measure {
  position: fixed;
  top: 0;
  left: -10000px;
  visibility: hidden;
  pointer-events: none;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  tab-size: 2;
}
</style>

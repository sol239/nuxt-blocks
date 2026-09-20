<template>
  <div class="relative w-full">
    <BlockCanvas
      :blocks="blocks"
      @add="addBlock"
      @add-after="addBlock('paragraph', $event)"
      @delete="deleteBlock"
      @update:block="onUpdateBlock"
      @focused-block-type="focusedBlockType = $event"
      @focused-block="focusedBlock = $event"
    />

    <TextToolbar
      :visible="isTextToolbarVisible"
      :block="focusedBlock"
      @update:block="onToolbarUpdateBlock"
      @update:settings="onUpdateFocusedBlockSettings"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from "vue";
import { Block, type BlockType } from "~/core/blocks/Block";
import {
  createBlock,
  initialBlockData,
  Heading1Block,
  Heading2Block,
  Heading3Block,
  ParagraphBlock,
  DividerBlock,
  BulletedListBlock,
  NumberedListBlock,
  QuoteBlock,
  LinkBlock,
  ImageBlock,
  VideoBlock,
  AudioBlock,
  CodeBlock,
  MathBlock,
} from "~/core/blocks/registry";
import { ImageBlockSettings } from "~/core/blocks/ImageBlockSettings";
import { CodeBlockSettings } from "~/core/blocks/CodeBlockSettings";

export interface Props {
  initialBlocks?: Block[];
}

const props = defineProps<Props>();

/**
 * Demo dataset representing the Czech Lands journey blocks.
 * Uses concrete block subclasses extending Block with rich styling spans.
 */
const demoBlocks: Block[] = [
  new Heading1Block("title", 1, "A Journey Through the Czech Lands", {
    styles: [
      { start: 0, end: 22, style: "normal" },
      { start: 22, end: 33, style: "bold" },
    ],
    colors: [
      { start: 22, end: 33, color: "#2563eb" },
    ],
  }),
  new ParagraphBlock(
    "introduction",
    1,
    "At the crossroads of Central Europe lies a landscape shaped by ancient settlements, royal ambition, artistic courage, and an enduring sense of identity. From the valleys of Bohemia to the hills of Moravia, every era has left a visible mark.",
    {
      styles: [
        { start: 0, end: 21, style: "normal" },
        { start: 21, end: 35, style: "bold" },
        { start: 35, end: 236, style: "normal" },
      ],
      colors: [
        { start: 21, end: 35, color: "#dc2626" },
      ],
    },
  ),
  new Heading2Block("origins-title", 1, "From Early Settlements to a Kingdom", {
    styles: [
      { start: 0, end: 26, style: "normal" },
      { start: 26, end: 35, style: "bold underline" },
    ],
    colors: [
      { start: 26, end: 35, color: "#16a34a" },
    ],
  }),
  new ParagraphBlock(
    "origins",
    1,
    "Celtic and Germanic peoples once moved through these lands before Slavic communities established permanent settlements in the sixth century. Over time, the Přemyslid dynasty united the region and transformed Bohemia into one of medieval Europe’s most influential kingdoms.",
  ),
  new Heading3Block("turning-point-title", 1, "Prague in the Age of Charles IV"),
  new ParagraphBlock(
    "turning-point",
    1,
    "The fourteenth century brought an extraordinary cultural flourishing. Under Charles IV (calculating with formula E = mc^2), Prague became an imperial capital filled with ambitious architecture, scholarship, and trade. The university, stone bridge, and cathedral begun during his reign still define the city today.",
    {
      styles: [
        { start: 0, end: 113, style: "normal" },
        { start: 113, end: 120, style: "math" },
        { start: 120, end: 310, style: "normal" },
      ],
      colors: [
        { start: 113, end: 120, color: "#2563eb" },
      ],
    },
  ),
  new Heading2Block("legacy-title", 1, "A Living History", {
    styles: [
      { start: 0, end: 2, style: "normal" },
      { start: 2, end: 8, style: "italic" },
      { start: 8, end: 16, style: "normal" },
    ],
    colors: [
      { start: 2, end: 8, color: "#2563eb" },
    ],
  }),
  new ParagraphBlock(
    "legacy",
    1,
    "The Czech story continued through religious reform, Habsburg rule, industrial growth, independence, occupation, communism, and democratic renewal. Its history is not confined to museums—it remains present in town squares, family traditions, literature, music, and everyday life.",
  ),
  new DividerBlock("example-divider", 1, "---"),
  new BulletedListBlock(
    "example-bulleted-list",
    1,
    "- Explore Prague’s Old Town\n- Walk across Charles Bridge\n- Visit the hills of Moravia",
  ),
  new NumberedListBlock(
    "example-numbered-list",
    1,
    "1. Choose a destination\n2. Plan your route\n3. Start exploring",
  ),
  new QuoteBlock(
    "example-quote",
    1,
    "> Every journey begins with curiosity.\n> Take time to notice the small details.",
  ),
  new LinkBlock("example-link", 1, "https://en.wikipedia.org/wiki/History_of_the_Czech_lands"),
  new ImageBlock(
    "example-image",
    1,
    "https://interactive-examples.mdn.mozilla.net/media/cc0-images/painted-hand-298-332.jpg",
    Object.assign(new ImageBlockSettings(), {
      isUrl: true,
      mimeType: "image/jpeg",
      alt: "A hand painted in bright colors",
    }),
  ),
  new VideoBlock(
    "example-video",
    1,
    "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
  ),
  new AudioBlock(
    "example-audio",
    1,
    "https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3",
  ),
  new CodeBlock(
    "example-code",
    1,
    'const destinations = ["Prague", "Brno", "Olomouc"];\n\nfor (const city of destinations) {\n  console.log(`Next stop: ${city}`);\n}',
    Object.assign(new CodeBlockSettings(), { language: "javascript" }),
  ),
  new MathBlock("example-math", 1, "E = mc^2"),
];

const blocks = ref<Block[]>(props.initialBlocks ? [...props.initialBlocks] : [...demoBlocks]);

const focusedBlockType = ref<BlockType | null>(null);
const focusedBlock = ref<Block | null>(null);

const textEditableTypes = new Set<BlockType>([
  "paragraph",
  "heading1",
  "heading2",
  "heading3",
  "bulletedList",
  "numberedList",
  "quote",
]);

const isTextToolbarVisible = computed(() => {
  return focusedBlockType.value !== null && textEditableTypes.has(focusedBlockType.value);
});

function addBlock(type: BlockType, index = blocks.value.length) {
  const block = createBlock(type, crypto.randomUUID(), 1, initialBlockData(type));
  blocks.value.splice(index, 0, block);
  nextTick(() => {
    const wrapper = document.querySelector<HTMLElement>('[data-block-id="' + block.id + '"]');
    (wrapper?.querySelector<HTMLElement>("textarea, input, select") ?? wrapper)?.focus();
  });
}

function deleteBlock(id: string) {
  const index = blocks.value.findIndex((b) => b.id === id);
  if (index !== -1) blocks.value.splice(index, 1);
}

function onUpdateBlock(index: number, block: Block) {
  blocks.value[index] = block;
  if (focusedBlock.value?.id === block.id) {
    focusedBlock.value = block;
  }
}

function onToolbarUpdateBlock(updated: Block) {
  const index = blocks.value.findIndex((b) => b.id === updated.id);
  if (index !== -1) {
    blocks.value[index] = updated;
    focusedBlock.value = updated;
  }
}

function onUpdateFocusedBlockSettings(settings: { fontFamily?: string; fontSize?: number }) {
  if (!focusedBlock.value) return;
  const index = blocks.value.findIndex((b) => b.id === focusedBlock.value?.id);
  if (index === -1) return;
  const current = blocks.value[index];
  if (!current) return;
  const updated = current.withSettings({
    ...current.blockSettings,
    ...settings,
  });
  blocks.value[index] = updated;
  focusedBlock.value = updated;
}
</script>

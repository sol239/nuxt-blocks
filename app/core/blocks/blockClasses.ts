import { Block, type BlockType } from "./Block";

import { ParagraphBlock } from "./ParagraphBlock";
import { Heading1Block } from "./Heading1Block";
import { Heading2Block } from "./Heading2Block";
import { Heading3Block } from "./Heading3Block";
import { DividerBlock } from "./DividerBlock";
import { BulletedListBlock } from "./BulletedListBlock";
import { NumberedListBlock } from "./NumberedListBlock";
import { QuoteBlock } from "./QuoteBlock";
import { LinkBlock } from "./LinkBlock";
import { ImageBlock } from "./ImageBlock";
import { VideoBlock } from "./VideoBlock";
import { AudioBlock } from "./AudioBlock";
import { CodeBlock } from "./CodeBlock";
import { MathBlock } from "./MathBlock";
import { DrawingBlock } from "./DrawingBlock";

export const blockClasses = {
  paragraph: ParagraphBlock,
  heading1: Heading1Block,
  heading2: Heading2Block,
  heading3: Heading3Block,
  divider: DividerBlock,
  bulletedList: BulletedListBlock,
  numberedList: NumberedListBlock,
  quote: QuoteBlock,
  link: LinkBlock,
  image: ImageBlock,
  video: VideoBlock,
  audio: AudioBlock,
  code: CodeBlock,
  math: MathBlock,
  drawing: DrawingBlock,
} as const;

export type BlockClassMap = typeof blockClasses;

export function createBlock<T extends BlockType>(
  type: T,
  id: string = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
  version: number = 1,
  data: string | null = null,
  settings: any = null,
): InstanceType<BlockClassMap[T]> {
  const Ctor = blockClasses[type] as unknown as new (
    id: string,
    version: number,
    data: string | null,
    settings?: any,
  ) => InstanceType<BlockClassMap[T]>;
  if (!Ctor) {
    throw new Error(`Unknown block type: ${type}`);
  }
  return new Ctor(id, version, data, settings);
}

// Wire up deserializer on Block base class
Block.setDeserializer((json) => {
  return createBlock(json.blockType, json.id, json.version, json.data, json.blockSettings);
});

export function initialBlockData(type: BlockType): string {
  return ({
    divider: "---",
    bulletedList: "- ",
    numberedList: "1. ",
    quote: "> ",
    drawing: JSON.stringify({ strokes: [] }),
  } as Partial<Record<BlockType, string>>)[type] ?? "";
}

export {
  ParagraphBlock,
  Heading1Block,
  Heading2Block,
  Heading3Block,
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
  DrawingBlock,
};

import ParagraphComponent from "~/components/ParagraphBlock.vue";
import Heading1Component from "~/components/Heading1Block.vue";
import Heading2Component from "~/components/Heading2Block.vue";
import Heading3Component from "~/components/Heading3Block.vue";
import DividerComponent from "~/components/DividerBlock.vue";
import BulletedListComponent from "~/components/BulletedListBlock.vue";
import NumberedListComponent from "~/components/NumberedListBlock.vue";
import QuoteComponent from "~/components/QuoteBlock.vue";
import LinkComponent from "~/components/LinkBlock.vue";
import ImageComponent from "~/components/ImageBlock.vue";
import VideoComponent from "~/components/VideoBlock.vue";
import AudioComponent from "~/components/AudioBlock.vue";
import CodeComponent from "~/components/CodeBlock.vue";
import MathComponent from "~/components/MathBlock.vue";
import DrawingComponent from "~/components/DrawingBlock.vue";
import type { Component } from "vue";
import type { BlockType } from "./Block";

export * from "./blockClasses";

export const blockComponents: Record<BlockType, Component> = {
  paragraph: ParagraphComponent,
  heading1: Heading1Component,
  heading2: Heading2Component,
  heading3: Heading3Component,
  divider: DividerComponent,
  bulletedList: BulletedListComponent,
  numberedList: NumberedListComponent,
  quote: QuoteComponent,
  link: LinkComponent,
  image: ImageComponent,
  video: VideoComponent,
  audio: AudioComponent,
  code: CodeComponent,
  math: MathComponent,
  drawing: DrawingComponent,
};

export const blockLabels: Record<BlockType, string> = {
  paragraph: "Paragraph",
  heading1: "Heading 1",
  heading2: "Heading 2",
  heading3: "Heading 3",
  divider: "Divider",
  bulletedList: "Bulleted List",
  numberedList: "Numbered List",
  quote: "Quote",
  link: "Link",
  image: "Image",
  video: "Video",
  audio: "Audio",
  code: "Code",
  math: "Math",
  drawing: "Drawing",
};

import TodoComponent from '../../components/TodoBlock.vue';
import TableComponent from '../../components/TableBlock.vue';
import AiComponent from "./../../components/AiBlock.vue";
import NotebookComponent from "~/components/NotebookBlock.vue";
import WebComponent from '~/components/WebBlock.vue';
import InteractiveComponent from "~/components/InteractiveBlock.vue";
import MarkdownComponent from "~/components/MarkdownBlock.vue";
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
  todo: TodoComponent,
  table: TableComponent,
  ollama: AiComponent,
  codex: AiComponent,
  antigravity: AiComponent,
  notebook: NotebookComponent,
  web: WebComponent,
  interactive: InteractiveComponent,
  paragraph: ParagraphComponent,
  markdown: MarkdownComponent,
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
  todo: "To do",
  table: "Table",
  ollama: "Ollama",
  codex: "Codex",
  antigravity: "Antigravity",
  notebook: "Notebook",
  web: "Web",
  interactive: "Interactive",
  paragraph: "Paragraph",
  markdown: "Markdown",
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

export const blockIcons: Record<BlockType, string> = {
  todo: "material-symbols:check-circle-outline",
  table: "material-symbols:table",
  ollama: "lucide:bot",
  codex: "lucide:sparkles",
  antigravity: "lucide:orbit",
  notebook: "material-symbols:book-2",
  web: "material-symbols:language",
  interactive: "material-symbols:tune",
  paragraph: "material-symbols:notes",
  markdown: "material-symbols:markdown",
  heading1: "material-symbols:format-h1",
  heading2: "material-symbols:format-h2",
  heading3: "material-symbols:format-h3",
  divider: "material-symbols:horizontal-rule",
  bulletedList: "material-symbols:format-list-bulleted",
  numberedList: "material-symbols:format-list-numbered",
  quote: "material-symbols:format-quote",
  link: "material-symbols:link",
  image: "material-symbols:image",
  video: "material-symbols:movie",
  audio: "material-symbols:audio-file",
  code: "material-symbols:code",
  math: "material-symbols:function",
  drawing: "material-symbols:draw",
};

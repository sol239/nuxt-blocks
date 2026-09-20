import { ParagraphBlockSettings } from "./ParagraphBlockSettings";
import { Heading1BlockSettings } from "./Heading1BlockSettings";
import { Heading2BlockSettings } from "./Heading2BlockSettings";
import { Heading3BlockSettings } from "./Heading3BlockSettings";
import { DividerBlockSettings } from "./DividerBlockSettings";
import { BulletedListBlockSettings } from "./BulletedListBlockSettings";
import { NumberedListBlockSettings } from "./NumberedListBlockSettings";
import { QuoteBlockSettings } from "./QuoteBlockSettings";
import { LinkBlockSettings } from "./LinkBlockSettings";
import { ImageBlockSettings } from "./ImageBlockSettings";
import { VideoBlockSettings } from "./VideoBlockSettings";
import { AudioBlockSettings } from "./AudioBlockSettings";
import { CodeBlockSettings } from "./CodeBlockSettings";
import { MathBlockSettings } from "./MathBlockSettings";
import { DrawingBlockSettings } from "./DrawingBlockSettings";
export const settingsClasses = {
  paragraph: ParagraphBlockSettings,
  heading1: Heading1BlockSettings,
  heading2: Heading2BlockSettings,
  heading3: Heading3BlockSettings,
  divider: DividerBlockSettings,
  bulletedList: BulletedListBlockSettings,
  numberedList: NumberedListBlockSettings,
  quote: QuoteBlockSettings,
  link: LinkBlockSettings,
  image: ImageBlockSettings,
  video: VideoBlockSettings,
  audio: AudioBlockSettings,
  code: CodeBlockSettings,
  math: MathBlockSettings,
  drawing: DrawingBlockSettings,
};
export function createBlockSettings(type: keyof typeof settingsClasses, value?: object | null) {
  return Object.assign(new settingsClasses[type](), value ?? {});
}

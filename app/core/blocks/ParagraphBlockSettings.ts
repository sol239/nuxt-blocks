import type { IBlockSettings, BlockAllignment } from "./IBlockSettings";
import type { StyleSpan, ColorSpan } from "./textSpans";

export class ParagraphBlockSettings implements IBlockSettings {
  alignment: BlockAllignment = "left";
  fontFamily: string = "Inter";
  fontSize: number = 16;
  styles: StyleSpan[] = [];
  colors: ColorSpan[] = [];
}

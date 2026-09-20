import type { IBlockSettings, BlockAllignment } from "./IBlockSettings";
import type { StyleSpan, ColorSpan } from "./textSpans";

export class Heading2BlockSettings implements IBlockSettings {
  alignment: BlockAllignment = "left";
  fontFamily: string = "Inter";
  fontSize: number = 28;
  styles: StyleSpan[] = [];
  colors: ColorSpan[] = [];
}

import type { IBlockSettings, BlockAllignment } from "./IBlockSettings";
import type { StyleSpan, ColorSpan } from "./textSpans";

export class Heading1BlockSettings implements IBlockSettings {
  alignment: BlockAllignment = "left";
  fontFamily: string = "Inter";
  fontSize: number = 36;
  styles: StyleSpan[] = [];
  colors: ColorSpan[] = [];
}

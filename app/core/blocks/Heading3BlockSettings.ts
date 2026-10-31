import type { IBlockSettings, BlockAllignment } from './IBlockSettings';
import type { StyleSpan, ColorSpan } from './textSpans';

export class Heading3BlockSettings implements IBlockSettings {
  alignment: BlockAllignment = 'left';
  fontFamily: string = 'Inter';
  fontSize: number = 20;
  styles: StyleSpan[] = [];
  colors: ColorSpan[] = [];
}

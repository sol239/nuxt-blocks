import type { StyleSpan, ColorSpan } from "./textSpans";

export type BlockAllignment = "left" | "center" | "right";

export interface IBlockSettings {
  alignment: BlockAllignment;
  fontFamily?: string;
  fontSize?: number;
  width?: number;
  height?: number;
  styles?: StyleSpan[];
  colors?: ColorSpan[];
}
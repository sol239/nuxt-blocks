import type { IBlockSettings, BlockAllignment } from "./IBlockSettings";

export class DrawingBlockSettings implements IBlockSettings {
  alignment: BlockAllignment = "left";
  width?: number;
  height?: number;
}


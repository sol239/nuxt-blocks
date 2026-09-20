import type { IBlockSettings, BlockAllignment } from "./IBlockSettings";
export class MathBlockSettings implements IBlockSettings {
  alignment: BlockAllignment = "left";
  displayMode = true;
}

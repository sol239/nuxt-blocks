import type { IBlockSettings, BlockAllignment } from "./IBlockSettings";
export class AntigravityBlockSettings implements IBlockSettings {
  model = "";
  effort = "";
  alignment: BlockAllignment = "left";
}

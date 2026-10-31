import type { IBlockSettings, BlockAllignment } from "./IBlockSettings";
export class CodexBlockSettings implements IBlockSettings {
  model = "";
  effort = "";
  alignment: BlockAllignment = "left";
}

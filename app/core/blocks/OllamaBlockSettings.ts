import type { IBlockSettings, BlockAllignment } from "./IBlockSettings";
export class OllamaBlockSettings implements IBlockSettings {
  model = "";
  effort = "";
  alignment: BlockAllignment = "left";
}

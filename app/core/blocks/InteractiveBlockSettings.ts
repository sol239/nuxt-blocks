import type { IBlockSettings, BlockAllignment } from "./IBlockSettings";

export class InteractiveBlockSettings implements IBlockSettings {
  alignment: BlockAllignment = "left";
}

import type { IBlockSettings, BlockAllignment } from "./IBlockSettings";

export class NumberedListBlockSettings implements IBlockSettings {
  alignment: BlockAllignment = "left";
  fontFamily: string = "Inter";
  fontSize: number = 16;
}

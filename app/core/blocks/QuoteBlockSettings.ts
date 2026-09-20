import type { IBlockSettings, BlockAllignment } from "./IBlockSettings";

export class QuoteBlockSettings implements IBlockSettings {
  alignment: BlockAllignment = "left";
  fontFamily: string = "Inter";
  fontSize: number = 16;
}

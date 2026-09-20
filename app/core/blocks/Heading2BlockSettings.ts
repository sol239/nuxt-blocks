import type { IBlockSettings, BlockAllignment } from "./IBlockSettings";

export class Heading2BlockSettings implements IBlockSettings {
  alignment: BlockAllignment = "left";
  fontFamily: string = "Inter";
  fontSize: number = 28;
}

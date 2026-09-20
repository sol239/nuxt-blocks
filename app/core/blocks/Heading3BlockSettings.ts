import type { IBlockSettings, BlockAllignment } from "./IBlockSettings";

export class Heading3BlockSettings implements IBlockSettings {
  alignment: BlockAllignment = "left";
  fontFamily: string = "Inter";
  fontSize: number = 22;
}

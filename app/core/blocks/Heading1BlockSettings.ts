import type { IBlockSettings, BlockAllignment } from "./IBlockSettings";

export class Heading1BlockSettings implements IBlockSettings {
  alignment: BlockAllignment = "left";
  fontFamily: string = "Inter";
  fontSize: number = 36;
}

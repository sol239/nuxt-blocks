import type { IBlockSettings, BlockAllignment } from "./IBlockSettings";
export class CodeBlockSettings implements IBlockSettings {
  alignment: BlockAllignment = "left";
  language = "javascript";
}

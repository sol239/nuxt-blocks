import type { IBlockSettings, BlockAllignment } from "./IBlockSettings";
export class ImageBlockSettings implements IBlockSettings {
  alignment: BlockAllignment = "center";
  isUrl = true;
  mimeType = "image/png";
  alt = "";
  width?: number;
  height?: number;
}

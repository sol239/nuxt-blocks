import type { IBlockSettings, BlockAllignment } from "./IBlockSettings";
export class VideoBlockSettings implements IBlockSettings {
  alignment: BlockAllignment = "center";
  isUrl = true;
  mimeType = "video/mp4";
  controls = true;
  width?: number;
  height?: number;
}

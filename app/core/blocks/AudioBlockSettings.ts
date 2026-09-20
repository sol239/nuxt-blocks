import type { IBlockSettings, BlockAllignment } from "./IBlockSettings";
export class AudioBlockSettings implements IBlockSettings {
  alignment: BlockAllignment = "left";
  isUrl = true;
  mimeType = "audio/mpeg";
  controls = true;
}

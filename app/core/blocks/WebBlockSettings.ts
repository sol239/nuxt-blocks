import type { IBlockSettings, BlockAllignment } from './IBlockSettings';

export class WebBlockSettings implements IBlockSettings {
  alignment: BlockAllignment = 'left';
  height = 420;
}

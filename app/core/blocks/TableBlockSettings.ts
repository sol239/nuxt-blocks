import type { IBlockSettings, BlockAllignment } from './IBlockSettings';
export class TableBlockSettings implements IBlockSettings {
  alignment: BlockAllignment = 'left';
  fontFamily = 'Inter';
  fontSize = 16;
}

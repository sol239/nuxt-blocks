import type { IBlockSettings, BlockAllignment } from './IBlockSettings';
export class NotebookBlockSettings implements IBlockSettings {
  alignment: BlockAllignment = 'left';
}

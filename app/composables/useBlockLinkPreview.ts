import { inject, type InjectionKey } from 'vue';

export interface BlockLinkPreview {
  path: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

export type BlockLinkResolver = (url: string) => Promise<BlockLinkPreview | null>;
export const BLOCK_LINK_RESOLVER_KEY: InjectionKey<BlockLinkResolver> = Symbol('block_link_resolver');

export function useBlockLinkResolver(): BlockLinkResolver | null {
  return inject(BLOCK_LINK_RESOLVER_KEY, null);
}

import { inject, type Component, type InjectionKey } from 'vue';

export const BLOCK_CARD_CREATOR_KEY: InjectionKey<Component | null> = Symbol('block_card_creator');
export function useBlockCardCreator(): Component | null {
  return inject(BLOCK_CARD_CREATOR_KEY, null);
}

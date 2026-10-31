import { inject, type InjectionKey, type Ref } from 'vue';

export type CodeBlockStyle = 'default' | 'fleet' | 'monokai';
export const CODE_BLOCK_STYLE_KEY: InjectionKey<Readonly<Ref<CodeBlockStyle>>> =
  Symbol('code-block-style');
export function useCodeBlockStyle() {
  return inject(CODE_BLOCK_STYLE_KEY, undefined);
}

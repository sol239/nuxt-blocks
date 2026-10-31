import { inject, type ComputedRef, type InjectionKey, type ShallowRef } from 'vue';

export interface FragmentCodeCaret {
  offset(): number;
  focus(offset: number): void;
}
export interface PageFragmentContext {
  start: ComputedRef<number>;
  codeCaret: ShallowRef<FragmentCodeCaret | undefined>;
}
export const PAGE_FRAGMENT_KEY: InjectionKey<PageFragmentContext> = Symbol('page-fragment');
export function usePageFragment() { return inject(PAGE_FRAGMENT_KEY, null); }

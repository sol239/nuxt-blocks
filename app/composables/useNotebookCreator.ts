import { inject, type InjectionKey } from 'vue';
export type NotebookCreator = (blockId: string, name: string) => Promise<string>;
export const NOTEBOOK_CREATOR_KEY: InjectionKey<NotebookCreator> = Symbol('notebook_creator');
export const NOTEBOOK_CREATED_KEY: InjectionKey<(url: string) => Promise<void>> = Symbol('notebook_created');
export function useNotebookCreated() { return inject(NOTEBOOK_CREATED_KEY, null); }
export function useNotebookCreator(): NotebookCreator | null { return inject(NOTEBOOK_CREATOR_KEY, null); }

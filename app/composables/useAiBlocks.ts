import { inject, type Component, type InjectionKey } from 'vue';
export interface AiModel { value: string; label: string; efforts: { value: string; label: string }[] }
export interface AiBlocks {
  selectComponent?: Component;
  icons?: Partial<Record<'ollama' | 'codex' | 'antigravity', string>>;
  models(provider: 'ollama' | 'codex' | 'antigravity'): Promise<AiModel[]>;
  generate(provider: 'ollama' | 'codex' | 'antigravity', model: string, effort: string, prompt: string, signal: AbortSignal, delta: (text: string) => void): Promise<string>;
}
export const AI_BLOCKS_KEY: InjectionKey<AiBlocks> = Symbol('ai_blocks');
export function useAiBlocks() { return inject(AI_BLOCKS_KEY, null); }

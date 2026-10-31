import type { AiModel } from '../../composables/useAiBlocks';

type Provider = 'codex' | 'ollama' | 'antigravity';
interface Selection {
  model: string;
  effort: string;
}
const key = (provider: Provider) => `blocks:${provider}:last-selection`;

export function rememberAiSelection(
  provider: Provider,
  selection: Selection,
): void {
  try {
    localStorage.setItem(key(provider), JSON.stringify(selection));
  } catch {
    /* Storage may be unavailable in private or embedded contexts. */
  }
}

export function recalledAiSelection(
  provider: Provider,
  models: AiModel[],
): Selection | null {
  try {
    const selection = JSON.parse(localStorage.getItem(key(provider)) || 'null');
    if (!selection || typeof selection.model !== 'string') return null;
    const model = models.find((item) => item.value === selection.model);
    if (!model) return null;
    const efforts = model.efforts ?? [];
    return {
      model: model.value,
      effort: efforts.some((item) => item.value === selection.effort)
        ? selection.effort
        : efforts[0]?.value || '',
    };
  } catch {
    return null;
  }
}

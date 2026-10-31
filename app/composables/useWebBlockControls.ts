import type { InjectionKey, ShallowRef } from 'vue';

export interface WebBlockControls {
  readonly showSource: boolean;
  readonly running: boolean;
  readonly height: number;
  readonly sourceId: string;
  toggleSource(): void;
  importFile(event: Event): Promise<void>;
  resize(event: Event): void;
  run(): void;
  stop(): void;
}

/** A wrapper owns its controls; only its own WebBlock registers here. */
export const WEB_BLOCK_CONTROLS: InjectionKey<ShallowRef<WebBlockControls | null>> = Symbol('web-block-controls');

import { inject, type InjectionKey } from "vue";
import { AppConfiguration } from "../core/AppConfiguration";

export const BLOCKS_CONFIG_KEY: InjectionKey<AppConfiguration> = Symbol("blocks_config");

export function useBlocksConfig(): AppConfiguration {
  const injected = inject(BLOCKS_CONFIG_KEY, null);
  if (injected) return injected;

  try {
    const globalContext = globalThis as Record<string, any>;
    const nuxtApp = typeof globalContext.useNuxtApp === "function" ? globalContext.useNuxtApp() : null;
    const runtimeConfig = nuxtApp?.$config || (typeof globalContext.useRuntimeConfig === "function" ? globalContext.useRuntimeConfig() : null);
    const blocksOptions = (runtimeConfig?.public?.blocks || runtimeConfig?.blocks) as
      | { code?: boolean; math?: boolean; drawing?: boolean }
      | undefined;

    if (blocksOptions) {
      return new AppConfiguration({
        codeBlocksAllowed: Boolean(blocksOptions.code),
        mathAllowed: Boolean(blocksOptions.math),
        drawingBlocksAllowed: Boolean(blocksOptions.drawing),
      });
    }
  } catch {
    // Non-Nuxt or SSR environment before context ready
  }

  return new AppConfiguration();
}

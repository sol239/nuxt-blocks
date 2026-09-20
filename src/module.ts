import { defineNuxtModule, addPlugin, addComponentsDir, addImportsDir, createResolver } from "@nuxt/kit";

export interface ModuleOptions {
  code?: boolean;
  math?: boolean;
  drawing?: boolean;
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: "nuxt-blocks",
    configKey: "blocks",
    compatibility: {
      nuxt: ">=3.0.0 || >=4.0.0",
    },
  },
  defaults: {
    code: false,
    math: false,
    drawing: false,
  },
  setup(options, nuxt) {
    const resolver = createResolver(import.meta.url);

    // Provide options to public runtimeConfig
    nuxt.options.runtimeConfig.public = nuxt.options.runtimeConfig.public || {};
    nuxt.options.runtimeConfig.public.blocks = {
      code: Boolean(options.code),
      math: Boolean(options.math),
      drawing: Boolean(options.drawing),
    };

    // Auto-register block components
    addComponentsDir({
      path: resolver.resolve("../app/components"),
      pathPrefix: false,
    });

    // Auto-register composables
    addImportsDir(resolver.resolve("../app/composables"));

    // Auto-register stores
    addImportsDir(resolver.resolve("../app/stores"));

    // Register block-payload plugin for SSR/devalue hydration
    addPlugin(resolver.resolve("../app/plugins/block-payload"));

    // Conditionally register monaco worker plugin only if code blocks enabled
    if (options.code) {
      addPlugin(resolver.resolve("../app/plugins/monaco.client"));
    }

    // Conditionally include KaTeX CSS only if math enabled
    if (options.math) {
      nuxt.options.css.push("katex/dist/katex.min.css");
    }

    // Base styling
    nuxt.options.css.push(resolver.resolve("../app/assets/css/main.css"));
  },
});


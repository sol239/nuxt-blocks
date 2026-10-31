import withNuxt from './.nuxt/eslint.config.mjs';
import prettier from 'eslint-config-prettier/flat';

export default withNuxt(
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'test-results/**',
      'playwright-report/**',
    ],
  },
  {
    // These boundaries handle heterogeneous block constructors and untyped host/JSON data.
    files: [
      'app/core/blocks/Block.ts',
      'app/core/blocks/DrawingBlock.ts',
      'app/composables/useBlocksConfig.ts',
    ],
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
  prettier,
);

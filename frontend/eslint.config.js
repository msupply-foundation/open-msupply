import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import solid from 'eslint-plugin-solid/configs/typescript'
import globals from 'globals'

/*
 * Flat config (ESLint 9). Two scopes:
 *   - src/**            browser + SolidJS reactivity rules
 *   - config / scripts  Node globals
 *
 * Generated GraphQL types (*.generated.ts) and CSS-module type declarations
 * (*.css.d.ts) are ignored — they're regenerated, not hand-edited. Type-checking
 * is owned by `tsc` (see the `check` script); ESLint covers what the compiler
 * doesn't, so these rules are the fast, non-type-aware set.
 */
export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'dist-ssr/**',
      'node_modules/**',
      '**/*.generated.ts',
      '**/*.css.d.ts',
      'codegen/**', // CommonJS (.cjs) with its own node:test suite
    ],
  },

  // Application source — browser environment + Solid JSX.
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommended, solid],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaVersion: 2023, sourceType: 'module' },
    },
  },

  // Build config + node scripts.
  {
    files: ['*.config.{ts,js}', 'scripts/**/*.mjs'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      globals: globals.node,
    },
  },
)

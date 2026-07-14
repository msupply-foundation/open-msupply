import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import solid from 'eslint-plugin-solid/configs/typescript'
import commentLength from 'eslint-plugin-comment-length'
import globals from 'globals'

/*
 * Comment line-length cap. `overflow-only` wraps ONLY lines that exceed the
 * limit — it never reflows a paragraph — so hand-formatted block comments keep
 * their intentional line breaks. URLs and commented-out code are left alone
 * (can't be wrapped safely). Auto-fixable via `pnpm lint:fix`.
 */
const commentLengthOptions = {
  mode: 'overflow-only',
  maxLength: 80,
  ignoreUrls: true,
  ignoreCommentsWithCode: true,
}

/*
 * Flat config (ESLint 9). Two scopes:
 *   - src/**            browser + SolidJS reactivity rules
 *   - config / scripts  Node globals
 *
 * Generated GraphQL types (*.generated.ts) and CSS-module type declarations
 * (*.css.d.ts) are ignored — they're regenerated, not hand-edited.
 * Type-checking is owned by `tsc` (see the `check` script); ESLint covers what
 * the compiler doesn't, so these rules are the fast, non-type-aware set.
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

  // Comment line-length cap (all linted files). Warn + auto-fix; see options
  // above.
  {
    files: ['src/**/*.{ts,tsx}', '*.config.{ts,js}', 'scripts/**/*.mjs'],
    plugins: { 'comment-length': commentLength },
    rules: {
      'comment-length/limit-single-line-comments': ['warn', commentLengthOptions],
      'comment-length/limit-multi-line-comments': ['warn', commentLengthOptions],
    },
  },
)

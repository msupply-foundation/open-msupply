import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import solid from 'eslint-plugin-solid/configs/typescript';
import commentLength from 'eslint-plugin-comment-length';
import compat from 'eslint-plugin-compat';
import globals from 'globals';

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
};

/*
 * Framework-agnostic rules carried over from the original OMS ESLint config
 * (its React / JSDoc / Storybook rules don't apply here). `^_` marks an
 * intentionally-unused binding; camelCase identifiers; prefer-const; and a
 * space after comment markers (something Prettier doesn't enforce).
 */
const sharedRules = {
  '@typescript-eslint/no-unused-vars': [
    'error',
    {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      caughtErrorsIgnorePattern: '^_',
    },
  ],
  'prefer-const': [
    'error',
    { destructuring: 'any', ignoreReadBeforeAssign: true },
  ],
  camelcase: 'error',
  'spaced-comment': [
    'error',
    'always',
    { markers: ['#', '/'], exceptions: ['-'] },
  ],
};

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
      // Anywhere, not just the root: plugins/<code>/dist holds built bundles.
      '**/dist/**',
      'dist-ssr/**',
      'node_modules/**',
      '**/*.generated.ts',
      '**/*.css.d.ts',
      'codegen/**', // CommonJS (.cjs) with its own node:test suite
      // The COUNTRY plugins' backend halves: BoaJS code built by the
      // open-msupply client toolchain, plus its prebuilt shipped artifact —
      // vendored, so not this repo's lint domain
      // (plugins/civ/backend/README.md). The reference backend plugin
      // (examples/*/backend) is ours and IS linted, below.
      'plugins/*/backend/**',
    ],
  },

  // Application source — browser environment + Solid JSX. compat flags Web
  // APIs unsupported by the minimum browser (browserslist in package.json —
  // Chromium 138, the newest WebView installable on Android 9). The example
  // plugins (examples/) are the same: ordinary Solid components running in the
  // host's runtime, so they answer to the same rules.
  {
    files: ['src/**/*.{ts,tsx}', 'examples/**/*.{ts,tsx}'],
    // The reference BACKEND plugin is not browser code — it has its own block
    // below rather than Solid, DOM globals and browser-compat rules.
    ignores: ['examples/*/backend/**'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      solid,
      compat.configs['flat/recommended'],
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaVersion: 2023, sourceType: 'module' },
    },
    rules: {
      ...sharedRules,
      // Browser app code ships no stray logs; info/warn/error are intentional.
      'no-console': ['error', { allow: ['info', 'warn', 'error'] }],
      // compat can't flag this: Chrome supports crypto.randomUUID, but only
      // in secure contexts — it crashes on plain-HTTP LAN origins (#499).
      'no-restricted-properties': [
        'error',
        {
          object: 'crypto',
          property: 'randomUUID',
          message:
            'Secure-context only — crashes on plain-HTTP origins (#499). ' +
            'Use generateUUID from src/uuid.ts.',
        },
      ],
    },
  },

  /*
   * The in-repo country plugins (plugins/<code>/src). Same rules as app source —
   * they are Solid components in the host's runtime, so the reactivity and
   * browser-compat rules apply identically — plus the import boundary
   * (spec/plugins/sdk-contract.md § imports): a plugin may import ONLY the SDK
   * and solid-js. tsconfig.plugins.json and the plugin build preset
   * (vite/pluginBuild.ts) already make a reach into host source unresolvable;
   * this makes the failure say why.
   */
  {
    files: ['plugins/*/src/**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      solid,
      compat.configs['flat/recommended'],
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaVersion: 2023, sourceType: 'module' },
    },
    rules: {
      ...sharedRules,
      'no-console': ['error', { allow: ['info', 'warn', 'error'] }],
      /*
       * The `@/` alias is already unresolvable here (tsconfig.plugins.json and
       * the plugin build preset both omit it), but a RELATIVE reach —
       * `../../../src/intl` — resolves fine at both type-check and build time.
       * Only lint closes that, so these patterns are load-bearing rather than
       * belt-and-braces: without them a plugin could silently bundle a frozen
       * copy of host code, which is the exact failure the old client had.
       */
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              // `@/…`; any path reaching into src/; and any escape above the
              // plugin's own tree (plugins/<dir>/src/x sits 3 levels down, so
              // four-or-more `../` can only mean leaving the plugin).
              group: ['@/*', '**/src/*', '../../../../*'],
              message:
                'A plugin may import only @openmsupply/plugin-sdk and solid-js ' +
                '(spec/plugins/sdk-contract.md § imports). Missing something? ' +
                'That is a gap to add to the SDK.',
            },
          ],
        },
      ],
    },
  },

  /*
   * The reference BACKEND plugin (examples/<code>/backend) — the half that
   * runs in the server's BoaJS engine. No Solid, no DOM, and deliberately NO
   * `globals.browser`: the only globals it has are the host functions the
   * engine binds, which the plugin declares ambiently (its `host.d.ts`), so an
   * accidental `document` or `window` should be an undefined-variable error
   * rather than something the config quietly permits. `no-console` is absent
   * for the same reason — there is no console in the engine, so a stray
   * `console.log` is already an error here, and `log()` is the way out.
   *
   * The country plugins' vendored backend halves are ignored above; this one
   * is ours and builds in this repo, so it answers to the shared rules.
   */
  {
    files: ['examples/*/backend/**/*.ts'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
    },
    rules: sharedRules,
  },

  // Build config + node scripts.
  {
    files: ['*.config.{ts,js}', 'scripts/**/*.mjs'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      globals: globals.node,
    },
    // No no-console here: these Node scripts legitimately print to stdout.
    rules: sharedRules,
  },

  // Comment line-length cap (all linted files). Warn + auto-fix; see options
  // above.
  {
    files: [
      'src/**/*.{ts,tsx}',
      'plugins/*/src/**/*.{ts,tsx}',
      'examples/**/*.{ts,tsx}',
      '*.config.{ts,js}',
      'scripts/**/*.mjs',
    ],
    plugins: { 'comment-length': commentLength },
    rules: {
      'comment-length/limit-single-line-comments': [
        'warn',
        commentLengthOptions,
      ],
      'comment-length/limit-multi-line-comments': [
        'warn',
        commentLengthOptions,
      ],
    },
  }
);

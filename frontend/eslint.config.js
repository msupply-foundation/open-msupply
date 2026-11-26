import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import solid from 'eslint-plugin-solid/configs/typescript';
import commentLength from 'eslint-plugin-comment-length';
import compat from 'eslint-plugin-compat';
import globals from 'globals';
import pluginImports from './scripts/eslint/pluginImports.mjs';
import { readFileSync } from 'node:fs';
import { dirname } from 'node:path';

/*
 * Every block is anchored at the REPO root (the `basePath` stamped on below),
 * not at this file's directory, because the in-repo plugins live beside
 * frontend/ — public ones in plugins/, country ones in private/plugins/.
 * Globs are therefore repo-relative: host code is `frontend/...`. An absolute
 * basePath matches the same whichever directory ESLint runs from, so an editor
 * linting from frontend/ still applies the host blocks; `pnpm lint` runs from
 * the repo root so the plugin directories are inside its base path too.
 */
const REPO_ROOT = dirname(import.meta.dirname);

/*
 * The minimum browser, stated once in package.json. eslint-plugin-compat looks
 * for a browserslist by walking up from each linted file, which finds
 * frontend/package.json for host code but nothing for a plugin outside
 * frontend/ — so it would fall back to browserslist's defaults (Opera Mini and
 * all) and flag `Promise.all`. Handing it the list makes every file answer to
 * the same target.
 */
const { browserslist } = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8')
);

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
// compat can't flag this: Chrome supports crypto.randomUUID, but only in
// secure contexts — it crashes on plain-HTTP LAN origins (#499).
const cryptoRandomUuidRestriction = {
  object: 'crypto',
  property: 'randomUUID',
  message:
    'Secure-context only — crashes on plain-HTTP origins (#499). ' +
    'Use generateUUID from src/uuid.ts.',
};

/*
 * The browser-download idiom (an object URL / a download-attributed anchor
 * click) is a silent no-op in the Android WebView — no DownloadListener, so
 * the click just dies (#1169). Every file handed to the user goes through the
 * platform layer instead: saveBlob / openBlob / saveDocument / openDocument in
 * src/platform/openDocument.ts, whose own block below carves out the one
 * place the idiom is legitimately implemented (the web halves of those
 * helpers).
 */
const downloadIdiomMessage =
  'Silently does nothing in the Android WebView (#1169). Use saveBlob / ' +
  'saveDocument (or openBlob / openDocument) from ' +
  'src/platform/openDocument.ts.';
const createObjectUrlRestriction = {
  object: 'URL',
  property: 'createObjectURL',
  message: downloadIdiomMessage,
};
const anchorDownloadRestriction = {
  selector: 'AssignmentExpression[left.property.name="download"]',
  message: downloadIdiomMessage,
};
// The JSX form of the same idiom — <a download={…}> needs no object URL, so
// the property ban alone would not catch it.
const jsxDownloadRestriction = {
  selector: 'JSXAttribute[name.name="download"]',
  message: downloadIdiomMessage,
};

/*
 * Dates and numbers the user sees go through src/intl. The browser's own
 * locale methods follow the device, not the app's language, and pick the
 * Solar Hijri calendar for Dari and Pashto (#1326, #1838). Slicing an ISO
 * string takes the UTC day, the day before for a local midnight east of
 * Greenwich (#1898); calendarDate.ts converts a Date to a calendar date. The
 * date fields, which build month and weekday names with the calendar pinned
 * to Gregorian, have their own block below.
 */
const localeFormatMessage =
  'Follows the device, not the app language (#1326, #1838). From src/intl: ' +
  'localisedDate / localisedDateTime / localisedTime for a date, ' +
  'displayNumber or roundedText for a figure, the currency helpers for money.';
const localeFormatRestrictions = [
  'toLocaleString',
  'toLocaleDateString',
  'toLocaleTimeString',
].map(property => ({ property, message: localeFormatMessage }));
const isoStringSliceRestriction = {
  selector:
    'CallExpression[callee.property.name=/^(slice|substring|substr|split)$/]' +
    '[callee.object.callee.property.name="toISOString"]',
  message:
    'Takes the UTC day, the day before east of Greenwich (#1898). Use ' +
    'dateToCalendarDate from src/intl/calendarDate.ts.',
};
// Every front-end file's no-restricted-syntax list. A block that adds to it
// spreads this, since flat config replaces a rule's options, not merges them.
const appSyntaxRestrictions = [
  anchorDownloadRestriction,
  jsxDownloadRestriction,
  isoStringSliceRestriction,
];

/*
 * The shared UI components render on every screen, in every language, so the
 * text they put in front of a user or a screen reader goes through t()
 * (open-msupply-internal#354). English in one of these attributes, or in a
 * component's label prop (`label`, `triggerLabel`), ships to everyone: as a
 * literal, as the text of a template literal (`${name}, date`), or as a
 * fallback for a prop that fills one (`props.label ?? 'Details'`). A value
 * with no letters, or a hex colour (`#004fc4`), is not language and passes.
 *
 * Not complete: JSX text children, a literal nested inside a call, and other
 * props a component turns into text are not checked.
 */
const uiTextAttribute =
  'JSXAttribute[name.name=/^(aria-label|aria-description|aria-roledescription|aria-valuetext|placeholder|title|alt|label|[a-z]+Label)$/]';
const uiTextLiteral = 'Literal[value=/[A-Za-z]/]:not([value=/^#/])';
const uiTextTemplate =
  'TemplateLiteral > TemplateElement[value.raw=/[A-Za-z]/]';
const uiTextMessage =
  'Shared UI text is translated: use t() with a key from ' +
  'src/intl/locales/en/ rather than English text.';
const uiTextRestrictions = [
  `${uiTextAttribute} > ${uiTextLiteral}`,
  `${uiTextAttribute} > JSXExpressionContainer > ${uiTextLiteral}`,
  `${uiTextAttribute} > JSXExpressionContainer > ${uiTextTemplate}`,
  `${uiTextAttribute} > JSXExpressionContainer > LogicalExpression > ${uiTextLiteral}`,
  `${uiTextAttribute} > JSXExpressionContainer > ConditionalExpression > ${uiTextLiteral}`,
].map(selector => ({ selector, message: uiTextMessage }));

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
const config = tseslint.config(
  {
    ignores: [
      // Anywhere, not just the root: <plugin dir>/dist holds built bundles.
      '**/dist/**',
      'frontend/dist-ssr/**',
      '**/node_modules/**',
      '**/*.generated.ts',
      '**/*.css.d.ts',
      'frontend/codegen/**', // CommonJS (.cjs) with its own node:test suite
      // A prebuilt bundle is a build artifact wherever it appears — it is
      // packed verbatim, so it is output, not source.
      '{plugins,private/plugins}/*/backend/prebuilt/**',
      // The React-UI plugins imported from the *-plugins repos: old-UI code,
      // linted (if at all) by client/'s config, not this one.
      '{plugins,private/plugins}/*/react/**',
    ],
  },

  // Application source — browser environment + Solid JSX. compat flags Web
  // APIs unsupported by the minimum browser (browserslist in package.json —
  // Chromium 132, the WebView on the oldest Android 8.1 tablets deployed).
  // The example
  // plugins (plugins/examples/) are the same: ordinary Solid components
  // running in the host's runtime, so they answer to the same rules.
  {
    files: ['frontend/src/**/*.{ts,tsx}', 'plugins/examples/**/*.{ts,tsx}'],
    // The reference BACKEND plugin is not browser code — it has its own block
    // below rather than Solid, DOM globals and browser-compat rules.
    ignores: ['plugins/examples/*/backend/**'],
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
      'no-restricted-properties': [
        'error',
        cryptoRandomUuidRestriction,
        createObjectUrlRestriction,
        ...localeFormatRestrictions,
      ],
      'no-restricted-syntax': ['error', ...appSyntaxRestrictions],
    },
  },

  // The shared UI components' text attributes are translated (see
  // uiTextRestrictions). Tests are exempt: they assert on English output.
  {
    files: ['frontend/src/ui/**/*.tsx'],
    ignores: ['frontend/src/ui/**/*.test.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...appSyntaxRestrictions,
        ...uiTextRestrictions,
      ],
    },
  },

  // The date fields build month and weekday names from the browser with the
  // calendar pinned to Gregorian (dateTimeConvert.ts, DatePickerPanel.tsx),
  // so only the locale-method ban lifts here.
  {
    files: [
      'frontend/src/ui/elements/inputs/dateTimeConvert.ts',
      'frontend/src/ui/elements/inputs/DatePickerPanel.tsx',
    ],
    rules: {
      'no-restricted-properties': [
        'error',
        cryptoRandomUuidRestriction,
        createObjectUrlRestriction,
      ],
    },
  },

  // The platform layer OWNS the browser-download idiom banned above —
  // openDocument.ts (and its tests) is where object URLs and anchor clicks
  // legitimately implement the web halves of saveBlob/openBlob. Only the
  // download restrictions lift here; the crypto and date ones stand.
  {
    files: ['frontend/src/platform/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-properties': [
        'error',
        cryptoRandomUuidRestriction,
        ...localeFormatRestrictions,
      ],
      'no-restricted-syntax': ['error', isoStringSliceRestriction],
    },
  },

  /*
   * The in-repo plugins (private/plugins/<code>/src, and any public one at
   * plugins/<code>/src), and a form plugin's root module, catalogues and
   * `forms/` tree. Same rules as app source —
   * they are Solid components in the host's runtime, so the reactivity and
   * browser-compat rules apply identically — plus the import boundary
   * (spec/plugins/sdk-contract.md § imports): a plugin may import ONLY the SDK
   * and solid-js, and its own files. tsconfig.plugins.json and the plugin
   * build preset (vite/pluginBuild.ts) leave `@/` unresolvable, but not a
   * relative path out of the plugin, which only this rule catches.
   */
  {
    files: [
      '{plugins,private/plugins}/*/src/**/*.{ts,tsx}',
      '{plugins,private/plugins}/*/*.{ts,tsx}',
      '{plugins,private/plugins}/*/translations/**/*.ts',
      '{plugins,private/plugins}/*/forms/**/*.{ts,tsx}',
    ],
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
    plugins: { plugin: { rules: { imports: pluginImports } } },
    rules: {
      ...sharedRules,
      'no-console': ['error', { allow: ['info', 'warn', 'error'] }],
      // Same Android WebView, same dead click (#1169) — a plugin needing to
      // hand the user a file is an SDK gap, not a hand-rolled download.
      'no-restricted-properties': [
        'error',
        createObjectUrlRestriction,
        ...localeFormatRestrictions,
      ],
      'no-restricted-syntax': [
        'error',
        anchorDownloadRestriction,
        jsxDownloadRestriction,
        isoStringSliceRestriction,
      ],
      // What a plugin may import, resolved against each file
      // (scripts/eslint/pluginImports.mjs).
      'plugin/imports': 'error',
    },
  },

  /*
   * The Afghanistan plugin's stored shapes are wire constraints: rows the
   * React bundle wrote are in the field and the Afghanistan reports compile
   * against a copy of its type module, so payload field names stay snake_case
   * (private/plugins/afghanistan/rules.md § data conventions). Property names
   * and the destructured reads of them are exempt from camelcase there;
   * identifiers the plugin coins are not.
   */
  {
    files: ['private/plugins/afghanistan/src/**/*.{ts,tsx}'],
    rules: {
      camelcase: ['error', { properties: 'never', ignoreDestructuring: true }],
    },
  },

  /*
   * Every BACKEND half — the reference plugin
   * (plugins/examples/<code>/backend) and the country plugins' — which run in
   * the server's BoaJS engine. No Solid,
   * no DOM, and deliberately NO `globals.browser`: the only globals they have
   * are the host functions the engine binds, so an accidental `document` or
   * `window` should be an undefined-variable error rather than something the
   * config quietly permits. `no-console` is absent for the same reason —
   * there is no console in the engine, so a stray `console.log` is already an
   * error here, and `log()` is the way out.
   *
   * Where those globals come from is the one thing that differs, and the
   * rules do not care: cook_islands and the reference plugin declare them
   * ambiently (`host.d.ts`), CIV imports `@common/types`. All of it is
   * written and owned here, so all of it answers to the shared rules.
   */
  {
    files: [
      'plugins/examples/*/backend/**/*.ts',
      '{plugins,private/plugins}/*/backend/**/*.ts',
      // The wire contract both halves import. Type-only, so it needs the TS
      // parser and nothing else — and it sits outside `src/`, the only plugin
      // path the app block covers.
      '{plugins,private/plugins}/*/shared/**/*.ts',
    ],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
    },
    rules: sharedRules,
  },

  // Build config + node scripts.
  {
    files: ['frontend/*.config.{ts,js}', 'frontend/scripts/**/*.mjs'],
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
      'frontend/src/**/*.{ts,tsx}',
      '{plugins,private/plugins}/*/src/**/*.{ts,tsx}',
      '{plugins,private/plugins}/*/backend/**/*.ts',
      '{plugins,private/plugins}/*/shared/**/*.ts',
      'plugins/examples/**/*.{ts,tsx}',
      'frontend/*.config.{ts,js}',
      'frontend/scripts/**/*.mjs',
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

export default [...config, { settings: { browsers: browserslist } }].map(
  block => ({ ...block, basePath: REPO_ROOT })
);

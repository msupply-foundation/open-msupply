import { dirname, join } from 'node:path';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

// The shared UI's untranslated-text ban in eslint.config.js is config, not a
// rule module, so it is checked through the real config: the block's file
// globs decide where it applies, and replacing no-restricted-syntax there
// must keep the bans every other front-end file carries
// (open-msupply-internal#354).
const FRONTEND = dirname(dirname(import.meta.dirname));
const REPO_ROOT = dirname(FRONTEND);

const eslint = new ESLint({
  cwd: REPO_ROOT,
  overrideConfigFile: join(FRONTEND, 'eslint.config.js'),
});

/** How many no-restricted-syntax errors `code` raises at `file`. */
const hits = async (file, code) => {
  const [result] = await eslint.lintText(code, {
    filePath: join(REPO_ROOT, file),
  });
  return result.messages.filter(m => m.ruleId === 'no-restricted-syntax')
    .length;
};

const UI = 'frontend/src/ui/elements/zz/Probe.tsx';
const UI_TEST = 'frontend/src/ui/elements/zz/Probe.test.tsx';
const APP = 'frontend/src/sections/zz/Probe.tsx';

const wrap = (jsx, props = 'props: { label?: string; on?: boolean }') =>
  `import { t } from '../../../intl';\n` +
  `export const Probe = (${props}) => ${jsx};\n` +
  `void t;\n`;

const UNTRANSLATED = [
  '<button aria-label="Clear selection" />',
  "<button aria-label={'Clear selection'} />",
  "<aside aria-label={props.label ?? 'Details'} />",
  "<input placeholder={props.label || 'Select…'} />",
  "<button title={props.on ? 'Open' : t('label.close')} />",
  '<img alt="Logo" />',
  '<input aria-label={`${props.label}, date`} />',
  '<button aria-label={`Remove ${props.label}`} />',
  '<Popover triggerLabel="Open calendar" />',
  '<IconButton label="Close" />',
];

const TRANSLATED = [
  "<button aria-label={t('label.clear-selection')} />",
  "<aside aria-label={props.label ?? t('label.details')} />",
  '<input placeholder={props.label} />',
  // No letters: punctuation and symbols are not language.
  '<span aria-label="—" />',
  // A hex colour example is not language either.
  '<input placeholder="#004fc4" />',
  // Not a text attribute.
  '<div data-testid="clear-selection" />',
  // A template of values and punctuation only.
  '<span aria-label={`${props.label}: ${props.on}`} />',
  // Keys chosen inside t() are not English.
  "<button aria-label={t(props.on ? 'label.open' : 'label.close')} />",
  '<button aria-label={t(`label.${props.label}`)} />',
];

describe('shared UI text is translated', () => {
  for (const jsx of UNTRANSLATED) {
    it(`flags ${jsx} in src/ui`, async () => {
      expect(await hits(UI, wrap(jsx))).toBe(1);
    });
  }

  for (const jsx of TRANSLATED) {
    it(`allows ${jsx} in src/ui`, async () => {
      expect(await hits(UI, wrap(jsx))).toBe(0);
    });
  }

  it('leaves src/ui tests and the app outside src/ui alone', async () => {
    const code = wrap('<button aria-label="Clear selection" />');
    expect(await hits(UI_TEST, code)).toBe(0);
    expect(await hits(APP, code)).toBe(0);
  });

  it('keeps the front-end-wide syntax bans in src/ui', async () => {
    const code =
      wrap('<a download="x.csv" />') +
      'export const d = new Date().toISOString().slice(0, 10);\n';
    // Whatever the app-wide list holds, src/ui gets all of it.
    expect(await hits(APP, code)).toBe(2);
    expect(await hits(UI, code)).toBe(await hits(APP, code));
  });
});

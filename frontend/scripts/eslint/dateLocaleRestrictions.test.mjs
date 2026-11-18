import { dirname, join } from 'node:path';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

// The date and locale bans in eslint.config.js are config, not a rule module,
// so they are checked through the real config: each block's file globs decide
// where a ban applies, and an edit to a block could otherwise switch one off
// unnoticed.
const FRONTEND = dirname(dirname(import.meta.dirname));
const REPO_ROOT = dirname(FRONTEND);

const eslint = new ESLint({
  cwd: REPO_ROOT,
  overrideConfigFile: join(FRONTEND, 'eslint.config.js'),
});

const BANS = ['no-restricted-properties', 'no-restricted-syntax'];

/** The ban rules `code` breaks when it sits at `file` (repo-relative). */
const bansHit = async (file, code) => {
  const [result] = await eslint.lintText(code, {
    filePath: join(REPO_ROOT, file),
  });
  return result.messages
    .filter(m => BANS.includes(m.ruleId))
    .map(m => m.ruleId);
};

const APP = 'frontend/src/sections/zz/probe.ts';
const PLUGIN = 'plugins/bes/src/probe.ts';
const PLATFORM = 'frontend/src/platform/probe.ts';
const DATE_FIELDS = [
  'frontend/src/ui/elements/inputs/dateTimeConvert.ts',
  'frontend/src/ui/elements/inputs/DatePickerPanel.tsx',
];

const ISO_SLICES = [
  'export const a = new Date().toISOString().slice(0, 10);',
  "export const a = new Date().toISOString().split('T')[0];",
  'export const a = new Date().toISOString().substring(0, 10);',
  'export const a = new Date()\n  .toISOString()\n  .slice(0, 10);',
];
const LOCALE_CALLS = [
  'export const a = new Date().toLocaleDateString();',
  'export const a = new Date().toLocaleTimeString();',
  'export const a = (5).toLocaleString();',
];

describe('date and locale bans', () => {
  for (const file of [APP, PLUGIN, PLATFORM]) {
    it(`flag slicing an ISO string in ${file}`, async () => {
      for (const code of ISO_SLICES)
        expect(await bansHit(file, code)).toEqual(['no-restricted-syntax']);
    });

    it(`flag the browser's locale methods in ${file}`, async () => {
      for (const code of LOCALE_CALLS)
        expect(await bansHit(file, code)).toEqual(['no-restricted-properties']);
    });
  }

  for (const file of DATE_FIELDS) {
    it(`let ${file} use toLocaleDateString, but not slice an ISO string`, async () => {
      expect(
        await bansHit(file, 'export const a = new Date().toLocaleDateString();')
      ).toEqual([]);
      expect(await bansHit(file, ISO_SLICES[0])).toEqual([
        'no-restricted-syntax',
      ]);
    });
  }

  it('leave a whole ISO string alone', async () => {
    expect(
      await bansHit(APP, 'export const a = new Date().toISOString();')
    ).toEqual([]);
  });
});

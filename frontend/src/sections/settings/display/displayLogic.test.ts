import { describe, expect, it } from 'vitest';
import {
  checkTheme,
  logoClearInput,
  logoSaveInput,
  themeClearInput,
  themeSaveInput,
} from './displayLogic';

// OMS-REG-SET-01.13 — Custom theme must be applicable: the document has to
// parse AND leave at least one recognised setting, or the save is refused with
// every reason listed. Anything else is a warning and still saves.
describe('custom theme must be applicable (SET-01.13)', () => {
  it('accepts a document it can apply', () => {
    expect(checkTheme('{ "brand": "#0b6e99" }')).toEqual({
      ok: true,
      errors: [],
      warnings: [],
    });
  });

  it('refuses invalid JSON, reporting the JSON error', () => {
    const result = checkTheme('{not json');
    expect(result.ok).toBe(false);
    expect(result.errors[0]).not.toBe('');
  });

  /*
   * Shape-aware, unlike the reference app's parse-only gate
   * (spec/DIVERGENCES.md): valid JSON that would change nothing is refused
   * rather than stored as a no-op. This is what resolves the wrong-shape
   * ⚠️ VERIFY the spec used to carry.
   */
  it('refuses valid JSON that is not a theme', () => {
    expect(checkTheme('42').ok).toBe(false);
    expect(checkTheme('{}').ok).toBe(false);
    expect(checkTheme('{ "palette": { "mode": "dark" } }').ok).toBe(false);
  });

  it('names the previous app version for a theme from it', () => {
    const result = checkTheme(
      '{ "palette": { "primary": { "main": "#123" } } }'
    );
    expect(result.errors[0]).toContain('previous app version');
  });

  it('saves a document it partly understood, warning about the rest', () => {
    const result = checkTheme('{ "brand": "#0b6e99", "brnad": "#fff" }');
    expect(result.ok).toBe(true);
    expect(result.warnings[0]).toContain('brnad');
  });
});

// OMS-REG-SET-01.18 — Custom logo has no content validation: the save input
// is built from arbitrary text with no format check (contrast
// OMS-REG-SET-01.13).
describe('custom logo has no content validation (SET-01.18)', () => {
  it('builds a save input from arbitrary, non-SVG text', () => {
    expect(logoSaveInput('definitely not svg')).toEqual({
      customLogo: 'definitely not svg',
    });
  });
});

// OMS-REG-SET-01.17 — turning a row off clears immediately: the clear inputs
// carry the emptied field (and only that field), matching the one-field-per-
// call contract.
describe('clear inputs empty exactly one field (SET-01.17)', () => {
  it('clears the theme without touching the logo', () => {
    expect(themeClearInput()).toEqual({ customTheme: '' });
  });

  it('clears the logo without touching the theme', () => {
    expect(logoClearInput()).toEqual({ customLogo: '' });
  });

  it('saves the theme without touching the logo', () => {
    expect(themeSaveInput('{ "brand": "#0b6e99" }')).toEqual({
      customTheme: '{ "brand": "#0b6e99" }',
    });
  });
});

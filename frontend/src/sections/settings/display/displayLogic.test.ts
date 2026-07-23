import { describe, expect, it } from 'vitest';
import {
  logoClearInput,
  logoSaveInput,
  parseThemeJson,
  themeClearInput,
  themeSaveInput,
} from './displayLogic';

// AC-DS2 — Custom theme requires valid JSON: invalid JSON refuses the save
// with a parse-error message; nothing is sent to the server (the caller only
// builds an input once parsing succeeds).
describe('AC-DS2 — custom theme requires valid JSON', () => {
  it('accepts parseable JSON', () => {
    expect(parseThemeJson('{"palette": {"mode": "dark"}}')).toEqual({
      ok: true,
    });
    expect(parseThemeJson('{}')).toEqual({ ok: true });
  });

  it('refuses invalid JSON, reporting the JSON error', () => {
    const result = parseThemeJson('{not json');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).not.toBe('');
  });

  it('is a shallow parse check only — any parsed shape passes (the spec carries a VERIFY on wrong-shape themes)', () => {
    // A number is valid JSON but plainly not a theme; the rule is parse-only.
    expect(parseThemeJson('42')).toEqual({ ok: true });
  });
});

// AC-DS5 — Custom logo has no content validation: the save input is built
// from arbitrary text with no format check (contrast AC-DS2).
describe('AC-DS5 — custom logo has no content validation', () => {
  it('builds a save input from arbitrary, non-SVG text', () => {
    expect(logoSaveInput('definitely not svg')).toEqual({
      customLogo: 'definitely not svg',
    });
  });
});

// AC-DS4 / AC-DS6 — turning a row off clears immediately: the clear inputs
// carry the emptied field (and only that field), matching the one-field-per-
// call contract.
describe('AC-DS4/AC-DS6 — clear inputs empty exactly one field', () => {
  it('clears the theme without touching the logo', () => {
    expect(themeClearInput()).toEqual({ customTheme: '' });
  });

  it('clears the logo without touching the theme', () => {
    expect(logoClearInput()).toEqual({ customLogo: '' });
  });

  it('saves the theme without touching the logo', () => {
    expect(themeSaveInput('{}')).toEqual({ customTheme: '{}' });
  });
});

import { describe, expect, it } from 'vitest';
import {
  logoClearInput,
  logoSaveInput,
  parseThemeJson,
  themeClearInput,
  themeSaveInput,
} from './displayLogic';

// OMS-REG-SET-01.13 — Custom theme requires valid JSON: invalid JSON refuses
// the save with a parse-error message; nothing is sent to the server (the
// caller only builds an input once parsing succeeds).
describe('custom theme requires valid JSON (SET-01.13)', () => {
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

// OMS-REG-SET-01.18 — Custom logo has no content validation: the save input is
// built from arbitrary text with no format check (contrast OMS-REG-SET-01.13).
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
    expect(themeSaveInput('{}')).toEqual({ customTheme: '{}' });
  });
});

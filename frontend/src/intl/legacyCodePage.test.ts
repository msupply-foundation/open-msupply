import { describe, expect, it } from 'vitest';
import { legacyCodePage } from './legacyCodePage';
import { SUPPORTED_LOCALES } from './locales';

describe('the legacy code page follows the language', () => {
  it('Cyrillic for Russian', () => {
    expect(legacyCodePage('ru')).toBe('windows-1251');
  });

  it('Arabic-script for Arabic, Dari and Pashto', () => {
    expect(legacyCodePage('ar')).toBe('windows-1256');
    expect(legacyCodePage('prs')).toBe('windows-1256');
    expect(legacyCodePage('ps')).toBe('windows-1256');
  });

  it('Western European for the rest', () => {
    for (const l of ['en', 'es', 'fr', 'fr-DJ', 'pt', 'lo', 'tet'] as const)
      expect(legacyCodePage(l)).toBe('windows-1252');
  });

  it('answers for every supported language with a decoder this runtime has', () => {
    for (const l of SUPPORTED_LOCALES)
      expect(() => new TextDecoder(legacyCodePage(l))).not.toThrow();
  });
});

import { describe, it, expect } from 'vitest';
import { foldForSearch, matchesSearch } from './searchText';

// The behaviour that pays for this helper is OMS-REG-LGN-02.33 — the store
// picker's search matching by name or code, ignoring case AND accents. The
// accent half is what a plain toLowerCase().includes() gets wrong, so the
// French store names are the discriminating cases here.

describe('foldForSearch', () => {
  it('lower-cases', () => {
    expect(foldForSearch('Waikato District Store')).toBe(
      'waikato district store'
    );
  });

  it('strips Latin accents down to the base letter', () => {
    expect(foldForSearch('Dépôt Régional')).toBe('depot regional');
    expect(foldForSearch('Centre de Santé el Menara')).toBe(
      'centre de sante el menara'
    );
  });

  it('folds a pre-composed and a decomposed character identically', () => {
    // é as U+00E9, and as e + U+0301.
    expect(foldForSearch('é')).toBe(foldForSearch('é'));
  });

  it('strips Arabic tashkeel, which are combining marks too', () => {
    expect(foldForSearch('مَخْزَن')).toBe('مخزن');
  });

  it('leaves scripts without combining marks untouched', () => {
    expect(foldForSearch('仓库')).toBe('仓库');
  });
});

describe('matchesSearch', () => {
  it('matches an unaccented query against an accented field', () => {
    expect(matchesSearch('depot', 'Dépôt Régional')).toBe(true);
    expect(matchesSearch('sante', 'Centre de Santé el Menara')).toBe(true);
  });

  it('matches an accented query against the same field', () => {
    expect(matchesSearch('Dépôt', 'Dépôt Régional')).toBe(true);
  });

  it('searches every field given — a code as readily as a name', () => {
    expect(matchesSearch('gry', 'Waikato District Store', 'GRY')).toBe(true);
  });

  it('still rejects a non-match', () => {
    expect(matchesSearch('zzz', 'Dépôt Régional', 'DEP')).toBe(false);
  });

  it('treats an empty or whitespace-only query as matching everything', () => {
    expect(matchesSearch('', 'Anything')).toBe(true);
    expect(matchesSearch('   ', 'Anything')).toBe(true);
  });

  it('ignores whitespace around a real query', () => {
    expect(matchesSearch('  depot  ', 'Dépôt Régional')).toBe(true);
  });
});

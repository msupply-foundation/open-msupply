import { describe, expect, it } from 'vitest';
import {
  asFlatMap,
  asV2,
  buildExportObject,
  collectNamespaces,
  filterRows,
  hasInvalidBrackets,
  isInvalidCustom,
  isNestedTranslations,
  isValidFlatImport,
  LEGACY_NAMESPACE,
  LEGACY_V1_EXPORT_KEY,
  mapToRows,
  mergeFlatMaps,
  mergeNestedTranslations,
  mergeRows,
  namespaceOptions,
  pluralisationFamily,
  rowsToFlatMap,
  rowsToNamespaceMap,
  setNamespaceTranslations,
  splitImportObject,
  type TranslationRow,
} from './translationsLogic';

const row = (
  key: string,
  defaultText: string,
  custom: string,
  extra: Partial<TranslationRow> = {}
): TranslationRow => ({ id: key, key, default: defaultText, custom, ...extra });

describe('row pruning on save (OMS-REG-GPREF-01.19)', () => {
  it('drops rows equal to their default or emptied, and sorts keys', () => {
    const rows = [
      row('b.key', 'B default', 'B custom'),
      row('a.key', 'A default', 'A default'), // equal → dropped
      row('c.key', 'C default', ''), // emptied → dropped
    ];
    expect(rowsToNamespaceMap(rows)).toEqual({ 'b.key': 'B custom' });
  });

  it('the legacy map keeps values equal to a language’s default (language-agnostic)', () => {
    const rows = [
      row('a.key', 'A default', 'A default'),
      row('c.key', 'C default', ''),
    ];
    expect(rowsToFlatMap(rows)).toEqual({ 'a.key': 'A default' });
  });
});

describe('variable validation (OMS-REG-GPREF-01.18)', () => {
  it('flags unbalanced braces', () => {
    expect(hasInvalidBrackets('so {{count} items')).toBe(true);
    expect(hasInvalidBrackets('so {{count}} items')).toBe(false);
  });

  it('permits only the default’s variables, any number of times', () => {
    expect(isInvalidCustom('{{count}} items', '{{count}} of {{count}}')).toBe(
      false
    );
    expect(isInvalidCustom('{{count}} items', '{{total}} items')).toBe(true);
    expect(isInvalidCustom('plain', 'still plain')).toBe(false);
  });
});

describe('adding (OMS-REG-GPREF-01.17)', () => {
  it('adding one pluralisation variant selects the whole family', () => {
    const options = [
      { key: 'label.items-selected_one', default: '{{count}} item selected' },
      {
        key: 'label.items-selected_other',
        default: '{{count}} items selected',
      },
      { key: 'label.other', default: 'Other' },
    ];
    expect(pluralisationFamily(options[0]!, options).map(o => o.key)).toEqual([
      'label.items-selected_one',
      'label.items-selected_other',
    ]);
    expect(pluralisationFamily(options[2]!, options).map(o => o.key)).toEqual([
      'label.other',
    ]);
  });
});

describe('import modes (OMS-REG-GPREF-01.23/.24)', () => {
  const existing = [row('a', 'A', 'custom A'), row('b', 'B', 'custom B')];
  const imported = [row('b', 'B', 'imported B'), row('c', 'C', 'imported C')];

  it('keep-existing adds only new keys', () => {
    expect(
      mergeRows(existing, imported, 'keep-existing').map(r => r.custom)
    ).toEqual(['custom A', 'custom B', 'imported C']);
  });

  it('overwrite replaces matching customs and adds new keys', () => {
    expect(
      mergeRows(existing, imported, 'overwrite').map(r => r.custom)
    ).toEqual(['custom A', 'imported B', 'imported C']);
  });

  it('replace discards the current view', () => {
    expect(mergeRows(existing, imported, 'replace')).toEqual(imported);
  });

  it('flat and nested merges honour the same modes', () => {
    expect(
      mergeFlatMaps({ a: '1' }, { a: '2', b: '3' }, 'keep-existing')
    ).toEqual({ a: '1', b: '3' });
    const merged = mergeNestedTranslations(
      { fr: { common: { a: '1' } } },
      { fr: { common: { a: '2', b: '3' } }, es: { common: { c: '4' } } },
      'overwrite'
    );
    expect(merged).toEqual({
      fr: { common: { a: '2', b: '3' } },
      es: { common: { c: '4' } },
    });
  });
});

describe('export / structured import (OMS-REG-GPREF-01.22)', () => {
  it('exports the whole structure with the legacy map under its reserved key', () => {
    const out = buildExportObject(
      { fr: { common: { a: 'A' } } },
      { legacyKey: 'Legacy' }
    );
    expect(out).toEqual({
      fr: { common: { a: 'A' } },
      [LEGACY_V1_EXPORT_KEY]: { legacyKey: 'Legacy' },
    });
    // No legacy data → no reserved key.
    expect(buildExportObject({}, {})).toEqual({});
  });

  it('splits a structured file back into its v2 and legacy halves', () => {
    const split = splitImportObject({
      fr: { common: { a: 'A' } },
      [LEGACY_V1_EXPORT_KEY]: { legacyKey: 'Legacy' },
    });
    expect(split.isStructured).toBe(true);
    expect(split.v2).toEqual({ fr: { common: { a: 'A' } } });
    expect(split.legacy).toEqual({ legacyKey: 'Legacy' });
  });

  it('reports a plain flat file as unstructured, for the current view (.24)', () => {
    const split = splitImportObject({ 'button.close': 'Fermer' });
    expect(split.isStructured).toBe(false);
    expect(isValidFlatImport({ 'button.close': 'Fermer' })).toBe(true);
    expect(isValidFlatImport({ nested: { no: 'good' } })).toBe(false);
  });
});

describe('namespaces (OMS-REG-GPREF-01.21/.26/.27)', () => {
  it('an emptied view saves as absent, not as an empty shell (.26)', () => {
    const nested = { fr: { common: { a: 'A' }, report: { r: 'R' } } };
    const cleared = setNamespaceTranslations(nested, 'fr', 'report', {});
    expect(cleared).toEqual({ fr: { common: { a: 'A' } } });
    const clearedAll = setNamespaceTranslations(cleared, 'fr', 'common', {});
    expect(clearedAll).toEqual({});
  });

  it('a committed view lands under its language and namespace (.21)', () => {
    expect(setNamespaceTranslations({}, 'fr', 'common', { a: 'A' })).toEqual({
      fr: { common: { a: 'A' } },
    });
  });

  it('offers base + plugin + data namespaces, legacy only while it has data (.27)', () => {
    const nested = { fr: { report: { r: 'R' } } };
    expect(namespaceOptions(nested, ['civ'], true)).toEqual([
      'common',
      'desktop',
      'civ',
      'report',
      LEGACY_NAMESPACE,
    ]);
    expect(namespaceOptions({}, [], false)).toEqual(['common', 'desktop']);
    expect(collectNamespaces(nested)).toEqual(['report']);
  });
});

describe('wire coercions (contract § The custom-translations editor)', () => {
  it('reads only well-shaped values; anything else is empty', () => {
    expect(asFlatMap({ a: '1', b: 2 })).toEqual({ a: '1' });
    expect(asFlatMap(null)).toEqual({});
    expect(asV2({ fr: { common: { a: 'A' } } })).toEqual({
      fr: { common: { a: 'A' } },
    });
    expect(asV2({ 'button.close': 'flat' })).toEqual({});
    expect(isNestedTranslations([])).toBe(false);
  });
});

describe('rows and filtering', () => {
  it('maps a stored view to rows, keeping unknown keys', () => {
    const rows = mapToRows({ known: 'K', unknown: 'U' }, key =>
      key === 'known' ? 'Known default' : ''
    );
    expect(rows).toHaveLength(2);
    expect(rows[1]).toMatchObject({ key: 'unknown', default: '' });
  });

  it('filters by key, default, or custom text', () => {
    const rows = [
      row('a.key', 'Alpha', 'Custom'),
      row('b.key', 'Beta', 'Other'),
    ];
    expect(filterRows(rows, 'alpha')).toHaveLength(1);
    expect(filterRows(rows, 'other')).toHaveLength(1);
    expect(filterRows(rows, 'b.')).toHaveLength(1);
    expect(filterRows(rows, '')).toHaveLength(2);
  });
});

import { TranslationOption } from './TranslationSearchInput';
import {
  mapTranslationsToArray,
  mapTranslationsToObject,
  Translation,
  findMatchingPluralisationKeys,
  extractVariables as extractVariables,
  hasInvalidBrackets,
  checkInvalidVariables as checkInvalidVariables,
  mergeTranslations,
  mergeNestedTranslations,
  mergeFlatMaps,
  setNamespaceTranslations,
  collectNamespaces,
  translationsToFlatMap,
  isNestedTranslations,
  buildExportObject,
  splitImportObject,
  CustomTranslationsV2,
} from './helpers';

describe('custom translations helpers', () => {
  describe('mapTranslationsToArray', () => {
    const t = (key: string) => {
      const mockDefaultTranslations: Record<string, string> = {
        'button.ok': 'OK',
        'button.ok-and-next': 'OK & Next',
      };

      return mockDefaultTranslations[key] ?? '';
    };
    it('maps to an empty array if there are no translations', () => {
      const translations = {};
      const result = mapTranslationsToArray(translations, t);
      expect(result).toEqual([]);
    });
    it('should return an array of translations', () => {
      const translations = {
        'button.ok': 'Okay',
        'button.ok-and-next': 'Onwards!',
      };
      const result = mapTranslationsToArray(translations, t);
      expect(result).toEqual([
        { id: 'button.ok', key: 'button.ok', default: 'OK', custom: 'Okay' },
        {
          id: 'button.ok-and-next',
          key: 'button.ok-and-next',
          default: 'OK & Next',
          custom: 'Onwards!',
        },
      ]);
    });
    it("excludes keys that don't exist in default OMS translations", () => {
      const translations = {
        'button.ok': 'Okay',
        'button.non-existent-key': 'Deleted!',
      };
      const result = mapTranslationsToArray(translations, t);
      expect(result).toEqual([
        { id: 'button.ok', key: 'button.ok', default: 'OK', custom: 'Okay' },
      ]);
    });
  });

  describe('mapTranslationsToObject', () => {
    it('maps to an empty object if there is an empty array', () => {
      const translations: Translation[] = [];
      const result = mapTranslationsToObject(translations);
      expect(result).toEqual({});
    });
    it('maps translations into an object', () => {
      const translations = [
        { id: 'button.ok', key: 'button.ok', default: 'OK', custom: 'Okay' },
        {
          id: 'button.ok-and-next',
          key: 'button.ok-and-next',
          default: 'OK & Next',
          custom: 'Onwards!',
        },
      ];
      const result = mapTranslationsToObject(translations);
      expect(result).toEqual({
        'button.ok': 'Okay',
        'button.ok-and-next': 'Onwards!',
      });
    });
    it('sorts translations alphabetically by key', () => {
      const translations = [
        { id: 'label.def', key: 'label.def', default: 'def', custom: 'DEF' },
        { id: 'label.abc', key: 'label.abc', default: 'abc', custom: 'ABC' },
      ];
      const result = mapTranslationsToObject(translations);
      expect(result).toEqual({
        'label.abc': 'ABC',
        'label.def': 'DEF',
      });
    });
    it('excludes entries that match default translations', () => {
      const translations = [
        { id: 'button.ok', key: 'button.ok', default: 'OK', custom: 'Okay' },
        {
          id: 'button.ok-and-next',
          key: 'button.ok-and-next',
          default: 'OK & Next',
          custom: 'OK & Next',
        },
      ];
      const result = mapTranslationsToObject(translations);
      expect(result).toEqual({
        'button.ok': 'Okay',
      });
    });
    it('excludes empty entries', () => {
      const translations = [
        { id: 'button.ok', key: 'button.ok', default: 'OK', custom: 'Okay' },
        {
          id: 'button.ok-and-next',
          key: 'button.ok-and-next',
          default: 'OK & Next',
          custom: '',
        },
      ];
      const result = mapTranslationsToObject(translations);
      expect(result).toEqual({
        'button.ok': 'Okay',
      });
    });
  });

  describe('findMatchingPluralisationKeys', () => {
    const allOptions: TranslationOption[] = [
      { key: 'item_one', default: 'You added one item' },
      { key: 'item_other', default: 'You added many items' },
      { key: 'non-pluralised', default: 'Non pluralised string' },
    ];

    it('returns all matching options with the same prefix before _', () => {
      const option = { key: 'item_one', default: 'You added one item' };
      const result = findMatchingPluralisationKeys(option, allOptions);
      expect(result).toEqual([
        { key: 'item_one', default: 'You added one item' },
        { key: 'item_other', default: 'You added many items' },
      ]);
    });

    it('returns only the option itself if no _ in key', () => {
      const option = {
        key: 'non-pluralised',
        default: 'Non pluralised string',
      };
      const result = findMatchingPluralisationKeys(option, allOptions);
      expect(result).toEqual([option]);
    });

    it('returns empty array if allOptions is empty', () => {
      const option = { key: 'item_one', default: 'You added one item' };
      const result = findMatchingPluralisationKeys(option, []);
      expect(result).toEqual([]);
    });
  });

  // Test Form Validation with Variables
  describe('form validation', () => {
    describe('extractVars', () => {
      it('extracts variables from valid patterns', () => {
        expect(extractVariables('Hello {{a}} and {{count}}!')).toEqual([
          'a',
          'count',
        ]);
        expect(extractVariables('{{a}}')).toEqual(['a']);
        expect(extractVariables('Start {{a}} middle {{b}} end')).toEqual([
          'a',
          'b',
        ]);
        expect(extractVariables('{{a_1}}')).toEqual(['a_1']);
        expect(extractVariables('Hello, {{a}}! {{b}}?')).toEqual(['a', 'b']);
        expect(extractVariables('{{a!}}')).toEqual(['a!']);
      });
      it('returns empty for no variables or invalid patterns', () => {
        expect(extractVariables('No vars here')).toEqual([]);
        expect(extractVariables('{{ }}')).toEqual([]);
        expect(extractVariables('')).toEqual([]);
        expect(extractVariables('{}')).toEqual([]);
        expect(extractVariables('{{}}')).toEqual([]);
        expect(extractVariables('{{a{{b}}}}')).toEqual([]);
      });
    });

    describe('hasInvalidBrackets', () => {
      it('returns true/invalid for incorrect number of brackets', () => {
        expect(hasInvalidBrackets('Hello {a}')).toBe(true);
        expect(hasInvalidBrackets('Hello {{{a}}}')).toBe(true);
        expect(hasInvalidBrackets('{')).toBe(true);
        expect(hasInvalidBrackets('text}')).toBe(true);
        expect(hasInvalidBrackets('{text')).toBe(true);
      });
      it('returns true/invalid for unmatched brackets', () => {
        expect(hasInvalidBrackets('Hello {a}}')).toBe(true);
        expect(hasInvalidBrackets('Hello {{a}')).toBe(true);
        expect(hasInvalidBrackets('Hello {{{a}}')).toBe(true);
        expect(hasInvalidBrackets('Hello {{a}}}')).toBe(true);
        expect(hasInvalidBrackets('Hello {{name}} {{count')).toBe(true);
        expect(hasInvalidBrackets('{{a{{b}}}}')).toBe(true);
      });
      it('returns true/invalid for incorrect order of brackets', () => {
        expect(hasInvalidBrackets('Hello }}a{{')).toBe(true);
      });
      it('returns false/valid for valid bracket pairs', () => {
        expect(hasInvalidBrackets('Hello {{a}}')).toBe(false);
        expect(hasInvalidBrackets('Hello {{a}} and {{count}}')).toBe(false);
        expect(hasInvalidBrackets('Hello {{a}} {{count}}')).toBe(false);
        expect(hasInvalidBrackets('No brackets')).toBe(false);
      });
      describe('Bracket edge cases', () => {
        it('returns true/invalid for multiple valid pairs and stray brackets', () => {
          expect(hasInvalidBrackets('{{a}} { {{b}} }')).toBe(true);
          expect(hasInvalidBrackets('{ { } }')).toBe(true);
          expect(hasInvalidBrackets('{{a{{b}}}}')).toBe(true);
          expect(hasInvalidBrackets('{{a}}}')).toBe(true);
          expect(hasInvalidBrackets('{{a}}{')).toBe(true);
        });
        it('returns false/valid for multiple valid bracket pairs, including on and multiple lines', () => {
          expect(hasInvalidBrackets('Start {{a}} middle {{b}} end {{c}}')).toBe(
            false
          );
          expect(hasInvalidBrackets('Line1 {{a}}\nLine2 {{b}}')).toBe(false);
        });
      });
    });

    describe('checkInvalidVars', () => {
      it('returns true/invalid if custom uses a variable not in default', () => {
        expect(
          checkInvalidVariables({ default: '{{a}}', custom: '{{b}}' })
        ).toBe(true);
        expect(
          checkInvalidVariables({ default: '{{a}}', custom: '{{a}} {{b}}' })
        ).toBe(true);
        expect(
          checkInvalidVariables({ default: '{{a}}', custom: '{{aa}}' })
        ).toBe(true);
      });
      it('returns false/valid for valid variable usage', () => {
        expect(
          checkInvalidVariables({ default: '{{a}}', custom: '{{a}} {{a}}' })
        ).toBe(false);
        expect(checkInvalidVariables({ default: '', custom: '' })).toBe(false);
        expect(
          checkInvalidVariables({
            default: 'Hi {{a}} {{b}}',
            custom: 'Hello {{b}} {{a}}',
          })
        ).toBe(false);
        expect(
          checkInvalidVariables({
            default: 'Hi {{a}} {{b}}',
            custom: 'Hello {{a}} {{b}}',
          })
        ).toBe(false);
        expect(
          checkInvalidVariables({
            default: 'Hi {{a}} {{b}}',
            custom: 'Hello {{a}}',
          })
        ).toBe(false);
        expect(
          checkInvalidVariables({ default: 'Hi {{a}}', custom: 'Hello' })
        ).toBe(false);
        expect(
          checkInvalidVariables({
            default: 'Line1 {{a}}\nLine2 {{b}}',
            custom: 'Line2 {{b}}\nLine1 {{a}}',
          })
        ).toBe(false);
      });
    });
  });

  describe('mergeTranslations', () => {
    const tr = (
      key: string,
      custom: string,
      defaultVal = 'Default'
    ): Translation => ({
      id: key,
      key,
      default: defaultVal,
      custom,
    });

    const existing: Translation[] = [
      tr('button.ok', 'Okay', 'OK'),
      tr('button.cancel', 'Annuler', 'Cancel'),
      tr('label.name', 'Nom', 'Name'),
    ];

    describe('replace mode', () => {
      it('replaces all existing translations with imported ones', () => {
        const imported = [tr('button.ok', 'Sure', 'OK'), tr('label.new', 'New!', 'New')];
        const result = mergeTranslations(existing, imported, 'replace');
        expect(result).toEqual(imported);
      });

      it('returns empty array when imported is empty', () => {
        const result = mergeTranslations(existing, [], 'replace');
        expect(result).toEqual([]);
      });

      it('replaces even when existing is empty', () => {
        const imported = [tr('label.new', 'New!', 'New')];
        const result = mergeTranslations([], imported, 'replace');
        expect(result).toEqual(imported);
      });
    });

    describe('keep-existing mode', () => {
      it('adds new keys without modifying existing ones', () => {
        const imported = [
          tr('button.ok', 'Sure', 'OK'),     // exists — should be skipped
          tr('label.new', 'Nouveau', 'New'),  // new — should be added
        ];
        const result = mergeTranslations(existing, imported, 'keep-existing');
        expect(result).toEqual([
          ...existing,
          tr('label.new', 'Nouveau', 'New'),
        ]);
      });

      it('preserves existing custom values for overlapping keys', () => {
        const imported = [tr('button.ok', 'Overridden', 'OK')];
        const result = mergeTranslations(existing, imported, 'keep-existing');
        // button.ok should keep the original 'Okay' value
        expect(result.find(t => t.key === 'button.ok')?.custom).toBe('Okay');
      });

      it('returns existing unchanged when imported is empty', () => {
        const result = mergeTranslations(existing, [], 'keep-existing');
        expect(result).toEqual(existing);
      });

      it('adds all imported when existing is empty', () => {
        const imported = [tr('label.new', 'New!', 'New')];
        const result = mergeTranslations([], imported, 'keep-existing');
        expect(result).toEqual(imported);
      });

      it('adds nothing when all imported keys already exist', () => {
        const imported = [
          tr('button.ok', 'Different', 'OK'),
          tr('button.cancel', 'Different', 'Cancel'),
        ];
        const result = mergeTranslations(existing, imported, 'keep-existing');
        expect(result).toEqual(existing);
      });
    });

    describe('overwrite mode', () => {
      it('overwrites existing keys and adds new ones', () => {
        const imported = [
          tr('button.ok', 'Sure', 'OK'),     // exists — should be overwritten
          tr('label.new', 'Nouveau', 'New'),  // new — should be added
        ];
        const result = mergeTranslations(existing, imported, 'overwrite');
        expect(result).toEqual([
          tr('button.ok', 'Sure', 'OK'),       // overwritten
          tr('button.cancel', 'Annuler', 'Cancel'), // untouched
          tr('label.name', 'Nom', 'Name'),     // untouched
          tr('label.new', 'Nouveau', 'New'),   // added
        ]);
      });

      it('preserves non-overlapping existing translations', () => {
        const imported = [tr('button.ok', 'Sure', 'OK')];
        const result = mergeTranslations(existing, imported, 'overwrite');
        expect(result.find(t => t.key === 'button.cancel')?.custom).toBe(
          'Annuler'
        );
        expect(result.find(t => t.key === 'label.name')?.custom).toBe('Nom');
      });

      it('only updates the custom field, preserving other properties', () => {
        const existingWithMeta: Translation[] = [
          { id: 'button.ok', key: 'button.ok', default: 'OK', custom: 'Okay', isNew: true },
        ];
        const imported = [tr('button.ok', 'Sure', 'OK')];
        const result = mergeTranslations(existingWithMeta, imported, 'overwrite');
        expect(result[0]).toEqual({
          id: 'button.ok',
          key: 'button.ok',
          default: 'OK',
          custom: 'Sure',
          isNew: true,
        });
      });

      it('returns existing unchanged when imported is empty', () => {
        const result = mergeTranslations(existing, [], 'overwrite');
        expect(result).toEqual(existing);
      });

      it('adds all imported when existing is empty', () => {
        const imported = [tr('label.new', 'New!', 'New')];
        const result = mergeTranslations([], imported, 'overwrite');
        expect(result).toEqual(imported);
      });

      it('overwrites all when every key overlaps', () => {
        const imported = [
          tr('button.ok', 'Sure', 'OK'),
          tr('button.cancel', 'Nope', 'Cancel'),
          tr('label.name', 'Nombre', 'Name'),
        ];
        const result = mergeTranslations(existing, imported, 'overwrite');
        expect(result.map(t => t.custom)).toEqual(['Sure', 'Nope', 'Nombre']);
      });
    });
  });

  describe('v2 (per-language / per-namespace) helpers', () => {
    const sample = (): CustomTranslationsV2 => ({
      fr: {
        common: { 'button.ok': 'Oui', 'button.cancel': 'Annuler' },
        report: { 'report.title': 'Rapport' },
      },
      en: { common: { 'button.ok': 'OK' } },
    });

    describe('collectNamespaces', () => {
      it('returns the unique namespaces across all languages', () => {
        expect(collectNamespaces(sample()).sort()).toEqual(['common', 'report']);
      });
      it('returns empty for an empty structure', () => {
        expect(collectNamespaces({})).toEqual([]);
      });
    });

    describe('setNamespaceTranslations', () => {
      it('sets a language + namespace map', () => {
        const result = setNamespaceTranslations({}, 'fr', 'common', {
          'button.ok': 'Oui',
        });
        expect(result).toEqual({ fr: { common: { 'button.ok': 'Oui' } } });
      });
      it('removes the namespace (and language) when given an empty map', () => {
        const start: CustomTranslationsV2 = {
          fr: { common: { 'button.ok': 'Oui' } },
        };
        const result = setNamespaceTranslations(start, 'fr', 'common', {});
        expect(result).toEqual({});
      });
      it('keeps other namespaces when removing one', () => {
        const result = setNamespaceTranslations(sample(), 'fr', 'report', {});
        expect(result.fr).toEqual({
          common: { 'button.ok': 'Oui', 'button.cancel': 'Annuler' },
        });
      });
      it('does not mutate the input', () => {
        const start = sample();
        setNamespaceTranslations(start, 'fr', 'common', {});
        expect(start.fr?.common).toBeDefined();
      });
    });

    describe('mergeNestedTranslations', () => {
      it('replace mode returns the imported structure', () => {
        const imported: CustomTranslationsV2 = { es: { common: { a: 'b' } } };
        expect(mergeNestedTranslations(sample(), imported, 'replace')).toEqual(
          imported
        );
      });
      it('keep-existing keeps existing keys, adds new ones', () => {
        const imported: CustomTranslationsV2 = {
          fr: { common: { 'button.ok': 'CHANGED', 'button.new': 'Nouveau' } },
        };
        const result = mergeNestedTranslations(
          sample(),
          imported,
          'keep-existing'
        );
        expect(result.fr?.common?.['button.ok']).toBe('Oui'); // kept
        expect(result.fr?.common?.['button.new']).toBe('Nouveau'); // added
      });
      it('overwrite replaces overlapping keys and merges the rest', () => {
        const imported: CustomTranslationsV2 = {
          fr: { common: { 'button.ok': 'CHANGED' } },
          es: { common: { hola: 'Hola' } },
        };
        const result = mergeNestedTranslations(sample(), imported, 'overwrite');
        expect(result.fr?.common?.['button.ok']).toBe('CHANGED');
        expect(result.fr?.common?.['button.cancel']).toBe('Annuler'); // untouched
        expect(result.es?.common?.hola).toBe('Hola'); // new language
        expect(result.en?.common?.['button.ok']).toBe('OK'); // untouched language
      });
    });

    describe('mergeFlatMaps', () => {
      const existing = { a: '1', b: '2' };
      it('replace returns a copy of imported', () => {
        expect(mergeFlatMaps(existing, { c: '3' }, 'replace')).toEqual({
          c: '3',
        });
      });
      it('keep-existing keeps existing values', () => {
        expect(
          mergeFlatMaps(existing, { a: 'X', c: '3' }, 'keep-existing')
        ).toEqual({ a: '1', b: '2', c: '3' });
      });
      it('overwrite replaces overlapping values', () => {
        expect(
          mergeFlatMaps(existing, { a: 'X', c: '3' }, 'overwrite')
        ).toEqual({ a: 'X', b: '2', c: '3' });
      });
    });

    describe('translationsToFlatMap', () => {
      it('keeps entries equal to the default and drops empty, sorted by key', () => {
        const rows: Translation[] = [
          { id: 'b', key: 'b', default: 'B', custom: 'B' }, // equals default - KEPT
          { id: 'a', key: 'a', default: 'A', custom: 'Aa' },
          { id: 'c', key: 'c', default: 'C', custom: '' }, // empty - dropped
        ];
        expect(translationsToFlatMap(rows)).toEqual({ a: 'Aa', b: 'B' });
      });
    });

    describe('isNestedTranslations', () => {
      it('is true for a nested structure', () => {
        expect(isNestedTranslations({ fr: { common: { a: 'b' } } })).toBe(true);
      });
      it('is false for a flat map', () => {
        expect(isNestedTranslations({ 'button.ok': 'Oui' })).toBe(false);
      });
    });

    describe('buildExportObject', () => {
      it('omits the _v1 key when v1 is empty', () => {
        const out = buildExportObject(sample(), {});
        expect(out['_v1']).toBeUndefined();
        expect(out['fr']).toBeDefined();
      });
      it('includes the legacy v1 map under _v1', () => {
        const out = buildExportObject(sample(), { 'button.ok': 'Legacy' });
        expect(out['_v1']).toEqual({ 'button.ok': 'Legacy' });
      });
    });

    describe('splitImportObject', () => {
      it('splits a structured file with _v1 and languages', () => {
        const result = splitImportObject({
          _v1: { 'button.ok': 'Legacy' },
          fr: { common: { 'button.ok': 'Oui' } },
        });
        expect(result.isStructured).toBe(true);
        expect(result.legacyV1).toEqual({ 'button.ok': 'Legacy' });
        expect(result.v2).toEqual({ fr: { common: { 'button.ok': 'Oui' } } });
      });
      it('treats a plain flat file as not structured', () => {
        const result = splitImportObject({ 'button.ok': 'Oui' });
        expect(result.isStructured).toBe(false);
        expect(result.v2).toBeUndefined();
        expect(result.legacyV1).toBeUndefined();
      });
      it('handles a _v1-only file', () => {
        const result = splitImportObject({ _v1: { 'button.ok': 'Legacy' } });
        expect(result.isStructured).toBe(true);
        expect(result.legacyV1).toEqual({ 'button.ok': 'Legacy' });
        expect(result.v2).toBeUndefined();
      });
    });
  });
});

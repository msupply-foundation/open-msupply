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
});

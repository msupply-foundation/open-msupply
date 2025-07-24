import { TranslationOption } from './TranslationSearchInput';
import {
  mapTranslationsToArray,
  mapTranslationsToObject,
  Translation,
  findMatchingPluralisationKeys,
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
});

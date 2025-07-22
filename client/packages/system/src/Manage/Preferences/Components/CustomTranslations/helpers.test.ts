import {
  mapTranslationsToArray,
  mapTranslationsToObject,
  Translation,
} from './helpers';

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
  // TODO: test to filter out empty
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

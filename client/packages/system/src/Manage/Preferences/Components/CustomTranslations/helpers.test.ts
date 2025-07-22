import { mapTranslations } from './helpers';

describe('mapTranslations', () => {
  const t = (key: string) => {
    const mockDefaultTranslations: Record<string, string> = {
      'button.ok': 'OK',
      'button.ok-and-next': 'OK & Next',
    };

    return mockDefaultTranslations[key] ?? '';
  };
  it('maps to an empty array if there are no translations', () => {
    const translations = {};
    const result = mapTranslations(translations, t);
    expect(result).toEqual([]);
  });
  it('should return an array of translations', () => {
    const translations = {
      'button.ok': 'Okay',
      'button.ok-and-next': 'Onwards!',
    };
    const result = mapTranslations(translations, t);
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
    const result = mapTranslations(translations, t);
    expect(result).toEqual([
      { id: 'button.ok', key: 'button.ok', default: 'OK', custom: 'Okay' },
    ]);
  });
});

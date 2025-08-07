import { checkInvalidLocationLines } from './utils';

type TestLine = {
  location?: {
    locationType?: { id: string | null; name?: string } | null;
  } | null;
};

describe('checkInvalidLocationLines', () => {
  it('returns false if there is no restrictedLocationTypeId', () => {
    const lines: TestLine[] = [
      { location: { locationType: { id: 'Fridge', name: 'Fridge' } } },
      { location: { locationType: { id: 'Freezer', name: 'Freezer' } } },
    ];
    expect(checkInvalidLocationLines(null, lines)).toBe(false);
  });

  it('returns false if restrictedLocationTypeId matches locationTypeId', () => {
    const lines: TestLine[] = [
      { location: { locationType: { id: 'Fridge', name: 'Fridge' } } },
      { location: { locationType: { id: 'Fridge', name: 'Fridge' } } },
    ];
    expect(checkInvalidLocationLines('Fridge', lines)).toBe(false);
  });

  it('returns false if restrictedLocationTypeId exists but locationTypeId is missing', () => {
    const lines: TestLine[] = [
      { location: { locationType: { id: null, name: undefined } } },
      { location: { locationType: undefined } },
      { location: null },
      {},
    ];
    expect(checkInvalidLocationLines('Fridge', lines)).toBe(false);
  });

  it('returns true if restrictedLocationTypeId does NOT match locationTypeId', () => {
    const lines: TestLine[] = [
      { location: { locationType: { id: 'Freezer', name: 'Freezer' } } },
      { location: { locationType: { id: 'Fridge', name: 'Fridge' } } },
    ];
    expect(checkInvalidLocationLines('Fridge', lines)).toBe(true);
  });
  it('returns true if at least one line has a mismatched locationTypeId, even if others are valid or missing', () => {
    const lines: TestLine[] = [
      { location: { locationType: { id: 'Fridge', name: 'Fridge' } } }, // valid
      { location: { locationType: { id: 'Freezer', name: 'Freezer' } } }, // invalid
      { location: { locationType: { id: null, name: undefined } } }, // missing
      { location: { locationType: undefined } }, // missing
      { location: null }, // missing
      {}, // missing
    ];
    expect(checkInvalidLocationLines('Fridge', lines)).toBe(true);
  });
});

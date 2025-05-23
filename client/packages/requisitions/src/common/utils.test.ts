import { getValueInUnitsOrPacks, Representation } from './utils';

describe('getValueInUnitsOrPacks', () => {
  it('returns value as is when package type is UNITS', () => {
    const value = 42;
    const result = getValueInUnitsOrPacks(Representation.UNITS, 10, value);
    expect(result).toBe(value);
  });

  it('divides value by default pack size when package type is PACKS', () => {
    const value = 100;
    const defaultPackSize = 10;
    const result = getValueInUnitsOrPacks(
      Representation.PACKS,
      defaultPackSize,
      value
    );
    expect(result).toBe(value / defaultPackSize);
  });
});

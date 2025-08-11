import { LocationRowFragment } from '.';
import { checkInvalidLocationLines, getVolumeUsedPercentage } from './utils';

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

describe('getVolumeUsedPercentage', () => {
  describe('when location has no total volume defined', () => {
    it('should return undefined when volume is 0', () => {
      const location = createMockLocation({ volume: 0, volumeUsed: 10 });
      expect(getVolumeUsedPercentage(location)).toBeUndefined();
    });
  });

  describe('when stock lines exist but volume used is 0', () => {
    it('should return undefined when totalCount > 0 and volumeUsed is 0', () => {
      const location = createMockLocation({
        volume: 100,
        volumeUsed: 0,
        stockTotalCount: 5,
      });
      expect(getVolumeUsedPercentage(location)).toBeUndefined();
    });
  });

  describe('when calculating valid percentages', () => {
    it('should return 0% when no stock and no volume used', () => {
      const location = createMockLocation();
      expect(getVolumeUsedPercentage(location)).toBe(0);
    });

    it('should return 50% when half volume is used', () => {
      const location = createMockLocation({
        volume: 100,
        volumeUsed: 50,
      });
      expect(getVolumeUsedPercentage(location)).toBe(50);
    });

    it('should return over 100% when over capacity', () => {
      const location = createMockLocation({
        volume: 100,
        volumeUsed: 150,
      });
      expect(getVolumeUsedPercentage(location)).toBe(150);
    });

    it('should work with stock present and volume used > 0', () => {
      const location = createMockLocation({
        volume: 200,
        volumeUsed: 80,
        stockTotalCount: 3,
      });
      expect(getVolumeUsedPercentage(location)).toBe(40);
    });
  });
});

// Helper function to create a mock location with default values
const createMockLocation = ({
  volume,
  volumeUsed,
  stockTotalCount,
}: {
  volume?: number;
  volumeUsed?: number;
  stockTotalCount?: number;
} = {}): LocationRowFragment => ({
  __typename: 'LocationNode',
  id: 'test-location-id',
  name: 'Test Location',
  code: 'TEST001',
  onHold: false,
  volume: volume ?? 100,
  volumeUsed: volumeUsed ?? 0,
  locationType: null,
  stock: { __typename: 'StockLineConnector', totalCount: stockTotalCount ?? 0 },
});

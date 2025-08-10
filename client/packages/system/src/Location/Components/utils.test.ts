import { getVolumeUsedPercentage } from './utils';
import { LocationRowFragment } from '../api';

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

    it('should return 100% when fully used', () => {
      const location = createMockLocation({
        volume: 100,
        volumeUsed: 100,
      });
      expect(getVolumeUsedPercentage(location)).toBe(100);
    });

    it('should return over 100% when over capacity', () => {
      const location = createMockLocation({
        volume: 100,
        volumeUsed: 150,
      });
      expect(getVolumeUsedPercentage(location)).toBe(150);
    });

    it('should handle decimal values correctly', () => {
      const location = createMockLocation({
        volume: 75,
        volumeUsed: 25,
      });
      expect(getVolumeUsedPercentage(location)).toBeCloseTo(33.33);
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

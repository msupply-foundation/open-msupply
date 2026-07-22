import type { LocationWithVolume } from './locationResource';

// The percentage of a location's capacity that is used, or `undefined` when a
// meaningful figure can't be shown — mirroring the current app's
// getVolumeUsedPercentage so the list fullness bar and the picker's "% used"
// agree (spec/locations/acceptance.md AC-V2, spec/ui-standards/components.md).
//
// Undefined (no percentage shown) when:
//   - capacity is 0 (nothing to be a proportion of), or
//   - the location holds stock but volumeUsed is 0 — i.e. its stock lines carry
//     no volume data, so a "0% used" reading would be misleading rather than true.
export const getVolumeUsedPercentage = (
  location: Pick<LocationWithVolume, 'volume' | 'volumeUsed' | 'stock'>
): number | undefined => {
  const { volume, volumeUsed } = location;
  if (!volume) return undefined;
  if (location.stock.totalCount > 0 && volumeUsed === 0) return undefined;
  return (volumeUsed / volume) * 100;
};

// The free capacity remaining in a location (never negative for the check's
// purpose — an over-full location simply has 0 free). Used by the "Available"
// fullness filter: a location fits when free ≥ the required volume.
export const availableVolume = (
  location: Pick<LocationWithVolume, 'volume' | 'volumeUsed'>
): number => location.volume - location.volumeUsed;

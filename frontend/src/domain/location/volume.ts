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

// The free capacity remaining in a location (negative when over capacity).
export const availableVolume = (
  location: Pick<LocationWithVolume, 'volume' | 'volumeUsed'>
): number => location.volume - location.volumeUsed;

// The two fullness-filter predicates behind the picker's tabs (All / Empty /
// Available — spec/ui-standards/components.md → Location lookup). Pure and
// undefined-agnostic so they're unit-testable in isolation from the widget.

// "Empty" — the location holds no stock.
export const isEmpty = (location: Pick<LocationWithVolume, 'stock'>): boolean =>
  location.stock.totalCount === 0;

// "Available" — the location can take more stock: it is NOT on hold and NOT
// full. A location with no recorded capacity (volume 0) counts as having room
// rather than being excluded — unknown capacity is not a reason to hide it,
// mirroring the list's fullness rule where such a location shows no bar.
export const isAvailable = (
  location: Pick<LocationWithVolume, 'volume' | 'volumeUsed' | 'onHold'>
): boolean =>
  !location.onHold &&
  (location.volume === 0 || location.volumeUsed < location.volume);

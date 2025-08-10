import { LocationRowFragment } from '../api';

export const getVolumeUsedPercentage = (
  location: LocationRowFragment
): number | undefined => {
  if (
    // If no total volume is defined, we can't calculate percentage
    !location.volume ||
    // If some stock lines associated, but volume used is 0, show as undefined
    // This means stock lines don't have defined volume data, so we can't
    // provide an accurate volume used percentage
    (location.stock?.totalCount > 0 && location.volumeUsed === 0)
  ) {
    return undefined;
  }

  return (location.volumeUsed / location.volume) * 100;
};

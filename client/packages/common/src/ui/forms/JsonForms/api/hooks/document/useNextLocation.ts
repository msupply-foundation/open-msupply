import { LocationRowFragment } from '../../operations.generated';
import { useLocations } from './useLocations';

export const useNextLocation = (
  currentLocation: LocationRowFragment | null
): LocationRowFragment | null => {
  const { data } = useLocations();
  const idx = data?.nodes.findIndex(l => l.id === currentLocation?.id);
  if (idx == undefined) return null;
  const next = data?.nodes[(idx + 1) % data?.nodes.length];

  return next ?? null;
};

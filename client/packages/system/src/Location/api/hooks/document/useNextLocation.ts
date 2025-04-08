import { useUrlQueryParams } from '@common/hooks';
import { LocationRowFragment } from '../../operations.generated';
import { useLocationList } from '../useLocationList';

export const useNextLocation = (
  currentLocation: LocationRowFragment | null
): LocationRowFragment | null => {
  const { queryParams } = useUrlQueryParams({
    initialSort: { key: 'name', dir: 'asc' },
  });

  const {
    query: { data },
  } = useLocationList(queryParams);
  const idx = data?.nodes.findIndex(l => l.id === currentLocation?.id);
  if (idx == undefined) return null;
  const next = data?.nodes[(idx + 1) % data?.nodes.length];

  return next ?? null;
};

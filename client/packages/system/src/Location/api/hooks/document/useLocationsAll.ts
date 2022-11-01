import { SortBy, useMutation } from '@openmsupply-client/common';
import { LocationRowFragment } from '../../operations.generated';
import { useLocationApi } from '../utils/useLocationApi';

export const useLocationsAll = (sortBy: SortBy<LocationRowFragment>) => {
  const api = useLocationApi();
  const result = useMutation(api.keys.sortedList(sortBy), () =>
    api.get.list({ sortBy })
  );

  return { ...result, fetchAsync: result.mutateAsync };
};

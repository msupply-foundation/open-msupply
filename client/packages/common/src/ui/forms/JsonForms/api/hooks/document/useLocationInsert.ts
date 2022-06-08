import { useMutation, useQueryClient } from '@openmsupply-client/common';
import { LocationRowFragment } from '../../operations.generated';
import { useLocationApi } from '../utils/useLocationApi';

export const useLocationInsert = () => {
  const queryClient = useQueryClient();
  const api = useLocationApi();
  return useMutation(
    async (location: LocationRowFragment) => api.insert(location),
    {
      onSettled: () => queryClient.invalidateQueries(api.keys.base()),
    }
  );
};

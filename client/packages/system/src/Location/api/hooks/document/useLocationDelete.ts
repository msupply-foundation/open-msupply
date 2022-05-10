import { useMutation, useQueryClient } from '@openmsupply-client/common';
import { LocationRowFragment } from '../../operations.generated';
import { useLocationApi } from '../utils/useLocationApi';

export const useLocationDelete = () => {
  const queryClient = useQueryClient();
  const api = useLocationApi();
  return useMutation(
    async (location: LocationRowFragment) => api.delete(location),
    {
      onSettled: () => queryClient.invalidateQueries(api.keys.base()),
    }
  );
};

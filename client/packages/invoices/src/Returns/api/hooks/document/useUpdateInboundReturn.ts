import {
  useQueryClient,
  useMutation,
  useDebounceCallback,
} from '@openmsupply-client/common';
import { useReturnsApi } from '../utils/useReturnsApi';

const DEBOUNCE_TIME = 500;

export const useUpdateInboundReturn = () => {
  const queryClient = useQueryClient();
  const api = useReturnsApi();
  const mutation = useMutation(api.updateInboundReturn, {
    onSuccess: () => {
      return queryClient.invalidateQueries(api.keys.base());
    },
  });

  const debouncedMutateAsync = useDebounceCallback(
    mutation.mutateAsync,
    [],
    DEBOUNCE_TIME
  );

  return { ...mutation, debouncedMutateAsync };
};

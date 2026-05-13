import {
  useQueryClient,
  useMutation,
  useDebounceCallback,
} from '@openmsupply-client/common';
import { useReturnsApi } from '../utils/useReturnsApi';

const DEBOUNCE_TIME = 500;

export const useUpdateSupplierReturn = () => {
  const queryClient = useQueryClient();
  const api = useReturnsApi();
  const mutation = useMutation({
    mutationFn: api.updateSupplierReturn,

    onSuccess: () => {
      return queryClient.invalidateQueries({
        queryKey: api.keys.base()
      });
    }
  });

  const debouncedMutateAsync = useDebounceCallback(
    mutation.mutateAsync,
    [],
    DEBOUNCE_TIME
  );

  return { ...mutation, debouncedMutateAsync };
};

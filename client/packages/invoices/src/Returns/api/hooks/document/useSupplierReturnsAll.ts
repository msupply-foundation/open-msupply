import { SortBy, useMutation } from '@openmsupply-client/common';
import { useReturnsApi } from '../utils/useReturnsApi';
import { SupplierReturnRowFragment } from '../../operations.generated';

export const useSupplierReturnsAll = (
  sortBy: SortBy<SupplierReturnRowFragment>
) => {
  const api = useReturnsApi();
  const result = useMutation(api.keys.supplierSortedList(sortBy), () =>
    api.get.listAllSupplier(sortBy)
  );
  return {
    ...result,
    fetchAsync: result.mutateAsync,
  };
};

import { SortBy, useMutation } from '@openmsupply-client/common';
import { useReturnsApi } from '../utils/useReturnsApi';
import { CustomerReturnRowFragment } from '../../operations.generated';

export const useCustomerReturnsAll = (
  sortBy: SortBy<CustomerReturnRowFragment>
) => {
  const api = useReturnsApi();
  const result = useMutation(api.keys.customerSortedList(sortBy), () =>
    api.get.listAllCustomer(sortBy)
  );
  return {
    ...result,
    fetchAsync: result.mutateAsync,
  };
};

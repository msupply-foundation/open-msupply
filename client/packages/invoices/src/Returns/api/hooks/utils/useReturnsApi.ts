import { SortBy, useAuthContext, useGql } from '@openmsupply-client/common';
import {
  CustomerListParams,
  SupplierListParams,
  getReturnsQueries,
} from '../../api';
import {
  CustomerReturnRowFragment,
  SupplierReturnRowFragment,
  getSdk,
} from '../../operations.generated';

export const useReturnsApi = () => {
  const { storeId } = useAuthContext();
  const keys = {
    base: () => ['returns'] as const,
    count: () => [...keys.base(), 'count'] as const,
    customerList: () => [...keys.base(), storeId, 'customerList'] as const,
    customerSortedList: (sortBy: SortBy<CustomerReturnRowFragment>) =>
      [...keys.customerList(), sortBy] as const,
    customerParamList: (params: CustomerListParams) =>
      [...keys.customerList(), params] as const,
    supplierList: () => [...keys.base(), storeId, 'supplierList'] as const,
    supplierSortedList: (sortBy: SortBy<SupplierReturnRowFragment>) =>
      [...keys.supplierList(), sortBy] as const,
    supplierParamList: (params: SupplierListParams) =>
      [...keys.supplierList(), params] as const,
    supplierDetail: (invoiceId: string) =>
      [...keys.base(), storeId, invoiceId] as const,
    customerDetail: (invoiceId: string) =>
      [...keys.base(), storeId, 'customer', invoiceId] as const,
    generatedSupplierLines: (itemId?: string) =>
      [...keys.base(), storeId, 'generatedSupplierLines', itemId] as const,
    generatedCustomerLines: (itemId?: string) =>
      [...keys.base(), storeId, 'generatedCustomerLines', itemId] as const,
  };

  const { client } = useGql();
  const queries = getReturnsQueries(getSdk(client), storeId);
  return { ...queries, storeId, keys };
};

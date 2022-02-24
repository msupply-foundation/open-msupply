import {
  useOmSupplyApi,
  NameSortFieldInput,
  Name,
} from '@openmsupply-client/common';
import { useQuery, UseQueryResult } from 'react-query';

export const useNames = ({
  isCustomer,
  isSupplier,
}: {
  isCustomer?: boolean;
  isSupplier?: boolean;
}): UseQueryResult<{
  nodes: Name[];
  totalCount: number;
}> => {
  // TODO: Paginate and name/code filtering.
  const { api } = useOmSupplyApi();
  return useQuery(['names', 'list'], async () => {
    const result = await api.names({
      key: NameSortFieldInput.Name,
      filter: { isCustomer, isSupplier },
    });

    return result.names;
  });
};

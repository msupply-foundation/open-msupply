import {
  useOmSupplyApi,
  NameSortFieldInput,
  NamesQuery,
  Name,
} from '@openmsupply-client/common';
import { useQuery, UseQueryResult } from 'react-query';

const namesGuard = (
  namesQuery: NamesQuery
): { totalCount: number; nodes: Name[] } => {
  if (namesQuery.names.__typename === 'NameConnector') {
    return namesQuery.names;
  } else {
    throw new Error(namesQuery.names.error.description);
  }
};

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

    return namesGuard(result);
  });
};

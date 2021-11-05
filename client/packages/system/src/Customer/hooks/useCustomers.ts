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

export const useCustomers = (): UseQueryResult<{
  nodes: Name[];
  totalCount: number;
}> => {
  const { api } = useOmSupplyApi();
  return useQuery(['names', 'list'], async () => {
    const result = await api.names({ key: NameSortFieldInput.Name });

    return namesGuard(result);
  });
};

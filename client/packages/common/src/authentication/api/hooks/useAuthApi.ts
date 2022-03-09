import { useGraphQLClient } from '../../../api';
import { getAuthQueries } from '../api';
import { getSdk } from '../operations.generated';

export const useAuthApi = () => {
  const { client } = useGraphQLClient();
  const queries = getAuthQueries(getSdk(client));

  const keys = {
    refresh: (token: string) => ['refresh', token] as const,
  };

  return { ...queries, keys };
};

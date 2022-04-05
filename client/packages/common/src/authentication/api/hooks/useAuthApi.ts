import { useGql } from '../../../api';
import { getAuthQueries } from '../api';
import { getSdk } from '../operations.generated';

export const useAuthApi = () => {
  const { client } = useGql();
  const queries = getAuthQueries(getSdk(client));

  const keys = {
    me: (token: string) => ['me', token] as const,
    refresh: (token: string) => ['refresh', token] as const,
  };

  return { ...queries, keys };
};

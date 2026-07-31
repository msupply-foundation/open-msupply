import { useTranslation } from '@common/intl';
import { useGql } from '../../../api';
import { getAuthQueries } from '../api';
import { getSdk } from '../operations.generated';

export const useAuthApi = () => {
  const { client } = useGql();
  const t = useTranslation();
  const sdk = getSdk(client);
  const queries = getAuthQueries(sdk, t);

  // Cache keys no longer need to be parameterised by token — auth is per-cookie/per-session and
  // the server handles user identity. If a user logs out and a different one logs in within the
  // same tab the AuthContext clears state, so cached values stay scoped correctly via React's
  // tree-level keying.
  const keys = {
    me: () => ['me'] as const,
    isCentralServer: ['isCentralServer'] as const,
    isCentralStandalone: ['isCentralStandalone'] as const,
  };

  return { ...queries, sdk, keys, client };
};

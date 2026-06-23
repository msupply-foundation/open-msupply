import { NetworkError, useGql, useQuery } from '@openmsupply-client/common';
import { getSdk } from '../operations.generated';

/**
 * Hook to query database migration status from the server.
 * @param refetchInterval - Interval in ms to refetch, or 0 to disable polling
 * @returns
 *   isLoading — first response hasn't settled yet; caller should show a
 *     generic loader rather than a state the server hasn't confirmed.
 *   inProgress — server has explicitly reported migrations in progress.
 *   connectionLost — the bootstrap query failed with a NetworkError;
 *     caller should render a "can't connect" gate rather than letting
 *     the rest of the app try to render.
 */
export const useMigrationStatus = (refetchInterval: number = 0) => {
  const { client } = useGql();
  const sdk = getSdk(client);
  const result = useQuery({
    queryKey: ['migrationStatus'],
    queryFn: async () => {
      const result = await sdk.migrationStatus();
      return result?.migrationStatus;
    },
    // Stop polling once the query has settled into an error state.
    // Otherwise each tick kicks off a fresh attempt (with its own 3
    // retries), the in-flight fetch transiently clears result.error,
    // and the UI flips between RandomLoader and ConnectionLostPage.
    // The ConnectionLostPage Retry button invalidates this query,
    // which restarts polling.
    refetchInterval: query => (query.state.error ? false : refetchInterval),
  });

  return {
    isLoading: result.data === undefined && !result.isError,
    // Only true once the server has explicitly said so. No defaulting
    // — without a confirmed response the caller is in `isLoading`.
    inProgress: result.data?.inProgress === true,
    // migrationStatus is a public query, so the only error worth gating
    // on is a transport failure. Anything else (auth misconfig, internal
    // 5xx) is a server bug — let the app render so other UI surfaces
    // (toast, banner) can flag the real problem.
    connectionLost: result.error instanceof NetworkError,
  };
};

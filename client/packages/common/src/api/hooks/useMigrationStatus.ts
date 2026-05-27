import { NetworkError, useGql, useQuery } from '@openmsupply-client/common';
import { getSdk } from '../operations.generated';

/**
 * Hook to query database migration status from the server.
 * @param refetchInterval - Interval in ms to refetch, or 0 to disable polling
 * @returns inProgress (true while loading or migrating) and
 *   connectionLost (the bootstrap query failed with a NetworkError —
 *   caller should render a "can't connect" gate rather than letting
 *   the rest of the app try to render).
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
    refetchInterval,
  });

  // migrationStatus is a public query, so the only error worth gating
  // on is a transport failure. Anything else (auth misconfig, internal
  // 5xx) is a server bug — let the app render so other UI surfaces
  // (toast, banner) can flag the real problem.
  const connectionLost = result.error instanceof NetworkError;

  return {
    // Defaulting to true while loading keeps the migration screen
    // visible until we have a definitive answer from the server.
    inProgress: result.isError ? false : (result.data?.inProgress ?? true),
    connectionLost,
  };
};

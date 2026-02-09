import { useGql, useQuery } from '@openmsupply-client/common';
import { getSdk } from '../operations.generated';

/**
 * Hook to query database migration status from the server.
 * @param refetchInterval - Interval in ms to refetch, or false to disable polling
 * @param suspense - true to enable react suspense mode, false otherwise
 * @returns Query result with migration status (inProgress and version)
 */
export const useMigrationStatus = (
  refetchInterval: number | false = false,
  suspense = false
) => {
  const { client } = useGql();
  const sdk = getSdk(client);
  const result = useQuery(
    'migrationStatus',
    async () => {
      const result = await sdk.migrationStatus();
      return result?.migrationStatus;
    },
    {
      refetchInterval,
      suspense,
    }
  );

  return result;
};

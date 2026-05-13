import { useGql, useQuery } from '@openmsupply-client/common';
import { getSdk } from '../operations.generated';

/**
 * Hook to query database migration status from the server.
 * @param refetchInterval - Interval in ms to refetch, or 0 to disable polling
 * @returns inProgress boolean indicating if migrations are still in progress. Defaults to true while loading.
 */
export const useMigrationStatus = (
  refetchInterval: number = 0,
) => {
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

  return result.data?.inProgress ?? true;
};

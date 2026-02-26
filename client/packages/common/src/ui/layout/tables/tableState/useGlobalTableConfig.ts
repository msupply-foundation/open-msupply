import { useCallback } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import {
  PREFERENCES_QUERY_KEY,
  useAuthContext,
  useGql,
} from '@openmsupply-client/common';
import { getSdk } from '../../../../authentication/api/operations.generated';
import { ManagedTableState } from './utils';
import { usePreferences } from '../../../../authentication/api/hooks/usePreferences';

/**
 * Returns the global table config defaults for a given tableId.
 * Local user config (from localStorage) takes priority over these defaults
 * in each table state hook's useState initializer.
 */
export const useGlobalTableDefaults = (
  tableId: string
): ManagedTableState | undefined => {
  const { globalTableConfigs } = usePreferences();

  if (!globalTableConfigs) return undefined;

  const configs = globalTableConfigs as Record<string, ManagedTableState>;
  return configs[tableId];
};

/**
 * Provides a mutation to save the current table config as a global default.
 * Only used by admin users on central server.
 */
export const useSaveGlobalTableConfig = () => {
  const { client } = useGql();
  const { storeId } = useAuthContext();
  const sdk = getSdk(client);
  const queryClient = useQueryClient();
  const { globalTableConfigs } = usePreferences();

  const { mutateAsync } = useMutation(
    async ({
      tableId,
      state,
    }: {
      tableId: string;
      state: ManagedTableState;
    }) => {
      const currentConfigs =
        (globalTableConfigs as Record<string, ManagedTableState>) ?? {};
      const { [tableId]: _, ...rest } = currentConfigs;
      const isEmpty = Object.keys(state).length === 0;
      const updatedConfigs = isEmpty ? rest : { ...rest, [tableId]: state };

      const result = await sdk.saveGlobalTableConfigs({
        storeId,
        input: { globalTableConfigs: updatedConfigs },
      });
      return result;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(PREFERENCES_QUERY_KEY);
      },
    }
  );

  const saveGlobalTableConfig = useCallback(
    (tableId: string, state: ManagedTableState) =>
      mutateAsync({ tableId, state }),
    [mutateAsync]
  );

  return { saveGlobalTableConfig };
};

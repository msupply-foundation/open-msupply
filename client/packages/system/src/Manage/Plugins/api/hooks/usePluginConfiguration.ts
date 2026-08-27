import {
  FnUtils,
  pluginConfigurationQueryKey,
  useMutation,
  useQuery,
} from '@openmsupply-client/common';
import { usePluginsGraphQL } from '../usePluginsGraphQL';

// Configuration rows are stored in plugin_data with this identifier and
// store_id = NULL (global, syncs to all sites). The convention matches
// `data_identifier` used here and in the server validation.
const CONFIGURATION_IDENTIFIER = 'configuration';

export type LoadedPluginConfiguration = {
  id: string;
  data: unknown;
};

export const usePluginConfiguration = (pluginCode: string) => {
  const { pluginApi, storeId, queryClient } = usePluginsGraphQL();

  const queryKey = pluginConfigurationQueryKey(pluginCode);

  const { data, isLoading, isError } = useQuery({
    queryKey,
    // storeId is part of auth context and may be '' on first render before a
    // store is selected; the GraphQL operation requires it, so wait.
    enabled: !!storeId,
    queryFn: async (): Promise<LoadedPluginConfiguration | null> => {
      const result = await pluginApi.pluginConfiguration({
        pluginCode,
        storeId,
      });
      const node = result.pluginData.nodes.find(n => n.storeId == null);
      if (!node?.data) return node ? { id: node.id, data: null } : null;

      try {
        return { id: node.id, data: JSON.parse(node.data) };
      } catch (e) {
        // A malformed row shouldn't take down the modal — reseed from the
        // plugin's defaultConfig by returning null data. The bad row stays in
        // place so we don't overwrite it silently on save.
        console.warn(
          `pluginConfiguration: failed to parse data for ${pluginCode}`,
          e
        );
        return { id: node.id, data: null };
      }
    },
  });

  const save = useMutation({
    mutationFn: async (next: unknown) => {
      const serialised = JSON.stringify(next ?? null);
      if (data?.id) {
        await pluginApi.updatePluginConfiguration({
          storeId,
          input: {
            id: data.id,
            pluginCode,
            dataIdentifier: CONFIGURATION_IDENTIFIER,
            data: serialised,
          },
        });
      } else {
        await pluginApi.insertPluginConfiguration({
          storeId,
          input: {
            id: FnUtils.generateUUID(),
            pluginCode,
            dataIdentifier: CONFIGURATION_IDENTIFIER,
            data: serialised,
            // storeId omitted => server stores store_id = NULL => syncs to all
            // sites. Only the central server is allowed to insert/update
            // such rows; this UI is admin-only on the central server.
          },
        });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    configuration: data,
    isLoading,
    isError,
    save: save.mutateAsync,
    isSaving: save.isPending,
  };
};

import {
  pluginConfigurationQueryKey,
  useAuthContext,
  useGql,
  useQuery,
} from '@openmsupply-client/common';
import { name as pluginCode } from '../../package.json';
import { getSdk } from './operations.generated';
import {
  DEFAULT_EXAMPLE_PLUGIN_CONFIG,
  ExamplePluginConfig,
} from './types';

// Reads this plugin's configuration row (the global one written from
// Manage > Plugins). Falls back to the bundled defaults when no row exists.
//
// Cache shape (`{ id, data } | null`) MUST match the host's hook in
// `system/Manage/Plugins/api/hooks/usePluginConfiguration.ts` because both
// use the same query key — without that, whichever observer ran last would
// poison the cache for the other. `select` projects the shared cache shape
// down to the typed config the consumer wants.
type CachedConfiguration = { id: string; data: unknown } | null;

export const usePluginConfiguration = (): ExamplePluginConfig => {
  const { client } = useGql();
  const { storeId } = useAuthContext();
  const sdk = getSdk(client);

  const { data } = useQuery<
    CachedConfiguration,
    Error,
    ExamplePluginConfig
  >({
    queryKey: pluginConfigurationQueryKey(pluginCode),
    queryFn: async (): Promise<CachedConfiguration> => {
      const result = await sdk.examplePluginConfiguration({
        pluginCode,
        storeId,
      });
      if (result.pluginData.__typename !== 'PluginDataConnector') return null;
      const node = result.pluginData.nodes.find(n => n.storeId == null);
      if (!node) return null;
      let parsed: unknown = null;
      try {
        parsed = node.data ? JSON.parse(node.data) : null;
      } catch {
        parsed = null;
      }
      return { id: node.id, data: parsed };
    },
    select: cached => ({
      ...DEFAULT_EXAMPLE_PLUGIN_CONFIG,
      ...((cached?.data ?? {}) as Partial<ExamplePluginConfig>),
    }),
  });

  return data ?? DEFAULT_EXAMPLE_PLUGIN_CONFIG;
};

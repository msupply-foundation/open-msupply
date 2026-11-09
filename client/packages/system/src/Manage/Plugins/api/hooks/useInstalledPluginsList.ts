import { useQuery, LIST_KEY, useMutation } from '@openmsupply-client/common';
import { INSTALLED_PLUGINS } from './keys';
import { usePluginsGraphQL } from '../usePluginsGraphQL';
import { InstallUploadedPluginMutationVariables } from '../operations.generated';

export const useInstalledPlugins = () => {
  const { data, isError, isFetching } = useGetList();

  const { mutateAsync: installMutation, isPending: installLoading } =
    useInstallUploadedPlugin();
  const previewUploadedPlugin = usePreviewUploadedPlugin();

  const { mutateAsync: uninstallMutation, isPending: uninstallLoading } =
    useUninstallPlugin();

  return {
    query: { data, isFetching, isError },
    install: { installMutation, installLoading, previewUploadedPlugin },
    uninstall: { uninstallMutation, uninstallLoading },
  };
};

const useGetList = () => {
  const { pluginApi } = usePluginsGraphQL();

  const queryKey = [INSTALLED_PLUGINS, LIST_KEY];

  return useQuery({
    queryKey,
    queryFn: async () => {
      const query = await pluginApi.installedPlugins();
      const result = query?.centralServer?.plugin?.installedPlugins;
      return {
        nodes: result.nodes,
        totalCount: result.totalCount,
      };
    },
  });
};

const useInstallUploadedPlugin = () => {
  const { pluginApi, queryClient } = usePluginsGraphQL();

  // Beside the file id, a form plugin's installer choices: the program for
  // each program key, the entries to take over and the types whose form may
  // go blank on this (old) client (plugin-management contract › install).
  const mutationFn = async (
    variables: InstallUploadedPluginMutationVariables
  ) => {
    const result = await pluginApi.installUploadedPlugin(variables);
    return result?.centralServer?.plugins?.installUploadedPlugin;
  };

  return useMutation({
    mutationFn,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [INSTALLED_PLUGINS] }),
  });
};

// The read before an install (plugin-management contract › preview): what a
// bundle's form plugins need chosen on this server. Writes nothing. Not a
// react-query query: it is made once per upload, on the way to the install.
const usePreviewUploadedPlugin = () => {
  const { pluginApi } = usePluginsGraphQL();

  return async (fileId: string) => {
    const result = await pluginApi.uploadedPluginInfo({ fileId });
    return result?.centralServer?.plugin?.uploadedPluginInfo;
  };
};

const useUninstallPlugin = () => {
  const { pluginApi, queryClient } = usePluginsGraphQL();

  const mutationFn = async (id: string) => {
    const result = await pluginApi.uninstallPlugin({ id });
    return result?.centralServer?.plugins?.uninstallPlugin;
  };

  return useMutation({
    mutationFn,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [INSTALLED_PLUGINS] }),
  });
};

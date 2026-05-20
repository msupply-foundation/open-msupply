import { useQuery, LIST_KEY, useMutation } from '@openmsupply-client/common';
import { INSTALLED_PLUGINS } from './keys';
import { usePluginsGraphQL } from '../usePluginsGraphQL';

export const useInstalledPlugins = () => {
  const { data, isError, isFetching } = useGetList();

  const { mutateAsync: installMutation, isPending: installLoading } =
    useInstallUploadedPlugin();

  return {
    query: { data, isFetching, isError },
    install: { installMutation, installLoading },
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

  const mutationFn = async (fileId: string) => {
    const result = await pluginApi.installUploadedPlugin({ fileId });
    return result?.centralServer?.plugins?.installUploadedPlugin;
  };

  return useMutation({
    mutationFn,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [INSTALLED_PLUGINS] }),
  });
};

import {
  useQuery,
  useTranslation,
  useNotification,
  LIST_KEY,
  useMutation,
} from '@openmsupply-client/common';
import { INSTALLED_PLUGINS } from './keys';
import { usePluginsGraphQL } from '../usePluginsGraphQL';

export const useInstalledPlugins = () => {
  const { data, isError, isFetching } = useGetList();

  const {
    mutateAsync: installMutation,
    isLoading: installLoading,
    error: installError,
  } = useInstallUploadedPlugin();

  return {
    query: { data, isFetching, isError },
    install: { installMutation, installLoading, installError },
  };
};

const useGetList = () => {
  const { pluginApi } = usePluginsGraphQL();
  const { error } = useNotification();
  const t = useTranslation();

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
    onError: (e: Error) => {
      error(`${t('error.unable-to-load-plugins')}: ${e.message}`)();
    },
    keepPreviousData: true,
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
    onSuccess: () => queryClient.invalidateQueries([INSTALLED_PLUGINS]),
  });
};

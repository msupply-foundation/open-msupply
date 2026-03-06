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
  const t = useTranslation();
  const { pluginApi, storeId } = usePluginsGraphQL();
  const { error } = useNotification();

  const queryKey = [INSTALLED_PLUGINS, storeId, LIST_KEY];

  const queryFn = async () => {
    try {
      const query = await pluginApi.installedPlugins();
      const result = query?.centralServer?.plugin?.installedPlugins;
      if (result) {
        return {
          nodes: result.nodes,
          totalCount: result.totalCount,
        };
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      error(`${t('error.unable-to-load-plugins')}: ${message}`)();
      console.error(e);
    }
  };

  return useQuery({
    queryKey,
    queryFn,
    onError: (e: Error) => {
      if (/HasPermission\(ConfigurePlugin\)/.test(e.message)) return null;
      return [];
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

  const mutation = useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries([INSTALLED_PLUGINS]),
    onError: e => console.error(e),
  });

  return mutation;
};

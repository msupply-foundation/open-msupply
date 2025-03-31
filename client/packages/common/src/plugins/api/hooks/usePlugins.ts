import { useQuery } from 'react-query';
import { usePluginsGraphQL } from '../usePluginsGraphQL';

export const usePlugins = () => {
  const { pluginApi } = usePluginsGraphQL();

  const queryFn = async () => {
    const query = await pluginApi.frontendPluginMetadata();
    return query?.frontendPluginMetadata || [];
  };

  const query = useQuery({
    queryKey: [],
    queryFn,
  });

  return query;
};

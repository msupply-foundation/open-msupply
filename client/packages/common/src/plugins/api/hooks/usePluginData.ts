import { useMutation, useQuery } from 'react-query';
import { usePluginsGraphQL } from '../usePluginsGraphQL';
import { InsertPluginDataInput, PluginDataFilterInput } from '@common/types';

export const usePluginData = (
  pluginCode: string,
  filter: PluginDataFilterInput
) => {
  //   const { pluginApi, storeId } = usePluginsGraphQL();

  // QUERY
  const { data, isLoading, isError } = useGetPluginData(pluginCode, filter);

  // INSERT
  const {
    mutateAsync: createMutation,
    isLoading: isCreating,
    error: createError,
  } = useInsertPluginData({ data, pluginCode });

  return {
    query: { data, loading: isLoading, error: isError },
  };
};

const useGetPluginData = (
  pluginCode: string,
  filter: PluginDataFilterInput
) => {
  const { pluginApi, storeId } = usePluginsGraphQL();

  const queryFn = async () => {
    const result = await pluginApi.pluginData({ pluginCode, storeId, filter });
    const { pluginData } = result;

    if (pluginData?.__typename === 'PluginDataConnector') {
      return pluginData.nodes;
    }
    return undefined;
  };

  const query = useQuery({
    queryKey: [],
    queryFn,
  });

  return query;
};

export type PluginDataInput = {
  id: string;
  data: string;
  relatedRecordId: string;
  pluginCode: string;
  dataIdentifier: string;
};

const useInsertPluginData = () => {
  const { pluginApi, storeId, queryClient } = usePluginsGraphQL();

  const mutationFn = async (input: PluginDataInput): Promise<string> => {
    const {
      id = '',
      data,
      dataIdentifier,
      pluginCode,
      relatedRecordId,
    } = input;
    const result =
      (await pluginApi.insertPluginData({
        storeId,
        id,
        data,
        dataIdentifier,
        pluginCode,
        relatedRecordId,
      })) || {};

    const { insertPluginData } = result;

    if (insertPluginData?.__typename === 'PluginDataNode') {
      return insertPluginData.id;
    }

    throw new Error('Could not insert invoice');
  };

  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries([]),
  });
};

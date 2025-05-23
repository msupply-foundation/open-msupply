import {
  FnUtils,
  InsertPluginDataInput,
  PluginDataFilterInput,
  UpdatePluginDataInput,
  useMutation,
  useQuery,
} from '@openmsupply-client/common';
import { usePluginDataGraphQL } from '../usePluginGraphQL';
import { PLUGIN_DATA } from './keys';

type PluginDataProps = { pluginCode: string; filter?: PluginDataFilterInput };

export const usePluginData = ({ pluginCode, filter }: PluginDataProps) => {
  const { pluginDataApi, storeId, queryClient } = usePluginDataGraphQL();

  // Fetch pluginData rows matching filter
  const queryListFn = async () => {
    const result = await pluginDataApi.pluginData({
      pluginCode,
      storeId,
      filter,
    });

    return result.pluginData;
  };

  const { data, isError, isLoading } = useQuery({
    queryKey: [PLUGIN_DATA, storeId, pluginCode],
    queryFn: queryListFn,
  });

  // INSERT
  const insertMutation = async (
    input: Omit<InsertPluginDataInput, 'pluginCode' | 'storeId' | 'id'>
  ) => {
    const result = await pluginDataApi.insertPluginData({
      storeId,
      input: {
        storeId,
        ...input,
        id: FnUtils.generateUUID(),
        pluginCode,
      },
    });

    const { insertPluginData } = result;

    if (insertPluginData?.__typename === 'PluginDataNode')
      return result.insertPluginData;
  };

  const {
    mutateAsync: create,
    isLoading: isCreating,
    isError: createError,
  } = useMutation({
    mutationFn: insertMutation,
    onSuccess: () => {
      queryClient.invalidateQueries([PLUGIN_DATA, storeId, pluginCode]);
    },
  });

  // UPDATE
  const updateMutation = async (
    input: Omit<UpdatePluginDataInput, 'pluginCode' | 'storeId'>
  ) => {
    const result = await pluginDataApi.updatePluginData({
      storeId,
      input: { storeId, ...input, pluginCode },
    });

    const { updatePluginData } = result;

    if (updatePluginData?.__typename === 'PluginDataNode')
      return result.updatePluginData;
  };

  const {
    mutateAsync: update,
    isLoading: isUpdating,
    isError: updateError,
  } = useMutation({
    mutationFn: updateMutation,
    onSuccess: () => {
      queryClient.invalidateQueries([PLUGIN_DATA, storeId, pluginCode]);
    },
  });

  return {
    query: { data: data?.nodes, isError, isLoading },
    create: { create, isCreating, createError },
    update: { update, isUpdating, updateError },
  };
};

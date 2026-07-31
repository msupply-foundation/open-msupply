import {
  useQuery,
  useMutation,
  CustomFieldNodeDisplayMode,
} from '@openmsupply-client/common';
import { CustomFieldConfigRowFragment } from '../operations.generated';
import { useCustomFieldGraphQL } from '../useCustomFieldGraphQL';
import { CUSTOM_FIELD_CONFIG } from './keys';

export type CustomFieldScopeUpdate = {
  customFieldId: string;
  displayMode: CustomFieldNodeDisplayMode;
};

export const useCustomFieldConfig = (scope: string) => {
  const {
    data,
    isFetching,
    isError,
  } = useGetConfig(scope);

  const {
    mutateAsync: updateMutation,
    isPending: isUpdating,
  } = useUpdateScopes();

  const update = async (updates: CustomFieldScopeUpdate[]) =>
    updateMutation({ scope, updates });

  return {
    query: { data, isFetching, isError },
    update: { update, isUpdating },
  };
};

const useGetConfig = (scope: string) => {
  const { customFieldApi } = useCustomFieldGraphQL();
  const queryKey = [CUSTOM_FIELD_CONFIG, scope];

  const queryFn = async (): Promise<{
    nodes: CustomFieldConfigRowFragment[];
    totalCount: number;
  }> => {
    const result = await customFieldApi.customFieldScopeConfig({ scope });
    const response = result?.centralServer?.customField?.customFieldScopeConfig;
    if (response?.__typename === 'CustomFieldConnector') {
      return { nodes: response.nodes, totalCount: response.totalCount };
    }
    throw new Error('Unable to fetch custom field config');
  };

  return useQuery({ queryKey, queryFn });
};

const useUpdateScopes = () => {
  const { customFieldApi, queryClient } = useCustomFieldGraphQL();

  const mutationFn = async (input: {
    scope: string;
    updates: CustomFieldScopeUpdate[];
  }) => {
    const result = await customFieldApi.updateCustomFieldScopes({ input });
    return result?.centralServer?.customField?.updateScopes;
  };

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CUSTOM_FIELD_CONFIG] });
    },
    onError: e => {
      console.error(e);
    },
  });
};

import {
  JsonValue,
  useAuthContext,
  useGql,
  useMutation,
  useQuery,
} from '@openmsupply-client/common';
import { getSdk } from './operations.generated';

const useQueryMethod = <I extends JsonValue, O extends JsonValue>(
  pluginCode: string,
  input: I
): (() => Promise<O | undefined>) => {
  const { client } = useGql();
  const { storeId } = useAuthContext();
  const api = getSdk(client);

  return async () => {
    const query = await api.pluginGraphqlQuery({ pluginCode, storeId, input });
    return query?.pluginGraphqlQuery || undefined;
  };
};

export const usePluginGraphqlAsync = <I extends JsonValue, O extends JsonValue>(
  pluginCode: string,
  input: I
) => {
  const mutationFn = useQueryMethod<I, O>(pluginCode, input);

  const query = useMutation({ mutationFn });
  return { ...query, query: query.mutateAsync };
};

export const usePluginGraphql = <I extends JsonValue, O extends JsonValue>(
  cacheKey: string,
  pluginCode: string,
  input: I
) => {
  const queryFn = useQueryMethod<I, O>(pluginCode, input);

  return useQuery(cacheKey, queryFn);
};

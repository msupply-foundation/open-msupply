import { useGql, useMutation } from '@openmsupply-client/common';
import { getSdk } from './operations.generated';

export const usePlugins = () => {
  const { client } = useGql();
  const api = getSdk(client);

  const mutationFn = async () => {
    const query = await api.frontendPluginMetadata();
    return query?.frontendPluginMetadata || [];
  };

  console.log('yow');

  const query = useMutation({ mutationFn });
  return { ...query, query: query.mutateAsync };
};

import { useAuthContext, useGql } from '@openmsupply-client/common';
import { getDocumentRegistryQueries } from '../../api';
import { getSdk } from '../../operations.generated';

export const useDocumentRegistryApi = () => {
  const { storeId } = useAuthContext();
  const keys = {
    detail: (name: string) => [name] as const,
    programRegistries: (programs: string[]) =>
      ['program-registries', storeId, ...programs] as const,
  };
  const { client } = useGql();
  const queries = getDocumentRegistryQueries(getSdk(client));

  return { ...queries, keys };
};

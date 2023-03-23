import {
  DocumentRegistryNode,
  SortBy,
  useAuthContext,
  useGql,
} from '@openmsupply-client/common';
import { DocumentRegistryParams, getDocumentRegistryQueries } from '../../api';
import { getSdk } from '../../operations.generated';

export const useDocumentRegistryApi = () => {
  const { storeId } = useAuthContext();
  const keys = {
    base: () => ['patient', storeId] as const,
    byDocContext: (name: string) =>
      [...keys.base(), 'docContext', name] as const,
    byDocType: (type: string) => [...keys.base(), 'docType', type] as const,
    documentRegistries: (params: DocumentRegistryParams) =>
      [...keys.base(), 'documentRegistries', params] as const,
    programRegistries: (sort?: SortBy<DocumentRegistryNode>) =>
      [...keys.base(), 'programRegistries', sort] as const,
    registriesByParents: (programs: string[]) =>
      [...keys.base(), 'registriesByParents', ...programs] as const,
  };
  const { client } = useGql();
  const queries = getDocumentRegistryQueries(getSdk(client));

  return { ...queries, keys };
};

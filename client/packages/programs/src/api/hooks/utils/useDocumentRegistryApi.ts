import {
  DocumentRegistryNode,
  FilterBy,
  SortBy,
  useAuthContext,
  useGql,
} from '@openmsupply-client/common';
import { getDocumentRegistryQueries } from '../../api';
import { DocumentRegistryFragment, getSdk } from '../../operations.generated';

export const useDocumentRegistryApi = () => {
  const { storeId } = useAuthContext();
  const keys = {
    base: () => ['patient', storeId] as const,
    byDocContext: (name: string) =>
      [...keys.base(), 'docContext', name] as const,
    byDocType: (type: string) => [...keys.base(), 'docType', type] as const,
    documentRegistries: (
      sortBy: SortBy<DocumentRegistryFragment>,
      filterBy?: FilterBy
    ) => [...keys.base(), sortBy, filterBy] as const,
    programRegistries: (sort?: SortBy<DocumentRegistryNode>) =>
      [...keys.base(), 'programRegistries', sort] as const,
    registriesByParents: (programs: string[]) =>
      [...keys.base(), 'registriesByParents', ...programs] as const,
  };
  const { client } = useGql();
  const queries = getDocumentRegistryQueries(getSdk(client));

  return { ...queries, keys };
};

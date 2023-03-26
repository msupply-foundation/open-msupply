import { FilterBy, SortBy, useQuery } from '@openmsupply-client/common';
import { DocumentRegistryFragment } from '../../operations.generated';
import { useDocumentRegistryApi } from '../utils/useDocumentRegistryApi';

export const useDocumentRegistries = (
  sortBy: SortBy<DocumentRegistryFragment>,
  filterBy?: FilterBy
) => {
  const api = useDocumentRegistryApi();
  return {
    ...useQuery(api.keys.documentRegistries(sortBy, filterBy), () =>
      api.get.documentRegistries({ sortBy, filterBy })
    ),
  };
};

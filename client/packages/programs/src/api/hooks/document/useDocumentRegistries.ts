import {
  DocumentRegistrySortFieldInput,
  useQuery,
} from '@openmsupply-client/common';
import { DocumentRegistryParams } from '../../api';

import { useDocumentRegistryApi } from '../utils/useDocumentRegistryApi';

export const useDocumentRegistries = (params?: DocumentRegistryParams) => {
  const api = useDocumentRegistryApi();
  const queryParams: DocumentRegistryParams = params ?? {
    sortBy: { key: DocumentRegistrySortFieldInput.Type, direction: 'asc' },
  };

  return useQuery(api.keys.documentRegistries(queryParams), () =>
    api.get.documentRegistries(queryParams)
  );
};

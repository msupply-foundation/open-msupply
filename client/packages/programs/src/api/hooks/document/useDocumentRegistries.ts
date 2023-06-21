import {
  DocumentRegistrySortFieldInput,
  useQuery,
} from '@openmsupply-client/common';
import { DocumentRegistryParams } from '../../api';

import { useDocumentRegistryApi } from '../utils/useDocumentRegistryApi';

export const useDocumentRegistries = () => {
  const api = useDocumentRegistryApi();
  const params: DocumentRegistryParams = {
    sortBy: { key: DocumentRegistrySortFieldInput.Type, direction: 'asc' },
  };

  return useQuery(api.keys.documentRegistries(params), () =>
    api.get.documentRegistries(params)
  );
};

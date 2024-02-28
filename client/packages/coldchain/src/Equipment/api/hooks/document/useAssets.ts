import { useQuery, useUrlQueryParams } from '@openmsupply-client/common';
import { useAssetApi } from '../utils/useAssetApi';

export const useAssets = () => {
  const { queryParams } = useUrlQueryParams({
    filters: [
      { key: 'name' },
      { key: 'model' },
      { key: 'code' },
      { key: 'installationDate' },
      { key: 'replacementDate' },
      { key: 'serialNumber' },
      { key: 'categoryId' },
      { key: 'typeId' },
    ],
  });
  const api = useAssetApi();
  return useQuery(api.keys.paramList(queryParams), () =>
    api.get.list(queryParams)
  );
};

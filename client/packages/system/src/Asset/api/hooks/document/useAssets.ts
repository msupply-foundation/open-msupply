import { useQuery, useUrlQueryParams } from '@openmsupply-client/common';
import { useAssetApi } from '../utils/useAssetApi';

export const useAssets = () => {
  const { queryParams } = useUrlQueryParams({
    filters: [
      { key: 'manufacturer' },
      { key: 'model' },
      { key: 'category' },
      { key: 'class' },
      { key: 'type' },
    ],
  });
  const api = useAssetApi();
  return useQuery(api.keys.paramList(queryParams), () =>
    api.get.list(queryParams)
  );
};

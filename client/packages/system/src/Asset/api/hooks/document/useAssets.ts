import { useQuery, useUrlQueryParams } from '@openmsupply-client/common';
import { useAssetApi } from '../utils/useAssetApi';

export const useAssets = () => {
  const { queryParams } = useUrlQueryParams({
    filters: [{ key: 'codeOrName' }],
  });
  const api = useAssetApi();
  return useQuery(api.keys.paramList(queryParams), () =>
    api.get.list(queryParams)
  );
};

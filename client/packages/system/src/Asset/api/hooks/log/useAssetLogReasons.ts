import { useQuery, useUrlQueryParams } from '@openmsupply-client/common';
import { useAssetApi } from '../utils/useAssetApi';

export const useAssetLogReasons = (storeId?: string | undefined) => {
  const { queryParams } = useUrlQueryParams({
    filters: [
      { key: 'id' },
      { key: 'assetLogStatus', condition: 'equalTo' },
      { key: 'reason' },
    ],
  });

  const id = storeId ?? '';
  const api = useAssetApi();
  return useQuery(api.keys.logReasons(queryParams), () =>
    api.get.logReasons(id, queryParams.filterBy ?? undefined)
  );
};

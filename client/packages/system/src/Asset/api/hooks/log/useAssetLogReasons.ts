import {
  FilterByWithBoolean,
  useQuery,
  useUrlQueryParams,
} from '@openmsupply-client/common';
import { useAssetApi } from '../utils/useAssetApi';

export const useAssetLogReasons = (filter?: FilterByWithBoolean) => {
  const { queryParams } = useUrlQueryParams({
    filters: [
      { key: 'id' },
      { key: 'assetLogStatus', condition: 'equalTo' },
      { key: 'reason' },
    ],
  });

  const filterBy = filter ?? queryParams.filterBy ?? undefined;
  const api = useAssetApi();

  return useQuery(api.keys.logReasonsList({ ...queryParams, filterBy }), () =>
    api.get.logReasons(filterBy)
  );
};

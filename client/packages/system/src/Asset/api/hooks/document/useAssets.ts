import { useQuery, useUrlQueryParams } from '@openmsupply-client/common';
import { useAssetApi } from '../utils/useAssetApi';

export const useAssets = () => {
  const { queryParams } = useUrlQueryParams({
    filters: [
      { key: 'code' },
      { key: 'manufacturer' },
      { key: 'model' },
      { key: 'categoryId', condition: 'equalTo' },
      // { key: 'classId', condition: 'equalTo' },
      { key: 'typeId', condition: 'equalTo' },
    ],
  });
  const api = useAssetApi();

  return useQuery(api.keys.paramList(queryParams), () =>
    api.get.list(queryParams)
  );
};

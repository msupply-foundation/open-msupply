import { useQuery, useUrlQueryParams } from '@openmsupply-client/common';
import { useAssetApi } from '../utils/useAssetApi';

export const useAssets = (categoryId?: string) => {
  const { queryParams } = useUrlQueryParams({
    filters: [
      { key: 'code' },
      { key: 'manufacturer' },
      { key: 'model' },
      { key: 'categoryId', condition: 'equalTo' },
      // { key: 'classId', condition: 'equalTo' },
      { key: 'typeId', condition: 'equalTo' },
      { key: 'subCatalogue' },
    ],
  });
  const api = useAssetApi();
  const filterBy =
    categoryId === undefined
      ? queryParams.filterBy
      : { ...queryParams.filterBy, categoryId: { equalTo: categoryId } };

  const params = { ...queryParams, filterBy };

  return useQuery(api.keys.paramList(params), () => api.get.list(params));
};

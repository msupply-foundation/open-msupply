import { useQuery, useUrlQueryParams } from '@openmsupply-client/common';
import { useAssetApi } from '../utils/useAssetApi';

export const useAssets = () => {
  const { queryParams } = useUrlQueryParams({
    filters: [
      { key: 'notes' },
      { key: 'model' },
      { key: 'assetNumber' },
      { key: 'installationDate', condition: 'equalTo' },
      { key: 'replacementDate', condition: 'equalTo' },
      { key: 'serialNumber' },
      { key: 'categoryId', condition: 'equalTo' },
      { key: 'typeId', condition: 'equalTo' },
      { key: 'isNonCatalogue', condition: '=' },
      { key: 'store' },
    ],
  });
  const api = useAssetApi();
  return useQuery(api.keys.paramList(queryParams), () =>
    api.get.list(queryParams)
  );
};

import {
  useAuthContext,
  useCentralServerCallback,
  usePathnameIncludes,
  useQuery,
  useUrlQueryParams,
} from '@openmsupply-client/common';
import { useAssetApi } from '../utils/useAssetApi';

export const useAssets = () => {
  const isColdChain = usePathnameIncludes('cold-chain');
  const { store } = useAuthContext();
  const isCentralServer = useCentralServerCallback();

  const { queryParams } = useUrlQueryParams({
    filters: [
      { key: 'notes' },
      { key: 'model' },
      { key: 'assetNumber' },
      { key: 'installationDate', condition: 'between' },
      { key: 'replacementDate', condition: 'between' },
      { key: 'serialNumber' },
      { key: 'categoryId', condition: 'equalTo' },
      { key: 'typeId', condition: 'equalTo' },
      { key: 'isNonCatalogue', condition: '=' },
      { key: 'storeCodeOrName' },
      { key: 'functionalStatus', condition: 'equalTo' },
    ],
  });

  const storeCodeFilter = isCentralServer ? undefined : store?.code;

  const api = useAssetApi();
  return useQuery(
    api.keys.paramList(queryParams),
    () => api.get.list(queryParams, storeCodeFilter, isColdChain),
    { keepPreviousData: true }
  );
};

import {
  useAuthContext,
  useCentralServerCallback,
  usePathnameIncludes,
  useQuery,
  keepPreviousData,
  useUrlQueryParams,
} from '@openmsupply-client/common';
import { useAssetApi } from '../utils/useAssetApi';

// The filter keys this register reads off the URL. Shared with the export
// (useAssetsAll): a key missing from one of them is a filter the file silently
// ignores.
export const ASSET_LIST_FILTERS = [
  { key: 'notes' },
  { key: 'model' },
  { key: 'assetNumber' },
  { key: 'installationDate', condition: 'equalTo' },
  { key: 'replacementDate', condition: 'equalTo' },
  { key: 'serialNumber' },
  { key: 'categoryId', condition: 'equalTo' },
  { key: 'typeId', condition: 'equalTo' },
  { key: 'isNonCatalogue', condition: '=' },
  { key: 'storeCodeOrName' },
  { key: 'functionalStatus', condition: 'equalTo' },
];

export const useAssets = () => {
  // Which destination is mounted, and whose equipment it therefore shows. The
  // LIST's concern only — the export covers every store (useAssetsAll).
  const isColdChain = usePathnameIncludes('cold-chain');
  const { store } = useAuthContext();
  const isCentralServer = useCentralServerCallback();
  const storeCode = isCentralServer ? undefined : store?.code;

  const { queryParams } = useUrlQueryParams({
    filters: ASSET_LIST_FILTERS,
  });

  const api = useAssetApi();
  return useQuery({
    queryKey: api.keys.paramList(queryParams),
    queryFn: () => api.get.list(queryParams, storeCode, isColdChain),
    placeholderData: keepPreviousData,
  });
};

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
  // ⚠️ Always truthy: this hook returns an OBJECT of callbacks
  // ({ executeIfCentralOrShowWarning }), not a boolean — so `storeCode` is
  // always undefined and the store restriction below is never sent, on any
  // site. `useIsCentralServerApi()` is the boolean one. Captured as current
  // behaviour in the new front end's spec (api.ts § assetListFilter explains
  // why it is left standing); making it fire is a product decision.
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

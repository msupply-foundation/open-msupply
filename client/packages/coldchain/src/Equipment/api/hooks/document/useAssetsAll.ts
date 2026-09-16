import { useMutation, useUrlQueryParams } from '@openmsupply-client/common';
import { useAssetApi } from '../utils/useAssetApi';
import { ASSET_LIST_FILTERS, useAssetListScope } from './useAssets';

// The CSV/Excel export. It reads the SAME url filters and the same destination
// scope as the list, so the file holds the rows on screen rather than every
// cold chain asset the server has.
export const useAssetsAll = () => {
  const { isColdChain, storeCode } = useAssetListScope();
  const { queryParams } = useUrlQueryParams({ filters: ASSET_LIST_FILTERS });
  const api = useAssetApi();
  const result = useMutation({
    mutationFn: () => api.get.listAll(queryParams, storeCode, isColdChain),
  });

  return {
    ...result,
    fetchAsync: result.mutateAsync,
  };
};

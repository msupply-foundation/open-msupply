import { useMutation, useUrlQueryParams } from '@openmsupply-client/common';
import { useAssetApi } from '../utils/useAssetApi';
import { ASSET_LIST_FILTERS } from './useAssets';

// The CSV/Excel export. It reads the SAME url filters as the list, so the file
// matches the chips on screen — but deliberately NOT the destination's store
// scope: an export covers every store's equipment.
export const useAssetsAll = () => {
  const { queryParams } = useUrlQueryParams({ filters: ASSET_LIST_FILTERS });
  const api = useAssetApi();
  const result = useMutation({
    mutationFn: () => api.get.listAll(queryParams),
  });

  return {
    ...result,
    fetchAsync: result.mutateAsync,
  };
};

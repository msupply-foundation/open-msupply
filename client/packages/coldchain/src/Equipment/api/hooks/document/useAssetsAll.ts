import {
  useMutation,
  usePathnameIncludes,
  useUrlQueryParams,
} from '@openmsupply-client/common';
import { useAssetApi } from '../utils/useAssetApi';
import { ASSET_LIST_FILTERS } from './useAssets';

// The CSV/Excel export. It reads the same url filters AND the same store scope
// as the list, so the file is what the screen shows: Cold chain › Equipment
// exports the active store, Manage › Equipment exports every store (issue
// #693). The scope is a permission rule as much as a scoping one — Manage is
// gated on the asset read permission, and a register-wide export from the
// ungated screen handed a user rows they may not open.
export const useAssetsAll = () => {
  const isColdChain = usePathnameIncludes('cold-chain');
  const { queryParams } = useUrlQueryParams({ filters: ASSET_LIST_FILTERS });
  const api = useAssetApi();
  const result = useMutation({
    mutationFn: () => api.get.listAll(queryParams, isColdChain),
  });

  return {
    ...result,
    fetchAsync: result.mutateAsync,
  };
};

import { useMutation, useUrlQueryParams } from '@openmsupply-client/common';
import { useAssetApi } from '../utils/useAssetApi';

export const useAssetsAll = () => {
  const { queryParams } = useUrlQueryParams();
  const api = useAssetApi();
  const result = useMutation({
    mutationFn: () => api.get.listAll(queryParams),
  });

  return {
    ...result,
    fetchAsync: result.mutateAsync,
  };
};

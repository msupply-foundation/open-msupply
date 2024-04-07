import { useMutation, useParams } from '@openmsupply-client/common';
import { useQuery } from 'react-query';
import { useAssetApi } from '../utils/useAssetApi';

export const useAssetId = () => {
  const { id = '' } = useParams();
  return id;
};

export const useAsset = () => {
  const assetId = useAssetId();
  return useAssetById(assetId);
};

export const useAssetById = (assetId: string | undefined) => {
  const api = useAssetApi();
  return useQuery(
    api.keys.detail(assetId || ''),
    () => api.get.byId(assetId || ''),
    {
      enabled: !!assetId,
    }
  );
};

export const useFetchAssetById = () => {
  const api = useAssetApi();
  return useMutation(api.get.byId, {
    onError: () => {},
  });
};

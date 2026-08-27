import { useAsset } from './useAsset';

export const useAssetFields = () => {
  const { data } = useAsset();
  return { ...data };
};

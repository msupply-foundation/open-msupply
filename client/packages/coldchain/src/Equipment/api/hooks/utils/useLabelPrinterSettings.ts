import { useQuery } from '@openmsupply-client/common';
import { useAssetApi } from './useAssetApi';

export const useLabelPrinterSettings = () => {
  const api = useAssetApi();
  return useQuery({
    queryKey: api.keys.labelPrinterSettings(),

    queryFn: async () =>
      api.get.labelPrinterSettings()
  });
};

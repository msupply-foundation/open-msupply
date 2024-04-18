import { useQuery } from '@openmsupply-client/common';
import { useAssetApi } from './useAssetApi';

export const useLabelPrinterSettings = () => {
  const api = useAssetApi();
  return useQuery(api.keys.labelPrinterSettings(), async () =>
    api.get.labelPrinterSettings()
  );
};

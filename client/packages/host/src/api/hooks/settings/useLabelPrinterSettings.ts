import { useQuery } from '@openmsupply-client/common';
import { useHostApi } from '../utils/useHostApi';

export const useLabelPrinterSettings = () => {
  const api = useHostApi();
  return useQuery(api.keys.labelPrinterSettings(), async () =>
    api.get.labelPrinterSettings()
  );
};

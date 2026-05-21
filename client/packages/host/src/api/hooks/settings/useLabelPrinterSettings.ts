import { useQuery } from '@openmsupply-client/common';
import { useHostApi } from '../utils/useHostApi';

export const useLabelPrinterSettings = () => {
  const api = useHostApi();
  return useQuery({
    queryKey: api.keys.labelPrinterSettings(),

    queryFn: async () =>
      api.get.labelPrinterSettings()
  });
};

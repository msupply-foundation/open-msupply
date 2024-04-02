import { useMutation } from '@openmsupply-client/common';
import { useHostApi } from '../utils/useHostApi';

export const useUpdateLabelPrinterSettings = () => {
  const api = useHostApi();
  return useMutation(api.updateLabelPrinterSettings);
};

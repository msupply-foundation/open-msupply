import { useMutation } from '@openmsupply-client/common';
import { useOutboundApi } from './../utils/useOutboundApi';

export const useBarcodes = () => {
  const api = useOutboundApi();

  return useMutation(api.get.barcodesByValue);
};

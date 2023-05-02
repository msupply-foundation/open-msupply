import { useMutation } from '@openmsupply-client/common';
import { useOutboundApi } from './../utils/useOutboundApi';

export const useBarcode = () => {
  const api = useOutboundApi();

  return useMutation(api.get.barcodeByValue);
};

import { useMutation } from '@openmsupply-client/common';
import { useOutboundApi } from './../utils/useOutboundApi';

export const useBarcodeInsert = () => {
  const api = useOutboundApi();

  return useMutation(api.insert.barcode);
};

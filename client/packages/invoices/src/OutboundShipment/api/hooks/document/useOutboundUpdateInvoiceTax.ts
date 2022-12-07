import { useOutboundApi } from './../utils/useOutboundApi';
import { useMutation, useQueryClient } from '@openmsupply-client/common';
import { useCallback } from 'react';
import { useOutbound } from './useOutbound';

export const useOutboundUpdateInvoiceTax = () => {
  const queryClient = useQueryClient();
  const api = useOutboundApi();
  const { data } = useOutbound();

  const { mutateAsync, ...mutateState } = useMutation(api.update, {
    onSuccess: () => {
      queryClient.invalidateQueries(api.keys.base());
    },
  });

  const updateInvoiceTax = useCallback(
    (tax: number) =>
      mutateAsync({
        id: data?.id ?? '',
        taxPercentage: tax,
      }),
    [mutateAsync]
  );

  return { ...mutateState, updateInvoiceTax };
};

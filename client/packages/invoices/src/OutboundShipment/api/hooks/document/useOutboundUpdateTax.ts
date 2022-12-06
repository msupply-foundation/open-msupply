import { useCallback } from 'react';
import {
  InvoiceLineNodeType,
  useMutation,
  useQueryClient,
} from '@openmsupply-client/common';
import { useOutboundFields } from './useOutboundFields';
import { useOutboundApi } from './../utils/useOutboundApi';

export const useUpdateOutboundTax = () => {
  const queryClient = useQueryClient();
  const api = useOutboundApi();
  const { lines } = useOutboundFields('lines');
  const { mutateAsync, ...mutateState } = useMutation(api.updateTax, {
    onSuccess: () => {
      queryClient.invalidateQueries(api.keys.base());
    },
  });

  // Will need to implement this back when invoice line tax has been decided
  const updateServiceLineTax = useCallback(
    (tax: number) =>
      mutateAsync({
        tax,
        lines: lines.nodes ?? [],
        type: InvoiceLineNodeType.Service,
      }),
    [lines.nodes, mutateAsync]
  );

  const updateStockLineTax = useCallback(
    (tax: number) =>
      mutateAsync({
        tax,
        lines: lines.nodes ?? [],
        type: InvoiceLineNodeType.StockOut,
      }),
    [lines.nodes, mutateAsync]
  );

  return { ...mutateState, updateStockLineTax, updateServiceLineTax };
};

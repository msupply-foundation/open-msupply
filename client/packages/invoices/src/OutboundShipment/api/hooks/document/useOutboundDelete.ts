import { OutboundRowFragment } from './../../operations.generated';
import { useOutboundApi } from './../utils/useOutboundApi';
import {
  useQueryClient,
  // useTranslation,
  useMutation,
  useTableStore,
  useDeleteConfirmation,
} from '@openmsupply-client/common';
import { useOutbounds } from './useOutbounds';
import { canDeleteInvoice } from '../../../../utils';

export const useOutboundDelete = () => {
  const queryClient = useQueryClient();
  const { data: rows } = useOutbounds();
  const api = useOutboundApi();
  const { mutate } = useMutation(api.delete);
  // const t = useTranslation('replenishment');

  const { selectedRows } = useTableStore(state => ({
    selectedRows: Object.keys(state.rowState)
      .filter(id => state.rowState[id]?.isSelected)
      .map(selectedId => rows?.nodes?.find(({ id }) => selectedId === id))
      .filter(Boolean) as OutboundRowFragment[],
  }));

  const deleteAction = () => {
    mutate(selectedRows, {
      onSuccess: () => queryClient.invalidateQueries(api.keys.base()),
    });
  };

  const confirmAndDelete = useDeleteConfirmation({
    selectedRows,
    deleteAction,
    confirmMessage: 'This will delete...',
    canDelete: canDeleteInvoice,
  });

  return confirmAndDelete;
};

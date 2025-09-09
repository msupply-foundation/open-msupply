import { OutboundRowFragment } from '../../operations.generated';
import { useOutboundApi } from '../utils/useOutboundApi';
import {
  useQueryClient,
  useTranslation,
  useMutation,
  useTableStore,
  useDeleteConfirmation,
  useUrlQueryParams,
  useFeatureFlags,
} from '@openmsupply-client/common';
import { useOutbounds } from './useOutbounds';
import { canDeleteInvoice } from '../../../../utils';

export const useOutboundDeleteRows = (
  rowsToDelete: OutboundRowFragment[],
  resetRowSelection: () => void
) => {
  const { tableUsabilityImprovements } = useFeatureFlags();

  const t = useTranslation();
  const queryClient = useQueryClient();
  const api = useOutboundApi();
  const { queryParams } = useUrlQueryParams({
    initialSort: { key: 'createdDatetime', dir: 'desc' },
  });
  const { data: rows } = useOutbounds(queryParams);
  const { mutateAsync } = useMutation(api.delete);

  const { selectedRows } = useTableStore(state => ({
    selectedRows: Object.keys(state.rowState)
      .filter(id => state.rowState[id]?.isSelected)
      .map(selectedId => rows?.nodes?.find(({ id }) => selectedId === id))
      .filter(Boolean) as OutboundRowFragment[],
  }));

  const actualRowsToDelete = tableUsabilityImprovements
    ? rowsToDelete
    : selectedRows;

  const deleteAction = async () => {
    await mutateAsync(actualRowsToDelete)
      .then(() => {
        resetRowSelection();
        queryClient.invalidateQueries(api.keys.base());
      })
      .catch(err => {
        throw err;
      });
  };

  const confirmAndDelete = useDeleteConfirmation({
    selectedRows: actualRowsToDelete,
    deleteAction,
    canDelete: actualRowsToDelete.every(canDeleteInvoice),
    messages: {
      confirmMessage: t('messages.confirm-delete-shipments', {
        count: actualRowsToDelete.length,
      }),
      deleteSuccess: t('messages.deleted-shipments', {
        count: actualRowsToDelete.length,
      }),
    },
  });

  return { confirmAndDelete, selectedRows };
};

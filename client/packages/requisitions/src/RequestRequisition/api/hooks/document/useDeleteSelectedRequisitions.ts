import {
  useTranslation,
  useNotification,
  useTableStore,
  RequisitionNodeStatus,
} from '@openmsupply-client/common';
import { RequestRowFragment } from '../../operations.generated';
import { useDeleteRequests } from './useDeleteRequests';
import { useRequests } from './useRequests';

export const useDeleteSelectedRequisitions = () => {
  const { data: rows } = useRequests({ enabled: false });
  const { mutate } = useDeleteRequests();
  const t = useTranslation('replenishment');
  const { success, info } = useNotification();
  const { selectedRows } = useTableStore(state => ({
    selectedRows: Object.keys(state.rowState)
      .filter(id => state.rowState[id]?.isSelected)
      .map(selectedId => rows?.nodes?.find(({ id }) => selectedId === id))
      .filter(Boolean) as RequestRowFragment[],
  }));
  const deleteAction = () => {
    const numberSelected = selectedRows.length;
    if (selectedRows && numberSelected > 0) {
      const canDeleteRows = selectedRows.every(
        ({ status }) => status === RequisitionNodeStatus.Draft
      );
      if (!canDeleteRows) {
        const cannotDeleteSnack = info(t('messages.cant-delete-requisitions'));
        cannotDeleteSnack();
      } else {
        mutate(selectedRows);
        const deletedMessage = t('messages.deleted-requisitions', {
          count: numberSelected,
        });
        const successSnack = success(deletedMessage);
        successSnack();
      }
    } else {
      const selectRowsSnack = info(t('messages.select-rows-to-delete'));
      selectRowsSnack();
    }
  };
  return deleteAction;
};

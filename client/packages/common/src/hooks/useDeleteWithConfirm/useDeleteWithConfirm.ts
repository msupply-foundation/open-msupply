import {
  useTranslation,
  useNotification,
  useConfirmationModal,
} from '@openmsupply-client/common';

interface DeleteConfirmationProps {
  selectedRows: any[];
  deleteAction: () => void;
  confirmMessage: string | undefined;
  canDelete: (row: any) => boolean;
}

export const useDeleteConfirmation = ({
  selectedRows,
  deleteAction,
  confirmMessage,
  canDelete,
}: DeleteConfirmationProps) => {
  const t = useTranslation('replenishment');
  const { success, info } = useNotification();

  const showConfirmation = useConfirmationModal({
    onConfirm: () => {
      deleteAction();
      const deletedMessage = t('messages.deleted-invoices', {
        count: selectedRows.length,
      });
      const successSnack = success(deletedMessage);
      successSnack();
    },
    message: confirmMessage || 'Default confirmation message',
    title: t('heading.are-you-sure'),
  });

  const confirmAndDelete = () => {
    const numberSelected = selectedRows.length;
    if (selectedRows && numberSelected > 0) {
      const canDeleteRows = selectedRows.every(canDelete);
      if (!canDeleteRows) {
        const cannotDeleteSnack = info(t('messages.cant-delete-invoices'));
        cannotDeleteSnack();
      } else showConfirmation();
    } else {
      const selectRowsSnack = info(t('messages.select-rows-to-delete'));
      selectRowsSnack();
    }
  };

  return confirmAndDelete;
};

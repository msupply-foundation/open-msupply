import {
  useTranslation,
  useNotification,
  useConfirmationModal,
} from '@openmsupply-client/common';

interface DeleteConfirmationProps<T> {
  selectedRows: T[];
  deleteAction: () => Promise<void>;
  canDelete: boolean;
  messages?: {
    confirmTitle?: string;
    confirmMessage?: string;
    deleteSuccess?: string;
    cantDelete?: string;
    selectRows?: string;
  };
}

export const useDeleteConfirmation = <T>({
  selectedRows,
  deleteAction,
  canDelete,
  messages = {},
}: DeleteConfirmationProps<T>) => {
  const {
    confirmTitle,
    confirmMessage,
    deleteSuccess,
    cantDelete,
    selectRows,
  } = messages;
  const t = useTranslation('common');
  const { success, info } = useNotification();

  const showConfirmation = useConfirmationModal({
    onConfirm: async () => {
      await deleteAction()
        .then(() => {
          const deletedMessage =
            deleteSuccess ||
            t('messages.deleted-generic', {
              count: selectedRows?.length,
            });
          const successSnack = success(deletedMessage);
          successSnack();
        })
        .catch(err => console.log('ERROR', err.message));
    },
    message: confirmMessage || t('messages.confirm-delete-generic'),
    title: confirmTitle || t('heading.are-you-sure'),
  });

  const confirmAndDelete = () => {
    const numberSelected = selectedRows.length || 0;
    if (selectedRows && numberSelected > 0) {
      if (!canDelete) {
        const cannotDeleteSnack = info(
          cantDelete || t('messages.cant-delete-generic')
        );
        cannotDeleteSnack();
      } else showConfirmation();
    } else {
      const selectRowsSnack = info(
        selectRows || t('messages.select-rows-to-delete')
      );
      selectRowsSnack();
    }
  };

  return confirmAndDelete;
};

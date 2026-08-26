import {
  useTranslation,
  useNotification,
  useConfirmationModal,
} from '@openmsupply-client/common';

interface DeleteConfirmationProps<T, E> {
  selectedRows: T[];
  deleteAction: () => Promise<void>;
  canDelete?: boolean;
  messages?: {
    confirmTitle?: string;
    confirmMessage?: string;
    deleteSuccess?: string;
    /**
     * Either the error message or a function that transforms an error thrown by the deleteAction to
     * a string
     */
    cantDelete?: string | ((err: E) => string | undefined);
    selectRows?: string;
  };
}

export const useDeleteConfirmation = <T, E = Error>({
  selectedRows,
  deleteAction,
  canDelete = true,
  messages = {},
}: DeleteConfirmationProps<T, E>) => {
  const {
    confirmTitle,
    confirmMessage,
    deleteSuccess,
    cantDelete,
    selectRows,
  } = messages;
  const t = useTranslation();
  const { success, info } = useNotification();
  const cannotDeleteSnack = (err: E | undefined) => {
    if (typeof cantDelete === 'string') {
      return info(cantDelete)();
    }
    if (!cantDelete || !err) {
      return info(t('messages.cant-delete-generic'))();
    }

    return info(cantDelete(err) ?? t('messages.cant-delete-generic'))();
  };

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
        .catch(err => {
          cannotDeleteSnack(err);
          console.error(err.message);
        });
    },
    message: confirmMessage || t('messages.confirm-delete-generic'),
    title: confirmTitle || t('heading.are-you-sure'),
  });

  const confirmAndDelete = () => {
    const numberSelected = selectedRows.length || 0;
    if (selectedRows && numberSelected > 0) {
      if (!canDelete) {
        cannotDeleteSnack(undefined);
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

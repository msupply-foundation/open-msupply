import {
  useTranslation,
  useNotification,
  useConfirmationModal,
} from '@openmsupply-client/common';

interface SingleDeleteConfirmationProps {
  deleteAction: () => Promise<void>;
  messages?: {
    confirmTitle?: string;
    confirmMessage?: string;
    deleteSuccess?: string;
    cantDelete?: string;
    selectRows?: string;
  };
}

export const useSingleDeleteConfirmation = ({
  deleteAction,
  messages = {},
}: SingleDeleteConfirmationProps) => {
  const { confirmTitle, confirmMessage, deleteSuccess, cantDelete } = messages;
  const t = useTranslation();
  const { success, info } = useNotification();
  const cannotDeleteSnack = info(
    cantDelete || t('messages.cant-delete-generic')
  );

  const showConfirmation = useConfirmationModal({
    onConfirm: async () => {
      await deleteAction()
        .then(() => {
          const deletedMessage =
            deleteSuccess ||
            t('messages.deleted-generic', {
              count: 1,
            });
          const successSnack = success(deletedMessage);
          successSnack();
        })
        .catch(err => {
          cannotDeleteSnack();
          console.log(err.message);
        });
    },
    message: confirmMessage || t('messages.confirm-delete-generic'),
    title: confirmTitle || t('heading.are-you-sure'),
  });

  return showConfirmation;
};

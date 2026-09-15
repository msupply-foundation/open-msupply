import {
  useConfirmationModal,
  useNotification,
  useTranslation,
} from '@openmsupply-client/common';
import { Environment } from '@openmsupply-client/config';

interface UseDeleteDocumentProps {
  tableName: string;
  /** Fallback record id when a file doesn't carry its own. */
  recordId: string;
  invalidateQueries?: () => void;
}

/**
 * Returns a `removeFile(filename, id, recordId?)` callback (compatible with
 * `FileList`'s `removeFile` prop) that confirms, deletes the sync file via the
 * sync_files endpoint, then invalidates the relevant queries.
 */
export const useDeleteDocument = ({
  tableName,
  recordId,
  invalidateQueries = () => {},
}: UseDeleteDocumentProps) => {
  const t = useTranslation();
  const { error, success } = useNotification();

  const getConfirmation = useConfirmationModal({
    title: t('heading.are-you-sure'),
    message: t('messages.confirm-delete-document'),
  });

  const deleteFile = async (id: string, fileRecordId: string) => {
    try {
      const response = await fetch(
        `${Environment.SYNC_FILES_URL}/${tableName}/${fileRecordId}/${id}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );
      if (response.ok) {
        success(t('success'))();
        invalidateQueries();
      } else {
        error(t('error.an-error-occurred', { message: response.statusText }))();
      }
    } catch (e) {
      error(t('error.an-error-occurred', { message: (e as Error).message }))();
    }
  };

  return (_filename: string, id?: string, fileRecordId?: string) => {
    if (!id) return;
    getConfirmation({
      onConfirm: () => deleteFile(id, fileRecordId ?? recordId),
    });
  };
};

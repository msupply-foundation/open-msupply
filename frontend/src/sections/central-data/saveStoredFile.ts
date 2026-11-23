import { fileUrl } from '@/config';
import { t } from '@/intl';
import { saveDocument } from '@/platform/openDocument';

/**
 * Saves a file the server made, such as an export or an errors file, under
 * `fileName`. Returns the banner's message for a failure; nothing when it was
 * saved or the user dismissed the save picker.
 */
export const saveStoredFile = async (
  fileId: string,
  fileName: string
): Promise<string | undefined> => {
  const saved = await saveDocument(fileUrl(fileId), fileName);
  return saved.ok
    ? undefined
    : t('error.unable-to-download-file', { reason: saved.message });
};

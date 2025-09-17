import React, { useState } from 'react';
import {
  DialogButton,
  UploadFile,
  useTranslation,
  useDialog,
  useNotification,
  Box,
  CircularProgress,
} from '@openmsupply-client/common';
import { Environment } from '@openmsupply-client/config';

interface UploadDocumentModalProps {
  isOn: boolean;
  toggleOff: () => void;
  recordId: string;
  tableName: string;
}

export const UploadDocumentModal = ({
  isOn,
  toggleOff,
  recordId,
  tableName,
}: UploadDocumentModalProps) => {
  const t = useTranslation();
  // const queryClient = useQueryClient();
  const { error, success } = useNotification();
  const [isUploading, setIsUploading] = useState(false);

  const { Modal } = useDialog({
    isOpen: isOn,
    onClose: toggleOff,
  });

  const handleUpload = async (files: File[]) => {
    setIsUploading(true);

    const url = `${Environment.SYNC_FILES_URL}/${tableName}/${recordId}`;
    const formData = new FormData();
    files?.forEach(file => {
      formData.append('files', file);
    });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
        },
        credentials: 'include',
        body: formData,
      });

      if (response.ok) {
        success(t('success'))();
        // queryClient.invalidateQueries([PURCHASE_ORDER]);
        toggleOff();
      } else {
        error(t('error.an-error-occurred', { message: response.statusText }))();
      }
    } catch (e) {
      console.error(e);
      error(t('error.an-error-occurred', { message: (e as Error).message }))();
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Modal
      title={t('label.upload-document')}
      width={500}
      cancelButton={
        <DialogButton
          variant="cancel"
          onClick={toggleOff}
          disabled={isUploading}
        />
      }
    >
      {isUploading ? (
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight={200}
          gap={2}
        >
          <CircularProgress />
        </Box>
      ) : (
        <UploadFile onUpload={handleUpload} />
      )}
    </Modal>
  );
};

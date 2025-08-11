import React, { useState } from 'react';
import {
  DialogButton,
  UploadFile,
  useQueryClient,
  useTranslation,
  useDialog,
  useNotification,
  Box,
  CircularProgress,
} from '@openmsupply-client/common';
import { Environment } from '@openmsupply-client/config';
import { PURCHASE_ORDER } from '../../api/hooks/keys';

interface AddDocumentModalProps {
  isOn: boolean;
  toggleOff: () => void;
  purchaseOrderId?: string;
}

export const AddDocumentModal = ({
  isOn,
  toggleOff,
  purchaseOrderId,
}: AddDocumentModalProps) => {
  const t = useTranslation();
  const queryClient = useQueryClient();
  const { error, success } = useNotification();
  const [isUploading, setIsUploading] = useState(false);

  const { Modal } = useDialog({
    isOpen: isOn,
    onClose: toggleOff,
  });

  const handleUpload = async (files: File[]) => {
    if (!purchaseOrderId) return;

    setIsUploading(true);

    const url = `${Environment.SYNC_FILES_URL}/purchase_order/${purchaseOrderId}`;
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
        queryClient.invalidateQueries([PURCHASE_ORDER]);
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
      okButton={
        <DialogButton variant="ok" onClick={toggleOff} disabled={isUploading} />
      }
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

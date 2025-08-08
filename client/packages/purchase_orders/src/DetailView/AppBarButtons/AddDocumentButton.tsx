import React from 'react';
import { useDialog, useNotification, useToggle } from '@common/hooks';
import {
  ButtonWithIcon,
  DialogButton,
  UploadFile,
  UploadIcon,
  useQueryClient,
  useTranslation,
} from '@openmsupply-client/common';
import { Environment } from '@openmsupply-client/config';
import { PURCHASE_ORDER } from '../../api/hooks/keys';

interface AddDocumentButtonProps {
  purchaseOrderId?: string;
}

export const AddDocumentButton = ({
  purchaseOrderId,
}: AddDocumentButtonProps) => {
  const t = useTranslation();
  const { error, success } = useNotification();
  const queryClient = useQueryClient();

  const uploadDocumentController = useToggle();

  const { Modal } = useDialog({
    isOpen: uploadDocumentController.isOn,
    onClose: uploadDocumentController.toggleOff,
  });

  const handleUpload = async (files: File[]) => {
    if (!purchaseOrderId) return;

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
      } else {
        error(t('error.an-error-occurred', { message: response.statusText }))();
      }
    } catch (e) {
      console.error(e);
      error(t('error.an-error-occurred', { message: (e as Error).message }))();
    }
  };

  return (
    <>
      <ButtonWithIcon
        Icon={<UploadIcon />}
        label={t('label.upload-document')}
        onClick={uploadDocumentController.toggleOn}
      />
      <Modal
        title={t('label.upload-document')}
        okButton={
          <DialogButton
            variant="ok"
            onClick={uploadDocumentController.toggleOff}
          />
        }
        cancelButton={
          <DialogButton
            variant="cancel"
            onClick={uploadDocumentController.toggleOff}
          />
        }
      >
        <UploadFile onUpload={handleUpload} />
      </Modal>
    </>
  );
};

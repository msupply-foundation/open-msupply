import React, { useState } from 'react';
import {
  BasicTextInput,
  Box,
  CircularProgress,
  DialogButton,
  InputWithLabelRow,
  UploadFile,
  useDialog,
  useNotification,
  useTranslation,
} from '@openmsupply-client/common';
import { Environment } from '@openmsupply-client/config';
import { useHelpDocuments } from '../api';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UploadModal = ({ isOpen, onClose }: UploadModalProps) => {
  const t = useTranslation();
  const { error, success } = useNotification();
  const {
    insert: { insert },
    query: { refetch },
  } = useHelpDocuments();

  const [title, setTitle] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const { Modal } = useDialog({ isOpen, onClose });

  const handleClose = () => {
    setTitle('');
    setIsUploading(false);
    onClose();
  };

  const handleUpload = async (files: File[]) => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      error(t('error.help-document-title-required'))();
      return;
    }
    if (files.length === 0) return;

    setIsUploading(true);

    const { id, result } = await insert(trimmedTitle);
    if (result?.__typename !== 'HelpDocumentNode') {
      const description =
        result && 'error' in result ? result.error?.description : undefined;
      error(
        `${t('error.an-error-occurred', { message: description ?? '' })}`
      )();
      setIsUploading(false);
      return;
    }

    const url = `${Environment.SYNC_FILES_URL}/help_document/${id}`;
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        credentials: 'include',
        body: formData,
      });

      if (response.ok) {
        success(t('messages.help-document-uploaded'))();
        await refetch();
        handleClose();
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
      title={t('label.upload-help-document')}
      width={500}
      cancelButton={
        <DialogButton
          variant="cancel"
          onClick={handleClose}
          disabled={isUploading}
        />
      }
    >
      <Box display="flex" flexDirection="column" gap={2}>
        <InputWithLabelRow
          label={t('label.title')}
          Input={
            <BasicTextInput
              fullWidth
              value={title}
              disabled={isUploading}
              onChange={e => setTitle(e.target.value)}
            />
          }
        />
        {isUploading ? (
          <Box
            display="flex"
            alignItems="center"
            justifyContent="center"
            minHeight={200}
          >
            <CircularProgress />
          </Box>
        ) : (
          <UploadFile onUpload={handleUpload} />
        )}
      </Box>
    </Modal>
  );
};

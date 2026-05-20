import React, { useState } from 'react';
import { FileList } from '../../../../../coldchain/src/Equipment/Components';
import { Environment } from '@openmsupply-client/config';
import {
  useTranslation,
  Box,
  DialogButton,
  Typography,
  useDialog,
  useNotification,
  DetailContainer,
  UploadFile,
} from '@openmsupply-client/common';

interface PluginUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  install: (fileId: string) => Promise<unknown>;
  isInstalling: boolean;
}

export const PluginUploadModal = ({
  isOpen,
  onClose,
  install,
  isInstalling,
}: PluginUploadModalProps) => {
  const t = useTranslation();
  const [files, setFiles] = useState<File[]>([]);
  const { error, success } = useNotification();

  const { Modal } = useDialog({ isOpen, onClose, disableBackdrop: true });

  const onUpload = (newFiles: File[]) => {
    const invalidFiles = newFiles.filter(f => !f.name.endsWith('.json'));
    if (invalidFiles.length > 0) {
      error(t('error.plugin-invalid-file'))();
      return;
    }
    setFiles(newFiles);
  };

  const removeFile = (name: string) => {
    setFiles(prev => prev.filter(f => f.name !== name));
  };

  const onOk = async () => {
    if (!files.length) return;

    for (const file of files) {
      let fileId: string;
      try {
        const formData = new FormData();
        formData.append('files', file);
        const response = await fetch(Environment.REPORT_UPLOAD_URL, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
          },
          credentials: 'include',
          body: formData,
        });
        if (!response.ok) {
          throw new Error(
            `Upload failed: ${response.status} ${response.statusText}`
          );
        }
        const result = await response.json();
        fileId = result['file-id'];
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        error(`${t('error.unable-to-upload-plugin')}: ${message}`)();
        return;
      }

      try {
        await install(fileId);
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        error(`${t('error.unable-to-install-plugin')}: ${message}`)();
        return;
      }
    }
    success(t('messages.plugin-uploaded-successfully'))();
    onClose();
  };

  return (
    <Modal
      title={t('title.upload-plugin')}
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
      okButton={
        <DialogButton
          variant="ok"
          onClick={onOk}
          disabled={isInstalling || !files.length}
        />
      }
    >
      <DetailContainer>
        <Box flex={1} display="flex" alignItems="flex-end">
          <Typography>{t('messages.plugin-upload-helper')}</Typography>
        </Box>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'row',
            marginTop: 2,
            padding: 0,
            alignItems: 'center',
            height: '100%',
            width: '100%',
            justifyContent: 'center',
          }}
        >
          <UploadFile onUpload={onUpload} files={files} />
        </Box>
        <Box sx={{ display: 'flex', width: '300px' }}>
          <FileList
            assetId={'plugin-data'}
            files={files}
            padding={0.5}
            removeFile={removeFile}
          />
        </Box>
      </DetailContainer>
    </Modal>
  );
};

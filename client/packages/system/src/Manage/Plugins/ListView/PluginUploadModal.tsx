import React, { useState } from 'react';
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
}

interface UploadedFile {
  name: string;
  file: File;
}

export const PluginUploadModal = ({
  isOpen,
  onClose,
  install,
}: PluginUploadModalProps) => {
  const t = useTranslation();
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const { error, success } = useNotification();

  const { Modal } = useDialog({ isOpen, onClose, disableBackdrop: true });

  const onUpload = (files: File[]) => {
    const invalidFiles = files.filter(f => !f.name.endsWith('.json'));
    if (invalidFiles.length > 0) {
      error(t('error.plugin-invalid-file'))();
      return;
    }
    setUploadedFiles(files.map(file => ({ name: file.name, file })));
  };

  const onOk = async () => {
    if (!uploadedFiles.length) return;

    const url = `${Environment.REPORT_UPLOAD_URL}`;
    try {
      for (const { file } of uploadedFiles) {
        const formData = new FormData();
        formData.append('files', file);
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
          },
          credentials: 'include',
          body: formData,
        });
        const result = await response.json();
        await install(result['file-id']);
      }
      success(t('messages.plugin-uploaded-successfully'))();
      onClose();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      error(`${t('error.unable-to-upload-plugin')}: ${message}`)();
    }
  };

  const removeFile = (name: string) => {
    setUploadedFiles(prev => prev.filter(f => f.name !== name));
  };

  return (
    <Modal
      title={t('title.upload-plugin')}
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
      okButton={<DialogButton variant="ok" onClick={onOk} />}
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
          <UploadFile
            onUpload={onUpload}
            files={uploadedFiles.map(f => f.file)}
          />
        </Box>
        {uploadedFiles.length > 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', mt: 2 }}>
            {uploadedFiles.map(({ name }) => (
              <Box
                key={name}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: 0.5,
                }}
              >
                <Typography variant="body2">{name}</Typography>
                <Typography
                  variant="body2"
                  sx={{ cursor: 'pointer', color: 'error.main' }}
                  onClick={() => removeFile(name)}
                >
                  x
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </DetailContainer>
    </Modal>
  );
};

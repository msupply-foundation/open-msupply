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
interface ReportUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  install: (fileId: string) => Promise<string[]>;
}

export const ReportUploadModal = ({
  isOpen,
  onClose,
  install,
}: ReportUploadModalProps) => {
  const t = useTranslation();
  const [draft, setDraft] = useState<{ id?: string; files?: File[] }>({});
  const { error, success } = useNotification();

  const { Modal } = useDialog({ isOpen, onClose, disableBackdrop: true });

  const removeFile = (name: string) => {
    setDraft({ files: draft.files?.filter(file => file.name !== name) });
  };

  const onUpload = (files: File[]) => {
    if (files.filter(f => !f.name.endsWith('json')).length > 0) {
      error(t('error.report-invalid-file'))();
    } else {
      setDraft({ files });
    }
  };

  const onOk = async () => {
    if (!draft.files?.length)
      return new Promise(resolve => resolve('no files'));

    // create new json file id
    const url = `${Environment.REPORT_UPLOAD_URL}`;
    if (draft.files) {
      try {
        for (const file of draft.files) {
          const formData = new FormData();
          formData.append('files', file);
          const fileId = await fetch(url, {
            method: 'POST',
            headers: {
              Accept: 'application/json',
            },
            credentials: 'include',
            body: formData,
          });
          const id = await fileId.json();
          await install(id['file-id']);
        }
        success(t('messages.reports-uploaded-successfully'))();
        onClose();
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        error(`${t('error.unable-to-upload-reports')}: ${message}`)();
      }
    }
  };

  return (
    <Modal
      title={t('title.upload-reports')}
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
      okButton={<DialogButton variant="ok" onClick={onOk} />}
    >
      <DetailContainer>
        <Box flex={1} display="flex" alignItems="flex-end">
          <Typography>{t('messages.report-upload-helper')}</Typography>
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
          <UploadFile onUpload={onUpload} files={draft.files} />
        </Box>
        <Box sx={{ display: 'flex', width: '300px' }}>
          <FileList
            assetId={'report-data'}
            files={draft.files}
            padding={0.5}
            removeFile={removeFile}
          />
        </Box>
      </DetailContainer>
    </Modal>
  );
};

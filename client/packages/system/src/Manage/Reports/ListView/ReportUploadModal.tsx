import { DialogButton, Typography, UploadFile } from '@common/components';
import { useDialog, useNotification } from '@common/hooks';
import { useTranslation } from '@common/intl';
import { Box, DetailContainer, FnUtils } from 'packages/common/src';
import React, { useState } from 'react';
import { FileList } from '../../../../../coldchain/src/Equipment/Components';
import { Environment } from 'packages/config/src';

interface ReportUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReportUploadModal = ({
  isOpen,
  onClose,
}: ReportUploadModalProps) => {
  const t = useTranslation();
  const [draft, setDraft] = useState<{ id?: string; files?: File[] }>({});
  const { error, success } = useNotification();
  const [errorMessage, setErrorMessage] = useState<string>(() => '');

  const { Modal } = useDialog({ isOpen, onClose, disableBackdrop: true });

  const removeFile = (name: string) => {
    setDraft({ files: draft.files?.filter(file => file.name !== name) });
  };

  const onUpload = (files: File[]) => {
    files.forEach(file => {
      if (!file.name.endsWith('json')) {
        setErrorMessage(t('messages.invalid-file'));
      }
    });

    if (errorMessage != '') {
      setDraft({ files });
      setErrorMessage('');
    }
  };

  const onOk = async () => {
    const uploadPromise = () => {
      if (!draft.files?.length)
        return new Promise(resolve => resolve('no files'));

      // create new json file id
      const id = FnUtils.generateUUID();
      const url = `${Environment.SYNC_FILES_URL}/report-data/${id}`;
      const formData = new FormData();
      draft.files?.forEach(file => {
        formData.append('files', file);
      });

      return fetch(url, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
        },
        credentials: 'include',
        body: formData,
      });
    };

    uploadPromise()
      .then(id => {
        // TODO add install uploaded plugin end point here
        throw error;
      })
      .then(() => {
        success(t('messages.log-saved-successfully'))();
        onClose();
      })
      .catch(e => error(`${t('error.unable-to-save-log')}: ${e.message}`)());
  };

  return (
    <Modal
      title={t('title.upload-reports')}
      cancelButton={
        <DialogButton
          variant="cancel"
          onClick={() => {
            onClose();
          }}
        />
      }
      okButton={<DialogButton variant="ok" onClick={onOk} />}
    >
      <DetailContainer>
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
        <Typography>{errorMessage}</Typography>
      </DetailContainer>
    </Modal>
  );
};

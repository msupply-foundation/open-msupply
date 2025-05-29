import { DialogButton, Typography, UploadFile } from '@common/components';
import { useDialog, useNotification } from '@common/hooks';
import { useTranslation } from '@common/intl';
import { Box, DetailContainer, FnUtils } from 'packages/common/src';
import React, { useState } from 'react';
import { FileList } from '../../../../../coldchain/src/Equipment/Components';
import { Environment } from 'packages/config/src';
import { useCentralReports } from '../hooks/useAllReportVersionsList';

interface ReportUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  install: {
    installUploadedReports: (fileId: string) => Promise<
      | string[]
      | {
          error: {
            description: string;
          };
        }
    >;
    installLoading: boolean;
    installError: unknown;
  };
}

export const ReportUploadModal = ({
  isOpen,
  onClose,
  install,
}: ReportUploadModalProps) => {
  const t = useTranslation();
  const [draft, setDraft] = useState<{ id?: string; files?: File[] }>({});
  const { error, success } = useNotification();
  const [errorMessage, setErrorMessage] = useState<string>(() => '');

  const { Modal } = useDialog({ isOpen, onClose, disableBackdrop: true });
  const { installUploadedReports, installLoading, installError } = install;

  const removeFile = (name: string) => {
    setDraft({ files: draft.files?.filter(file => file.name !== name) });
  };

  console.log('error message', errorMessage);

  const onUpload = (files: File[]) => {
    // files.forEach(file => {
    //   console.log('uploadi9ng');
    //   if (!file.name.endsWith('json')) {
    //     setErrorMessage(t('messages.invalid-file'));
    //   }
    // });
    console.log('errorMessage', errorMessage);
    console.log('setting files');
    setDraft({ files });
    setErrorMessage('');
  };

  const onOk = async () => {
    const uploadPromise = () => {
      if (!draft.files?.length)
        return new Promise(resolve => resolve('no files'));

      // create new json file id
      const url = `${Environment.REPORT_UPLOAD_URL}`;
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
      }).then(res => res.json());
    };

    uploadPromise()
      .then(id => {
        console.log('returned id', id);
        installUploadedReports(id['file-id']);
        // TODO add install uploaded plugin end point here
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

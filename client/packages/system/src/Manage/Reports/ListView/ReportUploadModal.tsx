import { DialogButton, UploadFile } from '@common/components';
import { useDialog, useNotification } from '@common/hooks';
import { useTranslation } from '@common/intl';
import { Box, DetailContainer } from 'packages/common/src';
import React, { useState } from 'react';
import { FileList } from '../../../../../coldchain/src/Equipment/Components';
import { Environment } from 'packages/config/src';

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
  // const [errorMessage, setErrorMessage] = useState<string>(() => '');

  const { Modal } = useDialog({ isOpen, onClose, disableBackdrop: true });
  const { installUploadedReports } = install;

  const removeFile = (name: string) => {
    setDraft({ files: draft.files?.filter(file => file.name !== name) });
  };

  const onUpload = (files: File[]) => {
    if (files.filter(f => !f.name.endsWith('json')).length > 0) {
      error('error.report-invalid-file')();
    } else {
      setDraft({ files });
    }
  };

  const onOk = async () => {
    if (!draft.files?.length)
      return new Promise(resolve => resolve('no files'));

    // create new json file id
    const url = `${Environment.REPORT_UPLOAD_URL}`;
    try {
      // let upsertedIds = [];
      if (draft.files) {
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

          installUploadedReports(id['file-id']);

          // TODO do something with fileId
        }
      }
      success(t('messsages.reports-installed-successfully'))();
      onClose();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      error(`${t('error.unable-to-install-reports')}: ${message}`)();
    }
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
      </DetailContainer>
    </Modal>
  );
};

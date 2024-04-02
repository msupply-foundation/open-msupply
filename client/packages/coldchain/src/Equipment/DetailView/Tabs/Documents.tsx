import React from 'react';
import { Typography, Upload } from '@common/components';
import {
  Box,
  useNotification,
  useTranslation,
} from '@openmsupply-client/common';
import { Environment } from '@openmsupply-client/config';
import { FileList } from '../../Components';
import { DraftAsset } from '../../types';

const Container = ({ children }: { children: React.ReactNode }) => (
  <Box
    display="flex"
    flex={1}
    flexDirection="column"
    alignContent="center"
    padding={4}
    paddingX={10}
  >
    {children}
  </Box>
);

const Heading = ({ text }: { text: string }) => (
  <Typography sx={{ fontWeight: 'bold', fontSize: 20, paddingBottom: 2 }}>
    {text}
  </Typography>
);

export const Documents = ({ draft }: { draft: DraftAsset }) => {
  const t = useTranslation('coldchain');
  const { error, success } = useNotification();
  const removeFile = () => {
    // onChange({ files: draft.files?.filter(file => file.name !== name) });
  };

  const onUpload = (files: File[]) => {
    const url = `${Environment.SYNC_FILES_URL}/asset/${draft.id}`;
    const formData = new FormData();
    files?.forEach(file => {
      formData.append('files', file);
    });

    return fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
      },
      body: formData,
    })
      .then(() => success(t('success'))())
      .catch(e => {
        console.error(e);
        error(t('error.an-error-occurred', { message: e.message }))();
      });
  };

  return (
    <Box display="flex" flex={1}>
      <Container>
        <Heading text={t('heading.download-catalogue-documents')} />
        <FileList
          assetId={draft.id}
          files={[]}
          removeFile={() => {}}
          noFilesMessage={t('messages.no-documents-uploaded')}
        />
      </Container>
      <Box
        marginTop={4}
        marginBottom={4}
        sx={{
          borderColor: 'gray.light',
          borderWidth: 0,
          borderLeftWidth: 1,
          borderStyle: 'solid',
        }}
      ></Box>
      <Container>
        <Heading text={t('heading.upload-cce-documents')} />
        <Upload onUpload={onUpload} color="gray" />
        <Box marginY={4} />
        <Heading text={t('heading.download-cce-documents')} />
        <FileList
          assetId={draft.id}
          files={draft.documents.nodes.map(document => ({
            id: document.id,
            name: document.fileName,
          }))}
          removeFile={removeFile}
          noFilesMessage={t('messages.no-documents-uploaded')}
        />
      </Container>
    </Box>
  );
};

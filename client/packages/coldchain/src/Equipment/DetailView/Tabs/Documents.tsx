import React from 'react';
import { Typography, Upload, useConfirmationModal } from '@common/components';
import {
  Box,
  useNotification,
  useQueryClient,
  useTranslation,
} from '@openmsupply-client/common';
import { Environment } from '@openmsupply-client/config';
import { FileList } from '../../Components';
import { DraftAsset } from '../../types';
import { useAssets } from '../../api';

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
  const api = useAssets.utils.api();
  const queryClient = useQueryClient();

  const getConfirmation = useConfirmationModal({
    title: t('heading.are-you-sure'),
    message: t('messages.confirm-delete-document'),
  });

  const removeFile = (_name: string, id?: string) => {
    getConfirmation({
      onConfirm: () => deleteFile(id ?? ''),
    });
  };

  const onSuccess = () => {
    success(t('success'))();
    const cacheKey = api.keys.detail(draft.id);
    queryClient.invalidateQueries(cacheKey);
  };

  const deleteFile = (id: string) => {
    fetch(`${Environment.SYNC_FILES_URL}/asset/${draft.id}/${id}`, {
      method: 'DELETE',
    })
      .then(response => {
        if (response.ok) {
          onSuccess();
        } else {
          error(
            t('error.an-error-occurred', { message: response.statusText })
          )();
        }
      })
      .catch(e => {
        error(t('error.an-error-occurred', { message: e.message }))();
      });
  };

  const onUpload = async (files: File[]) => {
    const url = `${Environment.SYNC_FILES_URL}/asset/${draft.id}`;
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
        body: formData,
      });
      if (response.ok) {
        return onSuccess();
      }
      error(t('error.an-error-occurred', { message: response.statusText }))();
    } catch (e) {
      console.error(e);
      error(t('error.an-error-occurred', { message: (e as Error).message }))();
    }
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

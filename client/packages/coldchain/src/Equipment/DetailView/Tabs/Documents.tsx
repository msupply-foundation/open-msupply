import React from 'react';
import {
  Box,
  useQueryClient,
  useTranslation,
} from '@openmsupply-client/common';
import {
  DocumentUpload,
  FileList,
  useDeleteDocument,
} from '@openmsupply-client/system';
import { DraftAsset } from '../../types';
import { useAssets } from '../../api';

const TABLE_NAME = 'asset';

const Container = ({ children }: { children: React.ReactNode }) => (
  <Box
    display="flex"
    flex={1}
    flexDirection="column"
    alignContent="center"
    sx={theme => ({
      [theme.breakpoints.down('sm')]: {
        padding: '1em',
      },
    })}
    padding={4}
    paddingX={10}
  >
    {children}
  </Box>
);

export const Documents = ({ draft }: { draft: DraftAsset }) => {
  const t = useTranslation();
  const api = useAssets.utils.api();
  const queryClient = useQueryClient();

  const invalidateQueries = () =>
    queryClient.invalidateQueries({ queryKey: api.keys.detail(draft.id) });

  const removeFile = useDeleteDocument({
    tableName: TABLE_NAME,
    recordId: draft.id,
    invalidateQueries,
  });

  return (
    <Box
      display="flex"
      flex={1}
      sx={theme => ({
        [theme.breakpoints.down('sm')]: {
          flexDirection: 'column',
        },
      })}
    >
      <Container>
        <FileList
          assetId={draft.id}
          tableName={TABLE_NAME}
          heading={t('heading.download-catalogue-documents')}
          files={[]}
          noFilesMessage={t('messages.no-documents-uploaded')}
        />
      </Container>
      <Box
        marginTop={4}
        marginBottom={4}
        sx={theme => ({
          borderColor: 'gray.light',
          borderWidth: 0,
          borderLeftWidth: 1,
          borderStyle: 'solid',
          [theme.breakpoints.down('sm')]: {
            display: 'none',
          },
        })}
      />
      <Container>
        <DocumentUpload
          heading={t('heading.upload-documents')}
          recordId={draft.id}
          tableName={TABLE_NAME}
          invalidateQueries={invalidateQueries}
        />
        <Box
          marginY={4}
          sx={theme => ({
            [theme.breakpoints.down('sm')]: {
              marginY: '1em',
            },
          })}
        />
        <FileList
          assetId={draft.id}
          tableName={TABLE_NAME}
          heading={t('heading.download-documents')}
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

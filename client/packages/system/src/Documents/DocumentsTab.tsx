import React, { ReactElement, ReactNode } from 'react';
import { Box, useTranslation } from '@openmsupply-client/common';
import { SyncFileReferenceFragment } from './types.generated';
import { DocumentUpload } from './DocumentUpload';
import { FileList } from './FileList';
import { useDeleteDocument } from './useDeleteDocument';

const Column = ({ children }: { children: ReactNode }) => (
  <Box
    display="flex"
    flex={1}
    flexDirection="column"
    sx={theme => ({
      [theme.breakpoints.down('sm')]: { padding: '1em' },
    })}
    padding={4}
    paddingX={10}
  >
    {children}
  </Box>
);

interface DocumentsTabProps {
  recordId: string;
  tableName: string;
  documents: SyncFileReferenceFragment[];
  invalidateQueries?: () => void;
  /** Show the upload zone. Defaults to true. */
  canUpload?: boolean;
  /**
   * Ids of documents that can be deleted. When omitted, all documents are
   * deletable; an empty set makes none deletable.
   */
  deletableDocumentIds?: Set<string>;
}

/**
 * Whole-tab document component: an inline upload zone above a downloadable file
 * list with per-file delete. Use this for detail-view "Documents" tabs that
 * need no special layout. For bespoke layouts (e.g. CCE's split view) compose
 * `DocumentUpload` + `FileList` + `useDeleteDocument` directly.
 */
export const DocumentsTab = ({
  recordId,
  tableName,
  documents,
  invalidateQueries,
  canUpload = true,
  deletableDocumentIds,
}: DocumentsTabProps): ReactElement => {
  const t = useTranslation();

  const removeFile = useDeleteDocument({
    tableName,
    recordId,
    invalidateQueries,
  });

  const files = documents.map(document => ({
    id: document.id,
    name: document.fileName,
    recordId: document.recordId,
    canDelete: deletableDocumentIds
      ? deletableDocumentIds.has(document.id)
      : true,
  }));

  return (
    <Box
      display="flex"
      flex={1}
      sx={theme => ({
        [theme.breakpoints.down('lg')]: { flexDirection: 'column' },
      })}
    >
      {canUpload && (
        <>
          <Column>
            <DocumentUpload
              heading={t('heading.upload-documents')}
              recordId={recordId}
              tableName={tableName}
              invalidateQueries={invalidateQueries}
            />
          </Column>
          <Box
            marginY={4}
            sx={theme => ({
              borderColor: 'gray.light',
              borderWidth: 0,
              borderLeftWidth: 1,
              borderStyle: 'solid',
              [theme.breakpoints.down('lg')]: { display: 'none' },
            })}
          />
        </>
      )}
      <Column>
        <FileList
          assetId={recordId}
          tableName={tableName}
          heading={t('heading.download-documents')}
          files={files}
          removeFile={removeFile}
          noFilesMessage={t('messages.no-documents-uploaded')}
        />
      </Column>
    </Box>
  );
};

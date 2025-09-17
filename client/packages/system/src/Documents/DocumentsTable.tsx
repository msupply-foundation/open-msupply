import React, { ReactElement } from 'react';
import {
  ColumnFormat,
  createTableStore,
  DataTable,
  GenericColumnKey,
  NothingHere,
  TableProvider,
  useColumns,
  useTranslation,
} from '@openmsupply-client/common';
import { SyncFileReferenceFragment } from '@openmsupply-client/system';
import { Footer } from './Footer';

// TODO:
// SyncFileReference missing fields: createdBy, modifiedBy, versionNumber
// If same file is uploaded, version number should be incremented through backend

interface DocumentsProps {
  recordId: string;
  tableName: string;
  documents: SyncFileReferenceFragment[];
  noDataElement?: JSX.Element;
  onUploadDocument?: () => void;
  invalidateQueries?: () => void;
}

export const DocumentsTable = ({
  recordId,
  tableName,
  documents,
  noDataElement,
  onUploadDocument,
  invalidateQueries,
}: DocumentsProps): ReactElement => {
  const t = useTranslation();

  const columns = useColumns<SyncFileReferenceFragment>([
    GenericColumnKey.Selection,
    {
      key: 'fileName',
      label: 'label.filename',
      accessor: ({ rowData }) => rowData.fileName,
    },
    {
      key: 'createdDatetime',
      label: 'label.created-datetime',
      accessor: ({ rowData }) => rowData.createdDatetime,
      format: ColumnFormat.Date,
    },
  ]);

  return (
    <TableProvider createStore={createTableStore}>
      <DataTable
        id={recordId}
        columns={columns}
        data={documents}
        noDataElement={
          noDataElement ?? (
            <NothingHere
              body={t('messages.no-documents-uploaded')}
              onCreate={onUploadDocument}
              buttonText={t('label.upload-document')}
            />
          )
        }
      />
      <Footer
        tableName={tableName}
        recordId={recordId}
        documents={documents}
        invalidateQueries={invalidateQueries}
      />
    </TableProvider>
  );
};

import React, { ReactElement, useMemo } from 'react';
import {
  ColumnDef,
  ColumnType,
  MaterialTable,
  NothingHere,
  useNonPaginatedMaterialTable,
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
  isFetching?: boolean;
  invalidateQueries?: () => void;
  openUploadModal?: () => void;
  deletableDocumentIds?: Set<string>;
}

// TODO: Replace upload table with how we have it in other modules (i.e. Not table)
export const DocumentsTable = ({
  recordId,
  tableName,
  documents,
  isFetching,
  invalidateQueries,
  openUploadModal,
  deletableDocumentIds,
}: DocumentsProps): ReactElement => {
  const t = useTranslation();

  const columns = useMemo(
    (): ColumnDef<SyncFileReferenceFragment>[] => [
      {
        header: t('label.filename'),
        accessorKey: 'fileName',
        enableSorting: true,
      },
      {
        header: t('label.created-datetime'),
        accessorKey: 'createdDatetime',
        columnType: ColumnType.Date,
        enableSorting: true,
      },
    ],
    [t]
  );

  const { table, selectedRows } =
    useNonPaginatedMaterialTable<SyncFileReferenceFragment>({
      tableId: `${tableName}-documents-table`,
      isLoading: isFetching,
      columns,
      data: documents,
      initialSort: { key: 'createdDatetime', dir: 'desc' },
      noDataElement: (
        <NothingHere
          body={t('messages.no-documents-uploaded')}
          onCreate={openUploadModal}
        />
      ),
    });

  return (
    <>
      <MaterialTable table={table} />
      <Footer
        tableName={tableName}
        recordId={recordId}
        invalidateQueries={invalidateQueries}
        selectedRows={selectedRows}
        resetRowSelection={table.resetRowSelection}
        deletableDocumentIds={deletableDocumentIds}
      />
    </>
  );
};

import React, { Dispatch, ReactElement, SetStateAction } from 'react';
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
import { SyncFileReferenceFragment } from '../../../api';
import { Footer } from './Footer';

// TODO:
// SyncFileReference missing fields: createdBy, modifiedBy, versionNumber
// If same file is uploaded, version number should be incremented through backend

interface DocumentsProps {
  purchaseOrderId?: string;
  documents?: SyncFileReferenceFragment[];
  setShowStatusBar: Dispatch<SetStateAction<boolean>>;
}

export const Documents = ({
  purchaseOrderId,
  documents,
  setShowStatusBar,
}: DocumentsProps): ReactElement => {
  const t = useTranslation();

  const columns = useColumns<SyncFileReferenceFragment>([
    GenericColumnKey.Selection,
    {
      key: 'fileName',
      label: 'label.filename',
      accessor: ({ rowData }) => rowData.fileName,
    },
    // TODO: createdBy column
    {
      key: 'createdDatetime',
      label: 'label.created-datetime',
      accessor: ({ rowData }) => rowData.createdDatetime,
      format: ColumnFormat.Date,
    },
    // TODO: modifiedDatetime column
    // TODO: versionNumber column
  ]);

  return (
    <TableProvider createStore={createTableStore}>
      <DataTable
        id="purchase-order-documents"
        columns={columns}
        data={documents}
        noDataElement={
          <NothingHere body={t('error.no-purchase-order-documents')} />
        }
      />
      <Footer
        purchaseOrderId={purchaseOrderId}
        documents={documents}
        setShowStatusBar={setShowStatusBar}
      />
    </TableProvider>
  );
};

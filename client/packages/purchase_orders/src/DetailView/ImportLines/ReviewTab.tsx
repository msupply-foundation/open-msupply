import React, { FC } from 'react';
import { ImportRow } from './PurchaseOrderLineImportModal';
import { ImportPanel } from './ImportPanel';
import { ImportReviewDataTable } from './ImportReviewDataTable';

interface ReviewTabProps {
  uploadedRows: ImportRow[];
  showWarnings: boolean;
}

export const ReviewTab: FC<ImportPanel & ReviewTabProps> = ({
  showWarnings,
  tab,
  uploadedRows,
}) => (
  <ImportPanel tab={tab}>
    <ImportReviewDataTable
      importRows={uploadedRows}
      showWarnings={showWarnings}
    />
  </ImportPanel>
);

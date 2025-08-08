import React from 'react';
import { ImportRow } from './PurchaseOrderLineImportModal';
import { ImportReviewDataTable } from './ImportReviewDataTable';
import { ImportPanel } from '@common/components';

interface ReviewTabProps {
  uploadedRows: ImportRow[];
  showWarnings: boolean;
}

export const ReviewTab = ({
  showWarnings,
  tab,
  uploadedRows,
}: ImportPanel & ReviewTabProps) => (
  <ImportPanel tab={tab}>
    <ImportReviewDataTable
      importRows={uploadedRows}
      showWarnings={showWarnings}
    />
  </ImportPanel>
);

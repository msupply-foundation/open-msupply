import React, { FC } from 'react';
import { ImportRow } from './PurchaseOrderLineImportModal';
import { ImportReviewDataTable } from './ImportReviewDataTable';
import { ImportPanel } from '@common/components';

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

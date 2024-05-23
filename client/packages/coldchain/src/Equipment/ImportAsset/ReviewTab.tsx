import React, { FC } from 'react';
import { ImportPanel } from './ImportPanel';
import { ImportRow } from './EquipmentImportModal';
import { ImportReviewDataTable } from './ImportReviewDataTable';

interface EquipmentReviewTabProps {
  uploadedRows: ImportRow[];
  showWarnings: boolean;
}

export const EquipmentReviewTab: FC<ImportPanel & EquipmentReviewTabProps> = ({
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

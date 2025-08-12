import React, { FC } from 'react';
import { ImportRow } from './EquipmentImportModal';
import { ImportReviewDataTable } from './ImportReviewDataTable';
import { ImportPanel } from '@common/components';

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

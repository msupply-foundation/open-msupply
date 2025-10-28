import React, { FC } from 'react';
import { ImportRow } from './EquipmentImportModal';
import { ImportReviewDataTable } from './ImportReviewDataTable';
import { ImportPanel } from '@common/components';

interface EquipmentReviewTabProps {
  uploadedRows: ImportRow[];
  showWarnings: boolean;
  hasError: boolean;
}

export const EquipmentReviewTab: FC<ImportPanel & EquipmentReviewTabProps> = ({
  showWarnings,
  tab,
  uploadedRows,
  hasError,
}) => (
  <ImportPanel tab={tab}>
    <ImportReviewDataTable
      importRows={uploadedRows}
      showWarnings={showWarnings}
      showErrors={hasError}
    />
  </ImportPanel>
);

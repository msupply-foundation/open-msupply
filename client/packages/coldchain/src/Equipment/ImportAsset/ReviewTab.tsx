import React, { FC } from 'react';
import { ImportRow } from './EquipmentImportModal';
import { ImportReviewTable } from './ImportReviewTable';
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
    <ImportReviewTable
      importRows={uploadedRows}
      showWarnings={showWarnings}
      showErrors={hasError}
    />
  </ImportPanel>
);

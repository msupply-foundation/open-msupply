import React, { FC } from 'react';
import { ImportPanel } from './ImportPanel';
import { ImportRow } from './EquipmentImportModal';
import { ImportReviewDataTable } from './ImportReviewDataTable';

interface EquipmentReviewTabProps {
  uploadedRows: ImportRow[];
}

export const EquipmentReviewTab: FC<ImportPanel & EquipmentReviewTabProps> = ({
  tab,
  uploadedRows,
}) => {
  return (
    <ImportPanel tab={tab}>
      <ImportReviewDataTable importRows={uploadedRows} />
    </ImportPanel>
  );
};

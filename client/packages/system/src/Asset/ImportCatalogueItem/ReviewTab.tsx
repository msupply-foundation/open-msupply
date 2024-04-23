import React, { FC } from 'react';
import { ImportPanel } from './ImportPanel';
import { ImportRow } from './CatalogueItemImportModal';
import { ImportReviewDataTable } from './ImportReviewDataTable';

interface AssetItemReviewTabProps {
  uploadedRows: ImportRow[];
}

export const AssetItemReviewTab: FC<ImportPanel & AssetItemReviewTabProps> = ({
  tab,
  uploadedRows,
}) => (
  <ImportPanel tab={tab}>
    <ImportReviewDataTable importRows={uploadedRows} />
  </ImportPanel>
);

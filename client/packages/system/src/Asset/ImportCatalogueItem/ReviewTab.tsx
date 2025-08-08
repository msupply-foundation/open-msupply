import React, { FC } from 'react';
import { ImportRow } from './CatalogueItemImportModal';
import { ImportReviewDataTable } from './ImportReviewDataTable';
import { ImportPanel } from '@common/components';

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

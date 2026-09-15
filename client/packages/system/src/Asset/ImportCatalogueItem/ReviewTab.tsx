import React, { FC } from 'react';
import { ImportRow } from './CatalogueItemImportModal';
import { ImportReviewTable } from './ImportReviewTable';
import { ImportPanel } from '@common/components';

interface AssetItemReviewTabProps {
  uploadedRows: ImportRow[];
}

export const AssetItemReviewTab: FC<ImportPanel & AssetItemReviewTabProps> = ({
  tab,
  uploadedRows,
}) => (
  <ImportPanel tab={tab}>
    <ImportReviewTable importRows={uploadedRows} />
  </ImportPanel>
);

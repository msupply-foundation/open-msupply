import React, { FC } from 'react';
import { ImportPanel } from './ImportPanel';
import { ImportReviewDataTable } from './ImportReviewDataTable';
import { NamePropertyNode } from '@common/types';
import { ImportRow } from './PropertiesImportModal';

interface ReviewTabProps {
  uploadedRows: ImportRow[];
  properties: NamePropertyNode[] | undefined;
}

export const ReviewTab: FC<ImportPanel & ReviewTabProps> = ({
  tab,
  uploadedRows,
  properties,
}) => (
  <ImportPanel tab={tab}>
    <ImportReviewDataTable rows={uploadedRows} properties={properties} />
  </ImportPanel>
);

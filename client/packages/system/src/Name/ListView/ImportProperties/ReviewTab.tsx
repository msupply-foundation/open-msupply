import React, { FC } from 'react';
import { ImportReviewDataTable } from './ImportReviewDataTable';
import { NamePropertyNode } from '@common/types';
import { ImportRow } from './PropertiesImportModal';
import { ImportPanel } from '@common/components';

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

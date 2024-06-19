import React, { FC } from 'react';
import { ImportPanel } from './ImportPanel';
import { ImportReviewDataTable } from './ImportReviewDataTable';

interface PropertiesReviewTabProps {
  uploadedRows: any[];
  showWarnings: boolean;
}

export const PropertiesReviewTab: FC<
  ImportPanel & PropertiesReviewTabProps
> = ({ showWarnings, tab, uploadedRows }) => (
  <ImportPanel tab={tab}>
    <ImportReviewDataTable rows={uploadedRows} showWarnings={showWarnings} />
  </ImportPanel>
);

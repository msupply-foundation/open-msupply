import React, { FC } from 'react';
import { ImportPanel } from './ImportPanel';
import { ReviewDataTable } from './ReviewDataTable';

interface PropertiesReviewTabProps {
  uploadedRows: any[];
  showWarnings: boolean;
}

export const PropertiesReviewTab: FC<
  ImportPanel & PropertiesReviewTabProps
> = ({ showWarnings, tab, uploadedRows }) => (
  <ImportPanel tab={tab}>
    <ReviewDataTable rows={uploadedRows} showWarnings={showWarnings} />
  </ImportPanel>
);

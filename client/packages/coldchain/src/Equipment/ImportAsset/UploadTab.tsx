import React, { FC } from 'react';
import { Box } from '@openmsupply-client/common';
import { Upload } from './Upload';

interface UploadTabProps {}

export const UploadTab: FC<UploadTabProps> = ({}) => {
  return (
    <Box>
      <Upload></Upload>
    </Box>
  );
};

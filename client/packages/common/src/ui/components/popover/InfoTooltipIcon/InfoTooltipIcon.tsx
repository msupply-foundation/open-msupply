import React from 'react';
import { Tooltip } from '@mui/material';
import { InfoIcon } from '../../../icons';

export const InfoTooltipIcon = ({ title }: { title: string }) => (
  <Tooltip title={title}>
    <div style={{ transform: 'scale(0.7)', cursor: 'help' }}>
      <InfoIcon fontSize="small" />
    </div>
  </Tooltip>
);

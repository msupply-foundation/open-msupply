import React from 'react';
import { SxProps, Theme, Tooltip } from '@mui/material';
import { InfoIcon } from '../../../icons';

export const InfoTooltipIcon = ({
  title,
  iconSx,
}: {
  title: string;
  iconSx?: SxProps<Theme>;
}) =>
  !title ? null : (
    <Tooltip title={title}>
      <div style={{ transform: 'scale(0.7)', cursor: 'help' }}>
        <InfoIcon fontSize="small" sx={iconSx} />
      </div>
    </Tooltip>
  );

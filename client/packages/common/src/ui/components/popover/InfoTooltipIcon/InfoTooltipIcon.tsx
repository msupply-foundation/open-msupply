import React from 'react';
import { SxProps, Theme, Tooltip } from '@mui/material';
import { InfoIcon } from '../../../icons';

export const InfoTooltipIcon = ({
  title,
  iconSx,
  testId,
}: {
  title: string;
  iconSx?: SxProps<Theme>;
  testId?: string;
}) =>
  !title ? null : (
    <Tooltip title={title}>
      <div
        style={{ transform: 'scale(0.7)', cursor: 'help' }}
        data-testid={testId}
      >
        <InfoIcon fontSize="small" sx={iconSx} />
      </div>
    </Tooltip>
  );

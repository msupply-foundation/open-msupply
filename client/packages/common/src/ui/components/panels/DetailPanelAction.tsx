import React, { FC } from 'react';
import { Box } from '@mui/material';
import { FlatButton } from '../buttons/FlatButton';

export interface DetailPanelActionProps {
  icon?: JSX.Element;
  onClick: () => void;
  title: string;
  disabled?: boolean;
  testId?: string;
}

export const DetailPanelAction: FC<DetailPanelActionProps> = ({
  icon,
  onClick,
  title,
  disabled,
  testId,
}) => {
  return (
    <Box sx={{ marginLeft: '11px' }}>
      <FlatButton
        onClick={onClick}
        startIcon={icon}
        label={title}
        disabled={disabled}
        testId={testId}
      />
    </Box>
  );
};

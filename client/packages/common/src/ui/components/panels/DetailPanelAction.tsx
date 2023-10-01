import React, { FC } from 'react';
import { Box } from '@mui/material';
import { FlatButton } from '../buttons/FlatButton';

export interface DetailPanelActionProps {
  icon?: JSX.Element;
  onClick: () => void;
  title: string;
  disabled?: boolean;
}

export const DetailPanelAction: FC<DetailPanelActionProps> = ({
  icon,
  onClick,
  title,
  disabled,
}) => {
  return (
    <Box sx={{ marginLeft: '11px' }}>
      <FlatButton
        onClick={onClick}
        startIcon={icon}
        label={title}
        disabled={disabled}
      />
    </Box>
  );
};

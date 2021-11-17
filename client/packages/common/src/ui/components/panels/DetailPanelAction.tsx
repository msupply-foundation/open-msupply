import React, { FC } from 'react';
import { Box } from '@mui/material';
import { LocaleKey } from '../../../intl';
import { FlatButton } from '../buttons/FlatButton';

export interface DetailPanelActionProps {
  icon?: JSX.Element;
  onClick: () => void;
  titleKey: LocaleKey;
}

export const DetailPanelAction: FC<DetailPanelActionProps> = ({
  icon,
  onClick,
  titleKey,
}) => {
  return (
    <Box sx={{ marginLeft: '11px' }}>
      <FlatButton onClick={onClick} icon={icon} labelKey={titleKey} />
    </Box>
  );
};

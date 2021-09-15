import React from 'react';
import { Button, Tooltip } from '@material-ui/core';
import { styled } from '@material-ui/core/styles';
import { LocaleKey, useTranslation } from '../../../intl/intlHelpers';
import { DefaultButtonStyles } from './styles';

interface ButtonProps {
  disabled?: boolean;
  icon: React.ReactNode;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  size?: 'small' | 'medium';
  titleKey: LocaleKey;
}

const StyledButton = styled(Button)(({ theme }) => ({
  ...DefaultButtonStyles,
  boxShadow: theme.shadows[1],
  color: theme.palette.primary.main,
}));

export const IconButton: React.FC<ButtonProps> = props => {
  const t = useTranslation();
  const { disabled, icon, onClick, size, titleKey } = props;
  return (
    <Tooltip title={t(titleKey)}>
      <StyledButton
        disabled={disabled}
        onClick={onClick}
        size={size}
        variant="contained"
      >
        {icon}
      </StyledButton>
    </Tooltip>
  );
};

export default IconButton;

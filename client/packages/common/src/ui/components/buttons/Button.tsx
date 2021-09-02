import React from 'react';
import { Button as MuiButton } from '@material-ui/core';
import { styled } from '@material-ui/core/styles';
import { LocaleKey, useTranslation } from '../../../intl/intlHelpers';
import { DefaultButtonStyles } from './styles';

interface ButtonProps {
  icon: React.ReactNode;
  labelKey: LocaleKey;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

const StyledButton = styled(MuiButton)(({ theme }) => ({
  ...DefaultButtonStyles,
  boxShadow: theme.shadows[1],
  color: theme.palette.primary.main,
  minWidth: 115,
}));

const Button: React.FC<ButtonProps> = props => {
  const t = useTranslation();

  const { labelKey, icon, onClick } = props;
  return (
    <StyledButton onClick={onClick} startIcon={icon} variant="contained">
      {t(labelKey)}
    </StyledButton>
  );
};

export default Button;

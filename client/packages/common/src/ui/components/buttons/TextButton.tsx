import React from 'react';
import { Button as MuiButton } from '@material-ui/core';
import { styled } from '@material-ui/core/styles';
import { LocaleKey, useTranslation } from '../../../intl/intlHelpers';
import { DefaultButtonStyles } from './styles';

interface ButtonProps {
  disabled?: boolean;
  labelKey: LocaleKey;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

const StyledButton = styled(MuiButton)(({ theme }) => ({
  ...DefaultButtonStyles,
  boxShadow: theme.shadows[1],
  color: theme.palette.primary.main,
  minWidth: 115,
}));

export const TextButton: React.FC<ButtonProps> = props => {
  const t = useTranslation();
  const { disabled, labelKey, onClick } = props;
  return (
    <StyledButton disabled={disabled} onClick={onClick} variant="contained">
      {t(labelKey)}
    </StyledButton>
  );
};

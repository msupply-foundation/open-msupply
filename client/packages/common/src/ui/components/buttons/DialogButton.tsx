import React from 'react';
import { Button as MuiButton } from '@mui/material';
import { styled } from '@mui/material/styles';
import { LocaleKey, useTranslation } from '../../../intl/intlHelpers';
import { DefaultButtonStyles } from './styles';

type Color = 'primary' | 'secondary';

interface DialogButtonProps {
  color?: Color;
  icon: React.ReactNode;
  labelKey: LocaleKey;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

const StyledButton = styled(MuiButton, {
  shouldForwardProp: prop => prop !== 'color',
})<{ color: Color }>(({ theme, color }) => {
  let normalStyle = { backgroundColor: '', color: '' };
  let activeStyle = { backgroundColor: '', color: '' };

  switch (color) {
    case 'primary':
      normalStyle = theme.mixins.dialog.button.primary;
      activeStyle = theme.mixins.dialog.button.secondary;
      break;
    case 'secondary':
      normalStyle = theme.mixins.dialog.button.secondary;
      activeStyle = theme.mixins.dialog.button.primary;
      break;
  }

  return {
    ...DefaultButtonStyles,
    ...normalStyle,
    boxShadow: theme.shadows[1],
    minWidth: '115px',
    '& svg': {
      color: normalStyle.color,
      height: theme.mixins.dialog.button.iconHeight,
      width: theme.mixins.dialog.button.iconWidth,
    },
    '&:hover': activeStyle,
    '&:hover svg': { color: activeStyle.color },
  };
});

export const DialogButton: React.FC<DialogButtonProps> = ({
  color = 'primary',
  labelKey,
  icon,
  onClick,
}) => {
  const t = useTranslation();

  return (
    <StyledButton
      color={color}
      onClick={onClick}
      startIcon={icon}
      variant="contained"
      size="small"
    >
      {t(labelKey)}
    </StyledButton>
  );
};

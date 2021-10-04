import React from 'react';
import { Button as MuiButton } from '@mui/material';
import { styled } from '@mui/material/styles';
import { LocaleKey, useTranslation } from '../../../intl/intlHelpers';
import { DefaultButtonStyles } from './styles';
import { ArrowRightIcon, CheckIcon, XCircleIcon } from '../../icons';

type Color = 'primary' | 'secondary';
type DialogButtonVariant = 'cancel' | 'next' | 'ok';

interface DialogButtonProps {
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  variant: DialogButtonVariant;
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
    fontSize: 12,
    fontWeight: 500,
    boxShadow: theme.shadows[1],
    minWidth: '120px',
    '& svg': {
      color: normalStyle.color,
      height: theme.mixins.dialog.button.iconHeight,
      width: theme.mixins.dialog.button.iconWidth,
    },
    '&:hover': activeStyle,
    '&:hover svg': { color: activeStyle.color },
  };
});

const getButtonProps = (
  variant: DialogButtonVariant
): { color: Color; icon: JSX.Element; labelKey: LocaleKey } => {
  switch (variant) {
    case 'cancel':
      return {
        color: 'secondary',
        icon: <XCircleIcon />,
        labelKey: 'button.cancel',
      };
    case 'ok':
      return {
        color: 'primary',
        icon: <CheckIcon />,
        labelKey: 'button.ok',
      };
    case 'next':
      return {
        color: 'primary',
        icon: <ArrowRightIcon />,
        labelKey: 'button.ok-and-next',
      };
  }
};

export const DialogButton: React.FC<DialogButtonProps> = ({
  onClick,
  variant,
}) => {
  const t = useTranslation();
  const { color, icon, labelKey } = getButtonProps(variant);

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

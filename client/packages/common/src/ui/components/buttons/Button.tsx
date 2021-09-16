import React from 'react';
import { Button as MuiButton, Tooltip } from '@material-ui/core';
import { styled } from '@material-ui/core/styles';
import { LocaleKey, useTranslation } from '../../../intl/intlHelpers';
import { DefaultButtonStyles } from './styles';
import { useIsSmallScreen } from '../../../hooks';

interface ButtonProps {
  icon: React.ReactNode;
  labelKey: LocaleKey;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  shouldShrink?: boolean;
}

const StyledButton = styled(MuiButton, {
  shouldForwardProp: prop => prop !== 'shrink',
})<{ shrink: boolean }>(({ theme, shrink }) => ({
  ...DefaultButtonStyles,
  boxShadow: theme.shadows[1],
  color: theme.palette.primary.main,
  width: shrink ? '64px' : '115px',
  transition: theme.transitions.create(['width'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
}));

export const Button: React.FC<ButtonProps> = ({
  labelKey,
  icon,
  onClick,
  shouldShrink = false,
}) => {
  const t = useTranslation();
  const isSmallScreen = useIsSmallScreen();

  // On small screens, if the button shouldShrink, then
  // only display a centered icon, with no text.
  const shrink = isSmallScreen && shouldShrink;
  const startIcon = shrink ? null : icon;
  const centeredIcon = shrink ? icon : null;
  const text = shrink ? null : t(labelKey);

  return (
    <Tooltip disableHoverListener={!shrink} title={t(labelKey)}>
      <StyledButton
        shrink={shrink}
        onClick={onClick}
        startIcon={startIcon}
        variant="contained"
        size="small"
      >
        {centeredIcon}
        {text}
      </StyledButton>
    </Tooltip>
  );
};

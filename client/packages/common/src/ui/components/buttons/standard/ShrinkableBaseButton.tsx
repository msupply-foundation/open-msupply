import React, { FC } from 'react';
import { ButtonProps } from '@mui/material';
import { styled } from '@mui/material/styles';
import { StyledBaseButton } from './BaseButton';

export const StyledShrinkableBaseButton = styled(StyledBaseButton, {
  shouldForwardProp: prop => prop !== 'shrink',
})<{ shrink: boolean }>(({ shrink, theme }) => ({
  width: shrink ? '64px' : 'auto',
  minWidth: shrink ? '64px' : '115px',
  transition: theme.transitions.create(['min-width'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
}));

interface ShrinkableBaseButtonProps extends ButtonProps {
  shrink: boolean;
}

export const ShrinkableBaseButton: FC<ShrinkableBaseButtonProps> =
  React.forwardRef(({ shrink = false, ...props }, ref) => (
    <StyledShrinkableBaseButton
      ref={ref}
      shrink={shrink}
      size="small"
      {...props}
    />
  ));

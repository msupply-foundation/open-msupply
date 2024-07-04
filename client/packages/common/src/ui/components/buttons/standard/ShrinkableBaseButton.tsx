import React from 'react';
import { ButtonProps } from '@mui/material';
import { styled } from '@mui/material/styles';
import { StyledBaseButton } from './BaseButton';
import { useIntlUtils } from '@common/intl';

export const StyledShrinkableBaseButton = styled(StyledBaseButton, {
  shouldForwardProp: prop => prop !== 'shrink' && prop !== 'isRtl',
})<{ isRtl: boolean; shrink: boolean }>(({ isRtl, shrink, theme }) => ({
  // These magic padding numbers give a little bit of space to the left and right when
  // the button content is extra large, such as in the "Save & Confirm Allocation" button
  // on an outbound shipment.
  paddingLeft: '20px',
  paddingRight: '20px',
  width: shrink ? '64px' : 'auto',
  minWidth: shrink ? '64px' : '115px',
  transition: theme.transitions.create(['min-width'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  '& .MuiButton-startIcon': isRtl
    ? {
        marginRight: -2,
        marginLeft: 8,
      }
    : {},
}));

interface ShrinkableBaseButtonProps extends ButtonProps {
  shrink: boolean;
}

export const ShrinkableBaseButton = React.forwardRef<
  HTMLButtonElement,
  ShrinkableBaseButtonProps
>(({ shrink = false, onClick, ...props }, ref) => {
  const { isRtl } = useIntlUtils();
  return (
    <StyledShrinkableBaseButton
      ref={ref}
      shrink={shrink}
      size="small"
      isRtl={isRtl}
      onClick={onClick}
      onKeyDown={(event: React.KeyboardEvent<HTMLButtonElement>) => {
        if (event.code === 'Enter' && !!onClick) onClick({} as any);
      }}
      {...props}
    />
  );
});

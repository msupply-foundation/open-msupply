import React from 'react';
import { ButtonProps, Tooltip } from '@mui/material';
import { styled } from '@mui/material/styles';
import { StyledBaseButton, translateColor } from './BaseButton';
import { useIntlUtils } from '@common/intl';
import { useIsScreen } from '@common/hooks';

export const StyledShrinkableBaseButton = styled(StyledBaseButton, {
  shouldForwardProp: prop => prop !== 'shrink' && prop !== 'isRtl',
})<{ isRtl: boolean; shrink: boolean }>(({ color, isRtl, shrink, theme }) => ({
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

  '&.MuiButton-root:not(:hover) .MuiSvgIcon-root': {
    color: color === 'primary' ? translateColor(theme, color) : undefined,
  },
}));

interface ShrinkableBaseButtonProps extends ButtonProps {
  label: string;
  shouldShrink: boolean;
  shrinkThreshold: 'sm' | 'md' | 'lg' | 'xl';
}

export const ShrinkableBaseButton = React.forwardRef<
  HTMLButtonElement,
  ShrinkableBaseButtonProps
>(
  (
    { label, onClick, shrinkThreshold, shouldShrink, startIcon, ...props },
    ref
  ) => {
    const { isRtl } = useIntlUtils();
    const isShrinkThreshold = useIsScreen(shrinkThreshold);

    // On small screens, if the button shouldShrink, then
    // only display a centred icon, with no text.
    const shrink = isShrinkThreshold && shouldShrink;
    // const startIcon = shrink ? null : Icon;
    const centredIcon = shrink ? startIcon : null;
    const text = shrink ? null : label;

    return (
      <Tooltip disableHoverListener={!shrink} title={label}>
        <span>
          <StyledShrinkableBaseButton
            ref={ref}
            shrink={shrink}
            size="small"
            isRtl={isRtl}
            aria-label={label}
            onClick={onClick}
            onKeyDown={(event: React.KeyboardEvent<HTMLButtonElement>) => {
              if (event.code === 'Enter' && !!onClick) onClick({} as any);
            }}
            startIcon={shrink ? null : startIcon}
            {...props}
          >
            {centredIcon}
            {text}
          </StyledShrinkableBaseButton>
        </span>
      </Tooltip>
    );
  }
);

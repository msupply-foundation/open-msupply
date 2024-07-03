import React from 'react';
import { ButtonProps, Tooltip } from '@mui/material';
import { ShrinkableBaseButton } from './ShrinkableBaseButton';
import { useIsScreen } from '@common/hooks';

export interface ButtonWithIconProps extends ButtonProps {
  Icon: React.ReactNode;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  label: string;
  shouldShrink?: boolean;
  variant?: 'outlined' | 'contained';
  color?: 'primary' | 'secondary' | 'error';
  disabled?: boolean;
  shrinkThreshold?: 'sm' | 'md' | 'lg' | 'xl';
}

export const ButtonWithIcon: React.FC<ButtonWithIconProps> = React.forwardRef(
  (
    {
      label,
      onClick,
      Icon,
      shouldShrink = true,
      variant = 'outlined',
      color = 'primary',
      disabled,
      shrinkThreshold = 'md',
      ...buttonProps
    },
    ref
  ) => {
    const isShrinkThreshold = useIsScreen(shrinkThreshold);

    // On small screens, if the button shouldShrink, then
    // only display a centred icon, with no text.
    const shrink = isShrinkThreshold && shouldShrink;
    const startIcon = shrink ? null : Icon;
    const centredIcon = shrink ? Icon : null;
    const text = shrink ? null : label;

    return (
      <Tooltip disableHoverListener={!shrink} title={label}>
        <span>
          <ShrinkableBaseButton
            disabled={disabled}
            shrink={shrink}
            onClick={onClick}
            variant={variant}
            color={color}
            size="small"
            startIcon={startIcon}
            aria-label={label}
            ref={ref}
            {...buttonProps}
          >
            {centredIcon}
            {text}
          </ShrinkableBaseButton>
        </span>
      </Tooltip>
    );
  }
);

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
  color?: 'primary' | 'secondary';
  disabled?: boolean;
  shrinkThreshold?: 'sm' | 'md' | 'lg' | 'xl';
}
const formatLabel = (label: string) => {
  if (label.indexOf('&') === -1) {
    return label;
  }
  const match = /(.*)\&(.)(.*)/.exec(label);
  if (!match || match.length !== 4) {
    return label;
  }
  return (
    <>
      {match[1]}
      <u>{match[2]}</u>
      {match[3]}
    </>
  );
};

export const ButtonWithIcon: React.FC<ButtonWithIconProps> = ({
  label,
  onClick,
  Icon,
  shouldShrink = true,
  variant = 'outlined',
  color = 'primary',
  disabled,
  shrinkThreshold = 'md',
  ...buttonProps
}) => {
  const isShrinkThreshold = useIsScreen(shrinkThreshold);

  // On small screens, if the button shouldShrink, then
  // only display a centred icon, with no text.
  const shrink = isShrinkThreshold && shouldShrink;
  const startIcon = shrink ? null : Icon;
  const centredIcon = shrink ? Icon : null;
  const text = shrink ? null : formatLabel(label);

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
          {...buttonProps}
        >
          {centredIcon}
          {text}
        </ShrinkableBaseButton>
      </span>
    </Tooltip>
  );
};

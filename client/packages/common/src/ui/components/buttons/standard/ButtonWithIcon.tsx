import React from 'react';
import { ButtonProps, Tooltip } from '@mui/material';
import {
  LocaleKey,
  LocaleProps,
  useTranslation,
} from '../../../../intl/intlHelpers';
import { ShrinkableBaseButton } from './ShrinkableBaseButton';
import { useIsScreen } from '../../../../hooks/useIsScreen';

interface ButtonWithIconProps extends ButtonProps {
  Icon: React.ReactNode;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  labelKey: LocaleKey;
  labelProps?: LocaleProps;
  shouldShrink?: boolean;
  variant?: 'outlined' | 'contained';
  color?: 'primary' | 'secondary';
  disabled?: boolean;
  shrinkThreshold?: 'sm' | 'md' | 'lg' | 'xl';
}

export const ButtonWithIcon: React.FC<ButtonWithIconProps> = ({
  labelKey,
  onClick,
  Icon,
  shouldShrink = true,
  variant = 'outlined',
  color = 'primary',
  disabled,
  labelProps,
  shrinkThreshold = 'md',
  ...buttonProps
}) => {
  const t = useTranslation();
  const isShrinkThreshold = useIsScreen(shrinkThreshold);

  // On small screens, if the button shouldShrink, then
  // only display a centered icon, with no text.
  const shrink = isShrinkThreshold && shouldShrink;
  const startIcon = shrink ? null : Icon;
  const centeredIcon = shrink ? Icon : null;
  const text = shrink ? null : t(labelKey, labelProps);

  return (
    <Tooltip disableHoverListener={!shrink} title={t(labelKey, labelProps)}>
      <span>
        <ShrinkableBaseButton
          disabled={disabled}
          shrink={shrink}
          onClick={onClick}
          variant={variant}
          color={color}
          size="small"
          startIcon={startIcon}
          {...buttonProps}
        >
          {centeredIcon}
          {text}
        </ShrinkableBaseButton>
      </span>
    </Tooltip>
  );
};

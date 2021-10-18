import React from 'react';
import { ButtonProps, Tooltip } from '@mui/material';
import {
  LocaleKey,
  LocaleProps,
  useTranslation,
} from '../../../../intl/intlHelpers';
import { useIsSmallScreen } from '../../../../hooks';
import { ShrinkableBaseButton } from './ShrinkableBaseButton';

interface ButtonWithIconProps extends ButtonProps {
  Icon: React.ReactNode;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  labelKey: LocaleKey;
  labelProps?: LocaleProps;
  shouldShrink?: boolean;
  variant?: 'outlined' | 'contained';
  color?: 'primary' | 'secondary';
  disabled?: boolean;
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
  ...buttonProps
}) => {
  const t = useTranslation();
  const isSmallScreen = useIsSmallScreen();

  // On small screens, if the button shouldShrink, then
  // only display a centered icon, with no text.
  const shrink = isSmallScreen && shouldShrink;
  const startIcon = shrink ? null : Icon;
  const centeredIcon = shrink ? Icon : null;
  const text = shrink ? null : t(labelKey, labelProps);

  return (
    <Tooltip title={t(labelKey)}>
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
    </Tooltip>
  );
};

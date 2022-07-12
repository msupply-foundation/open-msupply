import React from 'react';
import { LocaleKey, useTranslation } from '@common/intl';
import { ArrowRightIcon, CheckIcon, XCircleIcon } from '@common/icons';
import { ButtonWithIcon } from './ButtonWithIcon';

type DialogButtonVariant = 'cancel' | 'next' | 'ok';

interface DialogButtonProps {
  disabled?: boolean;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  variant: DialogButtonVariant;
  autoFocus?: boolean;
}

const getButtonProps = (
  variant: DialogButtonVariant
): {
  icon: JSX.Element;
  labelKey: LocaleKey;
  variant: 'outlined' | 'contained';
} => {
  switch (variant) {
    case 'cancel':
      return {
        icon: <XCircleIcon />,
        labelKey: 'button.cancel',
        variant: 'outlined',
      };
    case 'ok':
      return {
        icon: <CheckIcon />,
        labelKey: 'button.ok',
        variant: 'contained',
      };
    case 'next':
      return {
        icon: <ArrowRightIcon />,
        labelKey: 'button.ok-and-next',
        variant: 'contained',
      };
  }
};

export const DialogButton: React.FC<DialogButtonProps> = ({
  onClick,
  variant,
  disabled = false,
  autoFocus = false,
}) => {
  const t = useTranslation('common');
  const { variant: buttonVariant, icon, labelKey } = getButtonProps(variant);

  return (
    <ButtonWithIcon
      autoFocus={autoFocus}
      color="secondary"
      disabled={disabled}
      onClick={onClick}
      Icon={icon}
      variant={buttonVariant}
      label={t(labelKey)}
      tabIndex={variant === 'cancel' ? 1 : 0}
      sx={
        disabled
          ? {
              '& svg': { color: 'gray.main' },
              fontSize: '12px',
            }
          : {}
      }
    />
  );
};

import React from 'react';
import { LocaleKey, useTranslation } from '@common/intl';
import {
  ArrowRightIcon,
  CheckIcon,
  DeleteIcon,
  CopyIcon,
  SaveIcon,
  XCircleIcon,
  DownloadIcon,
} from '@common/icons';
import { ButtonWithIcon } from './ButtonWithIcon';

type DialogButtonVariant =
  | 'cancel'
  | 'next'
  | 'ok'
  | 'save'
  | 'copy'
  | 'delete'
  | 'export';

interface DialogButtonProps {
  disabled?: boolean;
  onClick: (
    event:
      | React.MouseEvent<HTMLButtonElement>
      | React.KeyboardEvent<HTMLButtonElement>
  ) => void;
  variant: DialogButtonVariant;
  autoFocus?: boolean;
  color?: 'primary';
  type?: 'button' | 'submit' | 'reset';
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
    case 'save':
      return {
        icon: <SaveIcon />,
        labelKey: 'button.save',
        variant: 'contained',
      };
    case 'delete':
      return {
        icon: <DeleteIcon />,
        labelKey: 'button.delete',
        variant: 'contained',
      };
    case 'copy':
      return {
        icon: <CopyIcon />,
        labelKey: 'link.copy-to-clipboard',
        variant: 'contained',
      };
    case 'export':
      return {
        icon: <DownloadIcon />,
        labelKey: 'button.export',
        variant: 'contained',
      };
  }
};

export const DialogButton: React.FC<DialogButtonProps> = ({
  onClick,
  variant,
  disabled = false,
  autoFocus = false,
  color,
  type,
}) => {
  const t = useTranslation();
  const { variant: buttonVariant, icon, labelKey } = getButtonProps(variant);

  return (
    <ButtonWithIcon
      autoFocus={autoFocus}
      color={color ?? 'secondary'}
      disabled={disabled}
      onClick={onClick}
      Icon={icon}
      variant={buttonVariant}
      label={t(labelKey)}
      tabIndex={variant === 'cancel' ? 1 : 0}
      type={type}
      onKeyDown={e => {
        if (e.key === 'Enter') {
          onClick(e);
        }
      }}
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

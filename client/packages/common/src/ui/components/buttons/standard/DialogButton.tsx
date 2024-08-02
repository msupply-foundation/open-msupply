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
  ArrowLeftIcon,
} from '@common/icons';
import { ButtonWithIcon } from './ButtonWithIcon';

type DialogButtonVariant =
  | 'cancel'
  | 'back'
  | 'next'
  | 'ok'
  | 'save'
  | 'copy'
  | 'delete'
  | 'export'
  | 'close';

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
  customLabel?: string;
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
    case 'back':
      return {
        icon: <ArrowLeftIcon />,
        labelKey: 'button.back',
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
    case 'close':
      return {
        icon: <XCircleIcon />,
        labelKey: 'button.close',
        variant: 'outlined',
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
  customLabel,
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
      label={customLabel ?? t(labelKey)}
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

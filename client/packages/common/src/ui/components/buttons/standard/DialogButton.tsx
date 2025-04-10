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
import { useKeyboardShortcut } from '@common/hooks';
import { ButtonWithIcon } from './ButtonWithIcon';
import { useRegisterActions } from 'kbar';
import { EnvUtils } from '@common/utils';

type DialogButtonVariant =
  | 'cancel'
  | 'back'
  | 'previous'
  | 'next-and-ok'
  | 'next'
  | 'ok'
  | 'save'
  | 'copy'
  | 'delete'
  | 'export'
  | 'close'
  | 'select';

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
  shouldShrink?: boolean;
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
    case 'next-and-ok':
      return {
        icon: <ArrowRightIcon />,
        labelKey: 'button.ok-and-next',
        variant: 'contained',
      };
    case 'next':
      return {
        icon: <ArrowRightIcon />,
        labelKey: 'button.next',
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
    case 'previous':
      return {
        icon: <ArrowLeftIcon />,
        labelKey: 'button.previous',
        variant: 'contained',
      };
    case 'select':
      return {
        icon: <CheckIcon />,
        labelKey: 'button.select',
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
  customLabel,
  shouldShrink,
}) => {
  const t = useTranslation();
  const { variant: buttonVariant, icon, labelKey } = getButtonProps(variant);
  const ref = React.useRef<HTMLButtonElement>(null);
  const altOrOptionString = EnvUtils.os === 'Mac OS' ? 'Option' : 'Alt';

  const isKeyValid = (e: KeyboardEvent) => {
    if (disabled) return false;

    switch (variant) {
      case 'save':
        return e.altKey && e.code === 'KeyS';
      case 'cancel':
        return e.code === 'Escape';
      default:
        return false;
    }
  };

  const getButtonActions = () => {
    switch (variant) {
      case 'save':
        return [
          {
            id: 'button:save',
            name: `${customLabel ?? t(labelKey)} (${altOrOptionString}+S)`,
            perform: () => ref.current?.click(),
          },
        ];
      case 'cancel':
        return [
          {
            id: 'button:cancel',
            name: `${customLabel ?? t(labelKey)} (Escape)`,
            keywords: 'cancel',
            perform: () => ref.current?.click(),
          },
        ];
      default:
        return [];
    }
  };

  // registers a keyboard shortcut for the button which fires even when focus is in an input
  useKeyboardShortcut(
    {
      isKeyValid,
      onKeyPressed: () => ref.current?.click(),
    },
    [disabled, variant]
  );

  // adds the command to the cmd+K menu so that the keys are visible
  useRegisterActions(getButtonActions(), [disabled, variant]);

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
      shouldShrink={shouldShrink}
      ref={ref}
    />
  );
};

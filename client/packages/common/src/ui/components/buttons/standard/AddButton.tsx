import React from 'react';
import { ButtonProps } from '@mui/material';
import { ButtonWithIcon } from './ButtonWithIcon';
import { PlusCircleIcon } from '@common/icons';
import { useRegisterActions } from 'kbar';
import { EnvUtils } from '@common/utils';

export interface AddButtonProps extends ButtonProps {
  onClick: () => void;
  label: string;
  shouldShrink?: boolean;
  variant?: 'outlined' | 'contained';
  color?: 'primary' | 'secondary' | 'error';
  disabled?: boolean;
  shrinkThreshold?: 'sm' | 'md' | 'lg' | 'xl';
}

export const AddButton = React.forwardRef<HTMLButtonElement, AddButtonProps>(
  (
    {
      label,
      onClick,

      shouldShrink = true,
      variant = 'outlined',
      color = 'primary',
      disabled,
      shrinkThreshold = 'md',
      ...buttonProps
    },
    ref
  ) => {
    const altOrOptionString = EnvUtils.os === 'Mac OS' ? 'Option' : 'Alt';

    useRegisterActions([
      {
        id: 'add',
        name: `${label} (${altOrOptionString}+N)`,
        shortcut: ['Alt+KeyN'],
        perform: onClick,
      },
    ]);

    return (
      <ButtonWithIcon
        Icon={<PlusCircleIcon />}
        disabled={disabled}
        shouldShrink={shouldShrink}
        shrinkThreshold={shrinkThreshold}
        onClick={onClick}
        variant={variant}
        color={color}
        size="small"
        startIcon={<PlusCircleIcon />}
        ref={ref}
        label={label}
        {...buttonProps}
      />
    );
  }
);

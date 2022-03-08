import React from 'react';
import ButtonGroup from '@mui/material/ButtonGroup';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { ChevronDownIcon } from '../../../icons';
import { ButtonWithIcon, ButtonWithIconProps } from './ButtonWithIcon';
import { ShrinkableBaseButton } from '@common/components';

export interface SplitButtonOption<T> {
  label: string;
  value?: T;
  isDisabled?: boolean;
}

export interface SplitButtonProps<T> {
  color?: ButtonWithIconProps['color'];
  ariaLabel?: string;
  ariaControlLabel?: string;
  options: SplitButtonOption<T>[];
  onClick: (option: SplitButtonOption<T>) => void;
  Icon?: ButtonWithIconProps['Icon'];
  isDisabled?: boolean;
  selectedOption: SplitButtonOption<T>;
  onSelectOption: (option: SplitButtonOption<T>) => void;
}

export const SplitButton = <T,>({
  color = 'secondary',
  ariaLabel,
  ariaControlLabel,
  options,
  onClick,
  Icon = null,
  isDisabled = false,
  selectedOption,
  onSelectOption,
}: SplitButtonProps<T>) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const buttonLabel = selectedOption.label;
  const open = !!anchorEl;

  return (
    <ButtonGroup color={color} variant="outlined" aria-label={ariaLabel}>
      <ButtonWithIcon
        color={color}
        disabled={isDisabled}
        sx={{
          borderRadius: 0,
          borderStartStartRadius: '24px',
          borderEndStartRadius: '24px',
        }}
        onClick={() => {
          onClick(selectedOption);
        }}
        label={buttonLabel}
        Icon={Icon}
      />

      <ShrinkableBaseButton
        shrink
        disabled={isDisabled}
        color={color}
        size="small"
        aria-controls={open ? ariaControlLabel : undefined}
        aria-expanded={open ? 'true' : undefined}
        aria-label={ariaLabel}
        aria-haspopup="menu"
        onClick={e => {
          setAnchorEl(e.currentTarget);
        }}
        sx={{
          borderRadius: 0,
          borderStartEndRadius: '24px',
          borderEndEndRadius: '24px',
        }}
      >
        <ChevronDownIcon />
      </ShrinkableBaseButton>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        elevation={5}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
      >
        {options.map(option => (
          <MenuItem
            key={option.label}
            disabled={option?.isDisabled}
            selected={option.value === selectedOption.value}
            onClick={() => {
              onSelectOption(option);
              setAnchorEl(null);
            }}
          >
            {option.label}
          </MenuItem>
        ))}
      </Menu>
    </ButtonGroup>
  );
};

import React from 'react';
import ButtonGroup from '@mui/material/ButtonGroup';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { ChevronDownIcon } from '../../../icons';
import { ButtonWithIcon, ButtonWithIconProps } from './ButtonWithIcon';
import { ShrinkableBaseButton, Tooltip } from '@common/components';
import { PopoverOrigin } from '@mui/material';

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
  label?: string;
  openFrom?: PopoverOrigin['vertical'];
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
  label,
  openFrom = 'top',
}: SplitButtonProps<T>) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const buttonLabel = selectedOption.label;
  const open = !!anchorEl;

  const popoverOrigin: {
    anchorOrigin: PopoverOrigin['vertical'];
    transformOrigin: PopoverOrigin['vertical'];
  } =
    openFrom === 'top'
      ? { anchorOrigin: 'top', transformOrigin: 'bottom' }
      : { anchorOrigin: 'bottom', transformOrigin: 'top' };

  return (
    <>
      <Tooltip title={label}>
        <ButtonGroup
          color={color}
          variant="outlined"
          aria-label={ariaLabel}
          sx={{
            boxShadow: theme => theme.shadows[2],
            borderRadius: 24,
          }}
        >
          <ButtonWithIcon
            color={color}
            disabled={isDisabled || selectedOption.isDisabled}
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
            shouldShrink={true}
            shrinkThreshold="md"
            variant="outlined"
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
              borderLeft: theme => `1px solid ${theme.palette.divider}`,
            }}
            label=""
            startIcon={<ChevronDownIcon />}
          />
        </ButtonGroup>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        elevation={5}
        anchorOrigin={{
          vertical: popoverOrigin.anchorOrigin,
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: popoverOrigin.transformOrigin,
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
    </>
  );
};

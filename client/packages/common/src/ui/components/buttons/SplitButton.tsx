import React from 'react';
import ButtonGroup from '@mui/material/ButtonGroup';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { ChevronDownIcon } from '../../icons';
import { ButtonWithIcon, ButtonWithIconProps } from './standard/ButtonWithIcon';
import { ShrinkableBaseButton } from '@common/components';

interface SplitButtonOption {
  label: string;
  value?: string;
  isDisabled?: boolean;
}

interface SplitButtonProps {
  color?: ButtonWithIconProps['color'];
  ariaLabel?: string;
  ariaControlLabel?: string;
  options: SplitButtonOption[];
  onClick: (option: SplitButtonOption) => void;
  Icon?: ButtonWithIconProps['Icon'];
  isDisabled?: boolean;
}

export const SplitButton = ({
  color = 'secondary',
  ariaLabel,
  ariaControlLabel,
  options,
  onClick,
  Icon = null,
  isDisabled = false,
}: SplitButtonProps) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  const buttonLabel = options[selectedIndex]?.label ?? '';
  const open = !!anchorEl;

  return (
    <>
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
            const selectedOption = options[selectedIndex];
            if (!selectedOption) {
              throw new Error('The selected index for an option is invalid');
            }

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
          {options.map((option, index) => (
            <MenuItem
              sx={{ zIndex: 1000000000 }}
              key={option.label}
              disabled={option?.isDisabled}
              selected={index === selectedIndex}
              onClick={() => {
                setSelectedIndex(index);
                setAnchorEl(null);
              }}
            >
              {option.label}
            </MenuItem>
          ))}
        </Menu>
      </ButtonGroup>
    </>
  );
};

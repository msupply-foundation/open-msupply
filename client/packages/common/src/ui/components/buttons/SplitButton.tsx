import React from 'react';

import ButtonGroup from '@mui/material/ButtonGroup';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import Grow from '@mui/material/Grow';
import Paper from '@mui/material/Paper';
import Popper from '@mui/material/Popper';
import MenuItem from '@mui/material/MenuItem';
import MenuList from '@mui/material/MenuList';
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
}

export const SplitButton = ({
  color = 'secondary',
  ariaLabel,
  ariaControlLabel,
  options,
  onClick,
  Icon = null,
}: SplitButtonProps) => {
  const [open, setOpen] = React.useState(false);
  const anchorRef = React.useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = React.useState(1);

  return (
    <>
      <ButtonGroup
        color={color}
        variant="outlined"
        ref={anchorRef}
        aria-label={ariaLabel}
      >
        <ButtonWithIcon
          color={color}
          sx={{ borderTopRightRadius: '0px', borderBottomRightRadius: '0px' }}
          onClick={() => {
            const selectedOption = options[selectedIndex];
            if (!selectedOption) {
              throw new Error('The selected index for an option is invalid');
            }

            onClick(selectedOption);
          }}
          label={options[selectedIndex]?.label ?? ''}
          Icon={Icon}
        />

        <ShrinkableBaseButton
          shrink
          color={color}
          size="small"
          aria-controls={open ? ariaControlLabel : undefined}
          aria-expanded={open ? 'true' : undefined}
          aria-label={ariaLabel}
          aria-haspopup="menu"
          onClick={() => {
            setOpen(prevOpen => !prevOpen);
          }}
          sx={{ borderTopLeftRadius: '0px', borderBottomLeftRadius: '0px' }}
        >
          <ChevronDownIcon />
        </ShrinkableBaseButton>
      </ButtonGroup>

      <Popper
        open={open}
        anchorEl={anchorRef.current}
        role={'menu'}
        transition
        disablePortal
      >
        {({ TransitionProps, placement }) => (
          <Grow
            {...TransitionProps}
            style={{
              transformOrigin:
                placement === 'bottom' ? 'center top' : 'center bottom',
            }}
          >
            <Paper elevation={5}>
              <ClickAwayListener
                onClickAway={event => {
                  if (
                    anchorRef.current &&
                    anchorRef.current.contains(event.target as HTMLElement)
                  ) {
                    return;
                  }

                  setOpen(false);
                }}
              >
                <MenuList>
                  {options.map((option, index) => (
                    <MenuItem
                      key={option.label}
                      disabled={option?.isDisabled}
                      selected={index === selectedIndex}
                      onClick={() => {
                        setSelectedIndex(index);
                        setOpen(false);
                      }}
                    >
                      {option.label}
                    </MenuItem>
                  ))}
                </MenuList>
              </ClickAwayListener>
            </Paper>
          </Grow>
        )}
      </Popper>
    </>
  );
};

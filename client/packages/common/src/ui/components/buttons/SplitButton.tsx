import React from 'react';
import Button from '@mui/material/Button';
import ButtonGroup, { ButtonGroupProps } from '@mui/material/ButtonGroup';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import Grow from '@mui/material/Grow';
import Paper from '@mui/material/Paper';
import Popper from '@mui/material/Popper';
import MenuItem from '@mui/material/MenuItem';
import MenuList from '@mui/material/MenuList';
import { ChevronDownIcon } from '../../icons';

const ops = [
  { label: 'Create a merge commit' },
  { label: 'Squash and merge' },
  { label: 'Rebase and merge' },
];

interface SplitButtonOption {
  label: string;
  value?: string;
  isDisabled?: boolean;
}

interface SplitButtonProps {
  color?: ButtonGroupProps['color'];
  ariaLabel?: string;
  ariaControlLabel?: string;
  options: SplitButtonOption[];
  onClick: (option: SplitButtonOption) => void;
}

export const SplitButton = ({
  color = 'primary',
  ariaLabel,
  ariaControlLabel,
  options = ops,
  onClick,
}: SplitButtonProps) => {
  const [open, setOpen] = React.useState(false);
  const anchorRef = React.useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = React.useState(1);

  return (
    <>
      <ButtonGroup
        color={color}
        variant="contained"
        ref={anchorRef}
        aria-label={ariaLabel}
      >
        <Button
          sx={{
            borderTopLeftRadius: '24px',
            borderBottomLeftRadius: '24px',
          }}
          onClick={() => {
            const selectedOption = options[selectedIndex];
            if (!selectedOption) {
              throw new Error('The selected index for an option is invalid');
            }

            onClick(selectedOption);
          }}
        >
          {options[selectedIndex]?.label}
        </Button>
        <Button
          size="small"
          aria-controls={open ? ariaControlLabel : undefined}
          aria-expanded={open ? 'true' : undefined}
          aria-label={ariaLabel}
          aria-haspopup="menu"
          onClick={() => {
            setOpen(prevOpen => !prevOpen);
          }}
          sx={{ borderTopRightRadius: '24px', borderBottomRightRadius: '24px' }}
        >
          <ChevronDownIcon />
        </Button>
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

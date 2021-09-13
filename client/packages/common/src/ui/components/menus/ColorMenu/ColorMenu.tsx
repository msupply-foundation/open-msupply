import { Paper, Popover } from '@material-ui/core';
import React, { FC } from 'react';
import { Circle } from '../../../icons';

export interface Color {
  hex: string;
  name: string;
}

interface ColorMenuProps {
  colors?: Color[];
  anchorEl: HTMLButtonElement | null;
  onClick: (color: Color) => void;
  onClose: () => void;
}

const defaultColors = [
  { hex: '#004fc4', name: 'blue' },
  { hex: '#05a660', name: 'green' },
  { hex: '#ff3b3b', name: 'red' },
  { hex: '#fc0', name: 'yellow' },
  { hex: '#00b7c4', name: 'aqua' },
  { hex: '#8f90a6', name: 'grey' },
];

export const ColorMenu: FC<ColorMenuProps> = ({
  colors = defaultColors,
  anchorEl,
  onClose,
  onClick,
}) => (
  <Popover
    anchorEl={anchorEl}
    onClose={onClose}
    sx={{
      '& .MuiPaper-root': {
        borderRadius: '24px',
      },
    }}
    anchorOrigin={{
      vertical: 'center',
      horizontal: 'left',
    }}
    transformOrigin={{
      vertical: 'center',
      horizontal: 'left',
    }}
    open={Boolean(anchorEl)}
  >
    <Paper
      sx={{
        width: 33.3 * colors.length,
        height: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '15px 16px 17px 15px',
      }}
    >
      {colors.map(({ hex, name }) => (
        <Circle
          role="button"
          aria-label={name}
          key={hex}
          onClick={e => {
            e.stopPropagation();
            onClick({ hex, name });
            onClose();
          }}
          htmlColor={hex}
          sx={{ width: '20px', cursor: 'pointer' }}
        />
      ))}
    </Paper>
  </Popover>
);

import React, { useState } from 'react';
import {
  ColorMenu,
  Color,
  IconButton,
  Box,
} from '@openmsupply-client/common';
import { CircleIcon } from '@common/icons';

interface ColorPickerPreferenceProps {
  value: string;
  onChange: (color: string) => void;
  disabled?: boolean;
}

export const ColorPickerPreference: React.FC<ColorPickerPreferenceProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled) {
      setAnchorEl(event.currentTarget);
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleColorSelect = (color: Color) => {
    onChange(color.hex);
    handleClose();
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <IconButton
        onClick={handleClick}
        disabled={disabled}
        aria-label="select color"
        sx={{
          width: 40,
          height: 40,
          border: '2px solid',
          borderColor: 'divider',
          '&:hover': {
            borderColor: 'primary.main',
          },
        }}
      >
        <CircleIcon
          htmlColor={value || '#004fc4'}
          sx={{ width: 28, height: 28 }}
        />
      </IconButton>
      <ColorMenu
        anchorEl={anchorEl}
        onClose={handleClose}
        onClick={handleColorSelect}
      />
    </Box>
  );
};

import React, { useState } from 'react';
import {
  ColorMenu,
  Color,
  Box,
  BasicTextInput,
} from '@openmsupply-client/common';
import { IconButton, Paper, Popover, Typography } from '@mui/material';
import { CircleIcon } from '@common/icons';

const DEFAULT_COLOR = '#004fc4';

// Validate hex color format (#RGB, #RRGGBB, or without #)
const isValidHexColor = (hex: string): boolean => {
  const hexPattern = /^#?([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  return hexPattern.test(hex);
};

// Normalize hex color to include # prefix and expand short form
const normalizeHexColor = (hex: string): string => {
  let normalized = hex.trim();
  
  // Add # if missing
  if (!normalized.startsWith('#')) {
    normalized = '#' + normalized;
  }
  
  // Expand short form (#RGB to #RRGGBB)
  if (normalized.length === 4) {
    normalized = '#' + normalized[1] + normalized[1] + normalized[2] + normalized[2] + normalized[3] + normalized[3];
  }
  
  return normalized.toLowerCase();
};

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
  const [customColor, setCustomColor] = useState('');
  const [hexError, setHexError] = useState(false);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled) {
      setAnchorEl(event.currentTarget);
      setCustomColor(value || '');
      setHexError(false);
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
    setCustomColor('');
    setHexError(false);
  };

  const handleColorSelect = (color: Color) => {
    onChange(color.hex);
    handleClose();
  };

  const handleCustomColorChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = event.target.value;
    setCustomColor(inputValue);
    
    if (inputValue.trim() === '') {
      setHexError(false);
      return;
    }
    
    if (isValidHexColor(inputValue)) {
      setHexError(false);
      const normalized = normalizeHexColor(inputValue);
      onChange(normalized);
    } else {
      setHexError(true);
    }
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
          htmlColor={value || DEFAULT_COLOR}
          sx={{ width: 28, height: 28 }}
        />
      </IconButton>
      <Popover
        anchorEl={anchorEl}
        onClose={handleClose}
        sx={{
          '& .MuiPaper-root': {
            borderRadius: '16px',
          },
        }}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        open={Boolean(anchorEl)}
      >
        <Paper
          sx={{
            padding: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            minWidth: 250,
          }}
        >
          <Box>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
              Preset Colors
            </Typography>
            <ColorMenu
              anchorEl={anchorEl}
              onClose={() => {}}
              onClick={handleColorSelect}
            />
          </Box>
          
          <Box>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
              Custom Color
            </Typography>
            <BasicTextInput
              value={customColor}
              onChange={handleCustomColorChange}
              placeholder="#RRGGBB or #RGB"
              error={hexError}
              helperText={hexError ? 'Invalid hex color format' : 'Enter hex color (e.g., #004fc4)'}
              fullWidth
              disabled={disabled}
            />
          </Box>
        </Paper>
      </Popover>
    </Box>
  );
};

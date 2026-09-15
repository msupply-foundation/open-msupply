import React, { useState } from 'react';
import {
  ColorMenu,
  Color,
  Box,
  Tooltip,
  useTranslation,
} from '@openmsupply-client/common';
import { IconButton } from '@mui/material';
import { CircleIcon } from '@common/icons';
import { useTheme } from '@common/styles';

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
  const theme = useTheme();
  const t = useTranslation();

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled) {
      setAnchorEl(event.currentTarget);
      setCustomColor(value || '');
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
    setCustomColor('');
  };

  const handleColorSelect = (color: Color) => {
    onChange(color.hex);
    handleClose();
  };

  const handleClear = () => {
    onChange('');
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <ColorMenu
        anchorEl={anchorEl}
        onClose={handleClose}
        onClick={handleColorSelect}
        allowCustom={true}
        customColorValue={customColor}
        onClear={handleClear}
      />
      <Tooltip title={t('button.select-a-color')}>
        <IconButton
          onClick={handleClick}
          disabled={disabled}
          aria-label="select color"
          sx={{
            width: 40,
            height: 40,
          }}
        >
          <CircleIcon
            htmlColor={value || theme.palette.gray.main}
            sx={{ width: 24, height: 24 }}
          />
        </IconButton>
      </Tooltip>
    </Box>
  );
};

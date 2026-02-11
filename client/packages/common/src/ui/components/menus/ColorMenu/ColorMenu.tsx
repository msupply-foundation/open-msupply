import { Paper, Popover, Typography, Box } from '@mui/material';
import React, { FC } from 'react';
import { CircleIcon } from '@common/icons';
import { BasicTextInput } from '../../inputs';
import { useTranslation } from '@common/intl';

export interface Color {
  hex: string;
  name: string;
}

interface ColorMenuProps {
  colors?: Color[];
  anchorEl: HTMLButtonElement | null;
  onClick: (color: Color) => void;
  onClose: () => void;
  allowCustom?: boolean;
  customColorValue?: string;
}

const defaultColors = [
  { hex: '#004fc4', name: 'blue' },
  { hex: '#05a660', name: 'green' },
  { hex: '#ff3b3b', name: 'red' },
  { hex: '#ffcc00', name: 'yellow' },
  { hex: '#00b7c4', name: 'aqua' },
  { hex: '#8f90a6', name: 'grey' },
];

// Validate hex color format (#RRGGBB or without #)
const isValidHexColor = (hex: string): boolean => {
  const hexPattern = /^#?([A-Fa-f0-9]{6})$/;
  return hexPattern.test(hex);
};

// Normalize hex color to include # prefix
const normalizeHexColor = (hex: string): string => {
  let normalized = hex.trim();

  // Add # if missing
  if (!normalized.startsWith('#')) {
    normalized = '#' + normalized;
  }

  return normalized.toLowerCase();
};

export const ColorMenu: FC<ColorMenuProps> = ({
  colors = defaultColors,
  anchorEl,
  onClose,
  onClick,
  allowCustom = false,
  customColorValue = '',
}) => {
  const t = useTranslation();
  const [customColor, setCustomColor] = React.useState('');
  const [hexError, setHexError] = React.useState(false);

  // Update internal state when customColorValue prop changes (e.g., when popover opens)
  React.useEffect(() => {
    if (anchorEl && customColorValue) {
      setCustomColor(customColorValue);
    }
  }, [anchorEl, customColorValue]);

  const handleCustomColorChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const inputValue = event.target.value;
    setCustomColor(inputValue);

    if (inputValue.trim() === '') {
      setHexError(false);
      return;
    }

    const isValid = isValidHexColor(inputValue);
    setHexError(!isValid);
  };

  const handleCustomColorClick = () => {
    if (customColor.trim() !== '' && !hexError) {
      const normalized = normalizeHexColor(customColor);
      onClick({ hex: normalized, name: 'custom' });
      onClose();
    }
  };

  const colorCircles = colors.map(({ hex, name }) => (
    <CircleIcon
      role="button"
      aria-label={name}
      key={hex}
      onClick={e => {
        e.stopPropagation();
        onClick({ hex, name });
        onClose();
      }}
      htmlColor={hex}
      sx={{
        width: allowCustom ? '24px' : '20px',
        height: allowCustom ? '24px' : '20px',
        cursor: 'pointer',
        '&:hover': {
          transform: 'scale(1.15)',
          transition: 'transform 0.2s',
        },
      }}
    />
  ));

  return (
    <Popover
      anchorEl={anchorEl}
      onClose={onClose}
      sx={{
        '& .MuiPaper-root': {
          borderRadius: allowCustom ? '16px' : '24px',
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
          width: allowCustom ? 'auto' : 33.3 * colors.length,
          minWidth: allowCustom ? 250 : undefined,
          height: 'auto',
          display: 'flex',
          flexDirection: allowCustom ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: allowCustom ? 2 : '15px 16px 17px 15px',
          gap: allowCustom ? 2 : 0,
        }}
      >
        {allowCustom ? (
          <>
            <Box sx={{ width: '100%' }}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                {t('label.colour-preset')}
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1.5,
                }}
              >
                {colorCircles}
              </Box>
            </Box>
            <Box sx={{ width: '100%' }}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                {t('label.colour-custom')}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <Box sx={{ flex: 1 }}>
                  <BasicTextInput
                    value={customColor}
                    onChange={handleCustomColorChange}
                    placeholder="#RRGGBB"
                    error={hexError}
                    helperText={
                      hexError
                        ? t('message.colour-invalid-format')
                        : t('message.colour-enter-hex')
                    }
                    fullWidth
                  />
                </Box>
                <CircleIcon
                  role="button"
                  aria-label={t('label.colour-preview')}
                  onClick={handleCustomColorClick}
                  htmlColor={
                    customColor.trim() !== '' && !hexError
                      ? normalizeHexColor(customColor)
                      : '#cccccc'
                  }
                  sx={{
                    width: '40px',
                    height: '40px',
                    cursor:
                      customColor.trim() !== '' && !hexError
                        ? 'pointer'
                        : 'not-allowed',
                    opacity: customColor.trim() !== '' && !hexError ? 1 : 0.5,
                    border: '2px solid',
                    borderColor: 'divider',
                    borderRadius: '50%',
                    '&:hover': {
                      transform:
                        customColor.trim() !== '' && !hexError
                          ? 'scale(1.1)'
                          : 'none',
                      transition: 'transform 0.2s',
                    },
                  }}
                />
              </Box>
            </Box>
          </>
        ) : (
          colorCircles
        )}
      </Paper>
    </Popover>
  );
};

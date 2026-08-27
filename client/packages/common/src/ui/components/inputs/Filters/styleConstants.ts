import { SxProps, Theme } from '@mui/material';

export const FilterLabelSx: SxProps<Theme> = {
  '& .MuiInputLabel-root': {
    zIndex: 100,
    top: '4px',
    left: '8px',
    color: 'gray.main',
  },
  '& .MuiInputLabel-root.Mui-focused': {
    color: 'secondary.main',
  },
};

import { SxProps, Theme } from '@mui/material';

export const getTextFieldSx = (
  _hasLabel: boolean,
  dateOnly: boolean,
  width?: number | string
): SxProps<Theme> => ({
  '& .MuiPickersOutlinedInput-root': {
    backgroundColor: '#ffffff',
    // Prevent the section list + calendar icon from being clipped when the
    // container is narrow. Date-only (MM/YYYY) needs ~160px minimum.
    minWidth: dateOnly ? 160 : 200,
    '&.Mui-disabled': {
      backgroundColor: 'rgba(0, 0, 0, 0.04)',
    },
  },
  '& .MuiPickersSectionList-root': {
    color: 'gray.dark',
  },
  '& .MuiFormHelperText-root': {
    whiteSpace: 'normal',
    width: dateOnly ? '200px' : width,
  },
});

export const getPaperSx = () => ({
  '& .Mui-selected': {
    backgroundColor: 'primary.main!important',
  },
  '& .Mui-selected:focus': {
    backgroundColor: 'primary.main',
  },
  '& .Mui-selected:hover': {
    backgroundColor: 'primary.dark',
  },
});

export const getActionBarSx = () => ({
  '& .MuiButton-root': {
    color: 'primary.main',
  },
});

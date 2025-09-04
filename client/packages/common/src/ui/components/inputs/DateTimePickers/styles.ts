import { SxProps, Theme } from '@mui/material';

export const getTextFieldSx = (
  theme: Theme,
  hasLabel: boolean,
  dateOnly: boolean,
  inputSx?: SxProps,
  width?: number | string
) => ({
  border: 'none',
  color: 'gray',
  '& .MuiPickersOutlinedInput-root': {
    backgroundColor: theme.palette.background.menu,
    height: '36px',
    marginTop: hasLabel ? '16px' : 0,
    padding: '0 8px',
    borderRadius: '8px',
    '&.Mui-focused:not(.Mui-error)': {
      '& .MuiPickersOutlinedInput-notchedOutline': {
        border: 'none',
        borderBottom: 'solid 2px',
        borderColor: `${theme.palette.secondary.light}`,
        borderRadius: 0,
      },
    },
    '&.Mui-error': {
      '& .MuiPickersOutlinedInput-notchedOutline': {
        borderWidth: '2px',
        borderStyle: 'solid',
      },
    },
    ...inputSx,
  },
  '& .MuiPickersOutlinedInput-notchedOutline': {
    border: 'none',
  },
  '& .MuiInputAdornment-root': {
    marginLeft: 0,
  },
  '& .MuiPickersSectionList-root': {
    color: 'gray.dark',
  },
  '& .MuiInputLabel-root': {
    top: '6px',
    color: 'gray.main',
    '&.Mui-focused': {
      color: 'gray.main',
    },
  },
  '& .MuiFormHelperText-root': {
    whiteSpace: 'normal',
    width: dateOnly ? '200px' : width,
  },
});

export const getPaperSx = (theme: Theme) => ({
  '& .Mui-selected': {
    backgroundColor: `${theme.palette.secondary.main}!important`,
  },
  '& .Mui-selected:focus': {
    backgroundColor: `${theme.palette.secondary.main}`,
  },
  '& .Mui-selected:hover': {
    backgroundColor: `${theme.palette.secondary.main}`,
  },
});

export const getActionBarSx = (theme: Theme) => ({
  '& .MuiButton-root': {
    color: `${theme.palette.secondary.main}`,
  },
});

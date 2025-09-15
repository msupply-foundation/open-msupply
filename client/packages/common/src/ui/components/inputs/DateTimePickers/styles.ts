import { SxProps } from '@mui/material';

export const getTextFieldSx = (
  hasLabel: boolean,
  dateOnly: boolean,
  inputSx?: SxProps,
  width?: number | string
) => ({
  border: 'none',
  color: 'gray',
  '& .MuiPickersOutlinedInput-root': {
    backgroundColor: 'background.input.main',
    height: '36px',
    marginTop: hasLabel ? '16px' : 0,
    padding: '0 8px',
    borderRadius: '8px',
    '&.Mui-focused:not(.Mui-error)': {
      '& .MuiPickersOutlinedInput-notchedOutline': {
        border: 'none',
        borderBottom: 'solid 2px',
        borderColor: 'secondary.light',
        borderRadius: 0,
      },
    },
    '&.Mui-error': {
      '& .MuiPickersOutlinedInput-notchedOutline': {
        borderWidth: '2px',
        borderStyle: 'solid',
      },
    },
    '&.Mui-disabled': {
      backgroundColor: 'background.input.disabled',
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

export const getPaperSx = () => ({
  '& .Mui-selected': {
    backgroundColor: 'secondary.main!important',
  },
  '& .Mui-selected:focus': {
    backgroundColor: 'secondary.main',
  },
  '& .Mui-selected:hover': {
    backgroundColor: 'secondary.main',
  },
});

export const getActionBarSx = () => ({
  '& .MuiButton-root': {
    color: 'secondary.main',
  },
});

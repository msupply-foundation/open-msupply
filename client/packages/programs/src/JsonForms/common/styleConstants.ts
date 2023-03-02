import { Theme } from '@mui/material';
import { SxProps } from '@mui/system';

export const FORM_LABEL_WIDTH = 40;
export const FORM_LABEL_COLUMN_WIDTH = `${FORM_LABEL_WIDTH}%`;
export const FORM_INPUT_COLUMN_WIDTH = `${100 - FORM_LABEL_WIDTH}%`;

export const DefaultFormRowSpacing: SxProps<Theme> = {
  gap: 2,
  margin: 0.5,
  marginLeft: 0,
};

/** Default sx style for a single form row. */
export const DefaultFormRowSx: SxProps<Theme> = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-around',
  minWidth: '300px',
  ...DefaultFormRowSpacing,
};

import { Theme } from '@mui/material';
import { SxProps } from '@mui/system';

export const FORM_LABEL_WIDTH = 40;
export const FORM_LABEL_COLUMN_WIDTH = `${FORM_LABEL_WIDTH}%`;
export const FORM_INPUT_COLUMN_WIDTH = `${100 - FORM_LABEL_WIDTH}%`;

/** Default sx style for a single form row. */
export const DefaultFormRowSx: SxProps<Theme> = {
  margin: 0.5,
  marginLeft: 0,
  gap: 2,
};

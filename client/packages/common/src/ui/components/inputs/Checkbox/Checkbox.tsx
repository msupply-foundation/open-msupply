import React, { FC } from 'react';
import MuiCheckbox, { CheckboxProps } from '@material-ui/core/Checkbox';

// TODO: Change icons to be consistent with Zeplin designs
export const Checkbox: FC<CheckboxProps> = props => {
  return <MuiCheckbox size="small" color="secondary" {...props} />;
};

import React, { FC } from 'react';
import MuiCheckbox, { CheckboxProps } from '@mui/material/Checkbox';

import {
  CheckboxEmptyIcon,
  CheckboxCheckedIcon,
  CheckboxIndeterminateIcon,
} from '../../../icons';

export const Checkbox: FC<CheckboxProps> = props => {
  return (
    <MuiCheckbox
      color="darkGrey"
      size="small"
      icon={<CheckboxEmptyIcon />}
      checkedIcon={<CheckboxCheckedIcon />}
      indeterminateIcon={<CheckboxIndeterminateIcon />}
      {...props}
    />
  );
};

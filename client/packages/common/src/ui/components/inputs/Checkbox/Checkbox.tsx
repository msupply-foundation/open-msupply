import React, { FC } from 'react';
import MuiCheckbox, { CheckboxProps } from '@mui/material/Checkbox';

import {
  CheckboxEmpty,
  CheckboxChecked,
  CheckboxIndeterminate,
} from '../../../icons';

export const Checkbox: FC<CheckboxProps> = props => {
  return (
    <MuiCheckbox
      color="darkGrey"
      size="small"
      icon={<CheckboxEmpty />}
      checkedIcon={<CheckboxChecked />}
      indeterminateIcon={<CheckboxIndeterminate />}
      {...props}
    />
  );
};

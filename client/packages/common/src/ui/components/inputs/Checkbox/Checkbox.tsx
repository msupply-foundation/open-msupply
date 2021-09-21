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
      size="small"
      icon={<CheckboxEmpty color="secondary" />}
      checkedIcon={<CheckboxChecked color="secondary" />}
      indeterminateIcon={<CheckboxIndeterminate color="secondary" />}
      {...props}
    />
  );
};

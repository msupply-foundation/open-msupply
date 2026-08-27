import React, { FC } from 'react';
import MuiCheckbox, { CheckboxProps } from '@mui/material/Checkbox';

import {
  CheckboxEmptyIcon,
  CheckboxCheckedIcon,
  CheckboxIndeterminateIcon,
} from '@common/icons';

export const Checkbox: FC<CheckboxProps> = props => {
  return (
    <MuiCheckbox
      color="outline"
      size="small"
      icon={<CheckboxEmptyIcon />}
      checkedIcon={<CheckboxCheckedIcon />}
      indeterminateIcon={<CheckboxIndeterminateIcon />}
      {...props}
    />
  );
};

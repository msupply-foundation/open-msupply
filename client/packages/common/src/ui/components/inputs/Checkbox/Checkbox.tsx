import React, { FC } from 'react';
import MuiCheckbox, { CheckboxProps } from '@material-ui/core/Checkbox';

import {
  CheckboxEmpty,
  CheckboxChecked,
  CheckboxDisabled,
} from '../../../icons';

export const Checkbox: FC<CheckboxProps> = props => {
  return (
    <MuiCheckbox
      size="small"
      icon={<CheckboxEmpty color="secondary" />}
      checkedIcon={<CheckboxChecked color="secondary" />}
      indeterminateIcon={<CheckboxDisabled color="secondary" />}
      {...props}
    />
  );
};

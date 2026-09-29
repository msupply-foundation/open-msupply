import React, { FC } from 'react';
import MuiCheckbox, { CheckboxProps } from '@mui/material/Checkbox';

import {
  CheckboxEmptyIcon,
  CheckboxCheckedIcon,
  CheckboxIndeterminateIcon,
} from '@common/icons';

interface Props extends CheckboxProps {
  /** Placed on the underlying input, for deterministic e2e hooks. As Switch's. */
  testId?: string;
}

export const Checkbox: FC<Props> = ({ testId, slotProps, ...props }) => {
  return (
    <MuiCheckbox
      color="outline"
      size="small"
      icon={<CheckboxEmptyIcon />}
      checkedIcon={<CheckboxCheckedIcon />}
      indeterminateIcon={<CheckboxIndeterminateIcon />}
      {...props}
      slotProps={{
        ...slotProps,
        input: {
          ...slotProps?.input,
          ...(testId ? { 'data-testid': testId } : {}),
        },
      }}
    />
  );
};

import React, { ReactNode } from 'react';
import { InputWithLabelRow } from '@openmsupply-client/common';

interface PreferenceLabelRowProps {
  label: string;
  Input: ReactNode;
  isLast?: boolean;
}

export const PreferenceLabelRow = ({
  label,
  Input,
  isLast = false,
}: PreferenceLabelRowProps) => {
  return (
    <InputWithLabelRow
      labelWidth={'100%'}
      label={label}
      Input={Input}
      sx={{
        borderBottom: isLast ? 'none' : '1px dashed',
        borderColor: 'gray.main',
        padding: 1,
      }}
    />
  );
};

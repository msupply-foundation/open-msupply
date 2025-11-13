import React, { ReactNode } from 'react';
import { InputWithLabelRow } from '@openmsupply-client/common';

interface PreferenceLabelRowProps {
  label: string;
  Input: ReactNode;
  sx?: Record<string, unknown>;
}

export const PreferenceLabelRow = ({
  label,
  Input,
  sx,
}: PreferenceLabelRowProps) => {
  return (
    <InputWithLabelRow
      labelWidth={'100%'}
      label={label}
      Input={Input}
      sx={sx}
    />
  );
};

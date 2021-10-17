import React, { FC, ReactNode } from 'react';
import { FormLabel, Box } from '@mui/material';
import { BasicTextInput } from './BasicTextInput';
import { useTranslation, LocaleKey } from '../../../../intl/intlHelpers';

interface InputWithLabelRowProps {
  Input: ReactNode;
  label: LocaleKey;
}

export const InputWithLabelRow: FC<InputWithLabelRowProps> = ({
  label,
  Input = <BasicTextInput />,
}) => {
  const t = useTranslation();

  return (
    <Box display="flex" alignItems="center" gap={1}>
      <FormLabel sx={{ width: 120, fontWeight: 'bold' }}>{t(label)}:</FormLabel>
      {Input}
    </Box>
  );
};

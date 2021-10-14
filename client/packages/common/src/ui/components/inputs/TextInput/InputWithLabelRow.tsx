import React, { FC, ReactNode } from 'react';
import { Grid, FormLabel } from '@mui/material';
import { BasicTextInput } from './BasicTextInput';

interface InputWithLabelRowProps {
  Input: ReactNode;
}

export const InputWithLabelRow: FC<InputWithLabelRowProps> = ({
  Input = <BasicTextInput />,
}) => {
  return (
    <Grid display="flex" alignItems="center" gap={1}>
      <FormLabel sx={{ fontWeight: 'bold' }}>Customer name:</FormLabel>
      {Input}
    </Grid>
  );
};

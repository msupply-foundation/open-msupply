import React from 'react';
import {
  BasicTextInput,
  InputWithLabelRow,
  InputWithLabelRowProps,
  useTranslation,
} from '@openmsupply-client/common';
import { StockDonorEditProps } from './StockDonorEdit';

export const StockDonorEditInput = ({ data }: StockDonorEditProps) => {
  const t = useTranslation('common');
  const [donor, setDonor] = React.useState<string>('donor');

  const StyledInputRow = ({ label, Input }: InputWithLabelRowProps) => (
    <InputWithLabelRow
      label={label}
      Input={Input}
      labelProps={{ sx: { textAlign: 'end' } }}
      labelWidth="100px"
      sx={{
        justifyContent: 'space-between',
        '.MuiFormControl-root > .MuiInput-root, > input': {
          maxWidth: '160px',
        },
      }}
    />
  );

  console.log('data', data);

  return (
    <StyledInputRow
      label={t('label.donor')}
      Input={
        <BasicTextInput
          value={donor}
          onChange={e => setDonor(e.target.value)}
        />
      }
    />
  );
};

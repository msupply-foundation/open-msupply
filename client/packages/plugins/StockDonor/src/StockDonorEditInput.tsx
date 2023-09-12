import React from 'react';
import {
  BasicTextInput,
  InputWithLabelRow,
  InputWithLabelRowProps,
  PluginComponent,
  useTranslation,
} from '@openmsupply-client/common';
import { StockLineRowFragment } from '@openmsupply-client/system';

const StockDonorEditInput: PluginComponent<StockLineRowFragment> = ({
  data,
}) => {
  const t = useTranslation('common');
  const [donor, setDonor] = React.useState(data?.supplierName ?? '');

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
export default StockDonorEditInput;

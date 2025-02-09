import React, { useCallback, useEffect } from 'react';
import {
  BasicTextInput,
  InputWithLabelRow,
  InputWithLabelRowProps,
  useTranslation,
} from '@openmsupply-client/common';
import { StockDonorEditPlugin } from './StockDonorEdit';
import { usePluginData } from './api';

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

const StockDonorEditInput: StockDonorEditPlugin = ({ stockLine, events }) => {
  const t = useTranslation('common');
  const [donor, setDonor] = React.useState<string>('');
  const { data: stockLineNodes } = usePluginData.data([stockLine?.id ?? '']);
  const data = stockLineNodes?.[0];
  const { mutate } = data?.id ? usePluginData.update() : usePluginData.insert();

  const onSave = useCallback(async () => {
    mutate({ id: data?.id, data: donor, stockLineId: stockLine?.id });
  }, [donor, stockLine, mutate, data?.id]);

  useEffect(() => {
    const unmountEvent = events.mountEvent(onSave);
    return unmountEvent;
  }, [onSave]);

  useEffect(() => {
    if (data !== undefined) setDonor(data?.data ?? '');
  }, [data]);

  return (
    <StyledInputRow
      label={t('label.donor')}
      Input={
        <BasicTextInput
          value={donor}
          onChange={e => {
            setDonor(e.target.value);
            events.setIsDirty(true);
          }}
        />
      }
    />
  );
};

export default StockDonorEditInput;

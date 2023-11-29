import React, { useCallback, useEffect } from 'react';
import {
  BasicTextInput,
  InputWithLabelRow,
  InputWithLabelRowProps,
  PluginEventListener,
  usePluginEvents,
  useTranslation,
} from '@openmsupply-client/common';
import { StockDonorEditProps } from './StockDonorEdit';
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

const StockDonorEditInput = ({ data: stockLine }: StockDonorEditProps) => {
  const t = useTranslation('common');
  const [donor, setDonor] = React.useState<string>('');
  const { addEventListener, removeEventListener, dispatchEvent } =
    usePluginEvents();
  const { data } = usePluginData.data(stockLine?.id ?? '');
  const { mutate } = data?.id ? usePluginData.update() : usePluginData.insert();

  const onSave = useCallback(() => {
    mutate({ id: data?.id, data: donor, stockLineId: stockLine?.id });
  }, [donor, stockLine, mutate, data?.id]);

  useEffect(() => {
    const listener: PluginEventListener = {
      eventType: 'onSaveStockEditForm',
      listener: onSave,
    };
    addEventListener(listener);

    return () => removeEventListener(listener);
  }, [onSave, addEventListener, removeEventListener]);

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
            dispatchEvent('onChangeStockEditForm', new Event(stockLine.id));
          }}
        />
      }
    />
  );
};
export default StockDonorEditInput;

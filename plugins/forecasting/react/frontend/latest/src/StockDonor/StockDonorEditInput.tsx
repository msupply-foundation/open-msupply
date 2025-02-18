import React, { useEffect, useRef } from 'react';
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
  const { data: stockLineNodes } = usePluginData.data([stockLine.id]);
  const { mutate: insert } = usePluginData.insert();
  const { mutate: update } = usePluginData.update();

  // Current donor needs to be available when mutating, which is triggered by core
  // we can either mount new event every time donor changes on us ref like this
  // can also use setDonor(donor => ..) to access current state, but seem hacky
  const donorRef = useRef('');
  donorRef.current = donor;

  console.log(stockLineNodes);
  useEffect(() => {
    if (!stockLineNodes) return;
    const initialDonor = stockLineNodes?.[0];

    const unmountEvent = events.mountEvent(async () => {
      const mutate = !!initialDonor?.id ? update : insert;

      mutate({
        id: initialDonor?.id,
        // This will always be current value
        data: donorRef.current,
        stockLineId: stockLine.id,
      });
    });

    setDonor(initialDonor?.data || '');

    return unmountEvent;
  }, [stockLineNodes]);

  return (
    <StyledInputRow
      label={t('label.donor')}
      Input={
        <BasicTextInput
          value={donor}
          onChange={e => {
            setDonor(e.target.value);
            events.setState({ isDirty: false });
          }}
        />
      }
    />
  );
};

export default StockDonorEditInput;

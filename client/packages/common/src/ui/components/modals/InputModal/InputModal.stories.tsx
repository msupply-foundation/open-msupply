import React, { useState } from 'react';
import {
  BaseButton,
  BasicTextInput,
  NumericTextInput,
} from '@common/components';
import { useToggle } from '@common/hooks';
import { InputModal } from './InputModal';
import { Box } from '@mui/material';

export default {
  title: 'Modals/InputModal',
};

const delay = () => new Promise(r => setTimeout(r, 1000));

export const BasicExample = () => {
  const modalController = useToggle();
  const [val, setVal] = useState('');

  return (
    <Box width={300}>
      <BaseButton onClick={modalController.toggleOn}>Open modal</BaseButton>
      <InputModal
        title="Example modal!"
        isOpen={modalController.isOn}
        onClose={modalController.toggleOff}
        Input={
          <BasicTextInput autoFocus onChange={e => setVal(e.target.value)} />
        }
        onChange={async () => {
          await delay();
          alert(val);
        }}
      />
    </Box>
  );
};

export const NumberInputModalExample = () => {
  const modalController = useToggle();
  const [val, setVal] = useState<number>();

  return (
    <Box width={300}>
      <BaseButton onClick={modalController.toggleOn}>Open modal</BaseButton>
      <InputModal
        title="Enter a new tax rate"
        isOpen={modalController.isOn}
        onClose={modalController.toggleOff}
        Input={
          <NumericTextInput
            autoFocus
            defaultValue={10}
            onChange={num => setVal(num)}
            max={100}
            value={val}
            decimalLimit={2}
          />
        }
        onChange={async () => {
          await delay();
          alert(val);
        }}
      />
    </Box>
  );
};

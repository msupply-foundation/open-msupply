import React, { useState } from 'react';
import { BaseButton, BasicTextInput } from '@common/components';
import { useToggle } from '@common/hooks';
import { InputModal } from './InputModal';
import { NonNegativeNumberInputModal } from './NonNegativeNumberInputModal';
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
        onChange={() => alert(val)}
      />
    </Box>
  );
};

export const NonNegativeNumberInputModalExample = () => {
  const modalController = useToggle();

  return (
    <Box width={300}>
      <BaseButton onClick={modalController.toggleOn}>Open modal</BaseButton>
      <NonNegativeNumberInputModal
        initialValue={10}
        max={100}
        title="Enter a new tax rate"
        isOpen={modalController.isOn}
        onClose={modalController.toggleOff}
        onChange={async newValue => {
          await delay();
          alert(newValue);
        }}
      />
    </Box>
  );
};

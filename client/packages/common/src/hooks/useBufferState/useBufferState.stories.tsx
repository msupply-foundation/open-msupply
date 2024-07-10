import React, { FC, useState } from 'react';
import { StoryFn } from '@storybook/react';
import { useBufferState } from './useBufferState';
import { Box, TextField, Typography } from '@mui/material';
import { useDebounceCallback } from '@common/hooks';

export default {
  title: 'Hooks/useBufferState',
};

const UsingBufferState: FC<{
  value: string;
  setValue: (newVal: string) => void;
}> = ({ value, setValue }) => {
  const [buffer, setBuffer] = useBufferState(value);

  return (
    <TextField
      value={buffer}
      onChange={e => {
        setBuffer(e.target.value);
        setValue(e.target.value);
      }}
    />
  );
};

const Template: StoryFn = () => {
  const [val, setVal] = useState('');
  const debouncedCallback = useDebounceCallback(
    (val: string) => setVal(val),
    []
  );

  return (
    <Box gap={2} flexDirection="row" display="flex" alignItems="center">
      <Box display="flex" flexDirection="column" gap={4} flex={1}>
        <Typography>
          When editing the normal text field, the state is set instantly. When
          editing the text field using a buffered state, the internal state of
          the text input is set, but the top level state is lagged by the
          debounce.
        </Typography>
        <Box display="flex" flexDirection="column">
          <Typography>Normal text field</Typography>
          <TextField value={val} onChange={e => setVal(e.target.value)} />
        </Box>
        <Box display="flex" flexDirection="column">
          <Typography>Buffered text field</Typography>
          <UsingBufferState value={val} setValue={debouncedCallback} />
        </Box>
      </Box>
    </Box>
  );
};

export const UseBufferState = Template.bind({});

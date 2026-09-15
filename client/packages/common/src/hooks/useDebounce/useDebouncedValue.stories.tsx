import React, { useState } from 'react';
import { StoryFn } from '@storybook/react';
import { useDebouncedValue } from './useDebouncedValue';
import { Box, TextField, Typography } from '@mui/material';
import { useDebounceCallback } from './useDebounceCallback';
import { BaseButton } from '@common/components';

export default {
  title: 'Hooks/useDebounce',
};

const Value: StoryFn = () => {
  const [debounceTime, setDebounceTime] = useState(500);
  const [number, setNumber] = useState(0);
  const debouncedNumber = useDebouncedValue(number, debounceTime);

  return (
    <div>
      <p>{`State number: ${number}`}</p>
      <p>{`Debounced number: ${debouncedNumber}`}</p>
      <Box gap={2} flexDirection="row" display="flex" alignItems="center">
        <Typography> Debounced timer: </Typography>
        <TextField
          value={debounceTime}
          onChange={e => setDebounceTime(Number(e.target.value))}
        />
      </Box>
      <Box gap={2} mt={2} flexDirection="row" display="flex">
        <BaseButton onClick={() => setNumber(state => (state += 1))}>
          Increment
        </BaseButton>
        <BaseButton onClick={() => setNumber(state => (state -= 1))}>
          Decrement
        </BaseButton>
      </Box>
    </div>
  );
};

const Callback: StoryFn = () => {
  const [debounceTime, setDebounceTime] = useState(500);
  const [number, setNumber] = useState(0);
  const cb = useDebounceCallback(setNumber, [], debounceTime);

  return (
    <div>
      <p>{`State number: ${number}`}</p>
      <Box gap={2} flexDirection="row" display="flex" alignItems="center">
        <Typography> Debounced timer: </Typography>
        <TextField
          value={debounceTime}
          onChange={e => setDebounceTime(Number(e.target.value))}
        />
      </Box>
      <Box gap={2} mt={2} flexDirection="row" display="flex">
        <BaseButton onClick={() => cb(state => (state += 1))}>
          Increment
        </BaseButton>
        <BaseButton onClick={() => cb(state => (state -= 1))}>
          Decrement
        </BaseButton>
      </Box>
    </div>
  );
};

export const UseDebounceValue = Value.bind({});

export const UseDebounceCallback = Callback.bind({});

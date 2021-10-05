import React, { useState } from 'react';
import { Story } from '@storybook/react';
import { useDebouncedValue } from './useDebouncedValue';
import { TextField, Typography, Button } from '@mui/material';
import { Box } from '@mui/system';
import { useDebounceCallback } from '.';

export default {
  title: 'Hooks/useDebounce',
};

const Value: Story = () => {
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
        <Button
          variant="contained"
          onClick={() => setNumber(state => (state += 1))}
        >
          Increment
        </Button>
        <Button
          variant="contained"
          onClick={() => setNumber(state => (state -= 1))}
        >
          Decrement
        </Button>
      </Box>
    </div>
  );
};

const Callback: Story = () => {
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
        <Button variant="contained" onClick={() => cb(state => (state += 1))}>
          Increment
        </Button>
        <Button variant="contained" onClick={() => cb(state => (state -= 1))}>
          Decrement
        </Button>
      </Box>
    </div>
  );
};

export const UseDebounceValue = Value.bind({});

export const UseDebounceCallback = Callback.bind({});

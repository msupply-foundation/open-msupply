import React, { useState } from 'react';
import { Story } from '@storybook/react';
import { Box, TextField, Typography } from '@mui/material';
import { BaseButton } from '@common/components';
import { useInterval } from './useInterval';

export default {
  title: 'Hooks/useInterval',
};

const Interval: Story = () => {
  const [interval, setInterval] = useState(1000);
  const [count, setCount] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  useInterval(() => setCount(count + 1), isRunning ? interval : null);

  return (
    <div>
      <p>{`Count: ${count}`}</p>
      <Box gap={2} flexDirection="row" display="flex" alignItems="center">
        <Typography> Interval: </Typography>
        <TextField
          value={interval}
          onChange={e => setInterval(Number(e.target.value))}
        />
      </Box>
      <Box gap={2} mt={2} flexDirection="row" display="flex">
        <BaseButton onClick={() => setIsRunning(!isRunning)}>
          {isRunning ? 'Stop' : 'Start'}
        </BaseButton>
      </Box>
    </div>
  );
};

export const UseInterval = Interval.bind({});

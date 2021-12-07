import React from 'react';
import { Box, Typography } from '@mui/material';
import { useToggle } from './useToggle';
import { Story } from '@storybook/react';
import { BaseButton } from '@common/components';

export default {
  title: 'Hooks/useToggle',
};

const Template: Story = () => {
  const { isOn, toggle, toggleOn, toggleOff } = useToggle();

  return (
    <>
      <Box gap={2} display="flex" flexDirection="row">
        <BaseButton onClick={toggleOn}>On!</BaseButton>
        <BaseButton onClick={toggleOff}>Off!</BaseButton>
        <BaseButton color="secondary" onClick={toggle}>
          Switch!
        </BaseButton>
      </Box>
      <Box marginTop={2}>
        <Typography>isOn: {String(isOn)}</Typography>
      </Box>
    </>
  );
};

export const Primary = Template.bind({});

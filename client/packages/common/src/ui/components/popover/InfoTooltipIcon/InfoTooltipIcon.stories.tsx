import React from 'react';
import { Story } from '@storybook/react';
import { InfoTooltipIcon } from './InfoTooltipIcon';
import { Box } from '@mui/material';

export default {
  title: 'Popover/InfoTooltipIcon',
  component: InfoTooltipIcon,
};

const Example: Story = () => {
  return (
    <Box width="50px" height="50px">
      <InfoTooltipIcon title="Here is some very helpful text, explaining something!" />
    </Box>
  );
};

export const Primary = Example.bind({});

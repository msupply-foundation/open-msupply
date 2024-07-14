import React from 'react';
import { StoryFn } from '@storybook/react';
import { InfoTooltipIcon } from './InfoTooltipIcon';
import { Box } from '@mui/material';

export default {
  title: 'Popover/InfoTooltipIcon',
  component: InfoTooltipIcon,
};

const Example: StoryFn = () => {
  return (
    <Box width="50px" height="50px">
      <InfoTooltipIcon title="Here is some very helpful text, explaining something!" />
    </Box>
  );
};

export const Primary = Example.bind({});

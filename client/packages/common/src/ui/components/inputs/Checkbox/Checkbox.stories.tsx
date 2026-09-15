import React from 'react';
import { StoryFn, Meta } from '@storybook/react';

import { Checkbox } from './Checkbox';
import { Box } from '@mui/material';

export default {
  title: 'Inputs/Checkbox',
  component: Checkbox,
  argTypes: {
    backgroundColor: { control: 'color' },
  },
} as Meta<typeof Checkbox>;

const Template: StoryFn<typeof Checkbox> = args => (
  <Box>
    <Checkbox {...args} />
  </Box>
);

export const Primary = Template.bind({});

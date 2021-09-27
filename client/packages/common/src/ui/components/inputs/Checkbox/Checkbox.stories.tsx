import React from 'react';
import { ComponentStory, ComponentMeta } from '@storybook/react';

import { Checkbox } from './Checkbox';
import { Box } from '@mui/material';

export default {
  title: 'Inputs/Checkbox',
  component: Checkbox,
  argTypes: {
    backgroundColor: { control: 'color' },
  },
} as ComponentMeta<typeof Checkbox>;

const Template: ComponentStory<typeof Checkbox> = args => (
  <Box>
    <Checkbox {...args} />
  </Box>
);

export const Primary = Template.bind({});

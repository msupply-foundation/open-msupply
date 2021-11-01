import React from 'react';
import { ComponentStory, ComponentMeta } from '@storybook/react';

import { Select } from './Select';
import { Box } from '@mui/material';

export default {
  title: 'Inputs/Select',
  component: Select,
} as ComponentMeta<typeof Select>;

const Template: ComponentStory<typeof Select> = args => (
  <Box>
    <Select {...args} />
  </Box>
);

const toOption = (value: string) => ({ label: value, value });

export const Primary = Template.bind({});
Primary.args = { options: ['eenie', 'meenie', 'miney', 'mo'].map(toOption) };

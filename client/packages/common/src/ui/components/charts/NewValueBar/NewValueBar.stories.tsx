import React from 'react';
import { Box } from '@mui/material';
import { StoryFn, Meta } from '@storybook/react';
import { NewValueBar } from './NewValueBar';

const Template: StoryFn<typeof NewValueBar> = ({ value, total, colour }) => (
  <Box display="flex" width="25%">
    <NewValueBar value={value} total={total} colour={colour} />
  </Box>
);

export const Default = Template.bind({});
export const NoDividers = Template.bind({});
export const BothDividers = Template.bind({});

Default.args = {
  value: 10,
  total: 20,
  colour: 'gray.main',
};

NoDividers.args = {
  value: 10,
  total: 20,
  colour: 'gray.main',
};

BothDividers.args = {
  value: 10,
  total: 20,
  colour: 'gray.main',
};

export default {
  title: 'Charts/NewValueBar',
  component: NewValueBar,
} as Meta<typeof NewValueBar>;

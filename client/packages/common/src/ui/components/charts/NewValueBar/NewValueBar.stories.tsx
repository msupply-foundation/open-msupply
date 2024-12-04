import React from 'react';
import { Box } from '@mui/material';
import { StoryFn, Meta } from '@storybook/react';
import { NewValueBar } from './NewValueBar';

const Template: StoryFn<typeof NewValueBar> = ({ value, total, colour }) => (
  <Box display="flex" width="25%">
    <NewValueBar value={value} total={total} colour={colour} />
  </Box>
);

export const NewDefault = Template.bind({});
export const NewNoDividers = Template.bind({});
export const NewBothDividers = Template.bind({});

NewDefault.args = {
  value: 10,
  total: 20,
  colour: 'gray.main',
};

NewNoDividers.args = {
  value: 10,
  total: 20,
  colour: 'gray.main',
};

NewBothDividers.args = {
  value: 10,
  total: 20,
  colour: 'gray.main',
};

export default {
  title: 'Charts/ValueBar',
  component: NewValueBar,
} as Meta<typeof NewValueBar>;

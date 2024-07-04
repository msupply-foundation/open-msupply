import React from 'react';
import { Box } from '@mui/material';
import { StoryFn, Meta } from '@storybook/react';
import { ValueBar } from './ValueBar';

const Template: StoryFn<typeof ValueBar> = ({
  value,
  total,
  label,
  colour,
  startDivider,
  endDivider,
}) => (
  <Box display="flex" width="25%">
    <ValueBar
      value={value}
      total={total}
      label={label}
      colour={colour}
      startDivider={startDivider}
      endDivider={endDivider}
    />
  </Box>
);

export const Default = Template.bind({});
export const NoDividers = Template.bind({});
export const BothDividers = Template.bind({});

Default.args = {
  value: 10,
  total: 20,
  label: 'Stock on Hand',
  colour: 'gray.main',
};

NoDividers.args = {
  value: 10,
  total: 20,
  label: 'Stock on Hand',
  colour: 'gray.main',
  startDivider: false,
  endDivider: false,
};

BothDividers.args = {
  value: 10,
  total: 20,
  label: 'Stock on Hand',
  colour: 'gray.main',
  startDivider: true,
  endDivider: true,
};

export default {
  title: 'Charts/ValueBar',
  component: ValueBar,
} as Meta<typeof ValueBar>;

import React from 'react';
import { ComponentStory, ComponentMeta } from '@storybook/react';
import { InlineSpinner } from './InlineSpinner';
import { Box } from '@mui/material';

const Template: ComponentStory<typeof InlineSpinner> = ({ color }) => (
  <Box>
    <Box style={{ width: 250, height: 250, border: '1px solid green' }}></Box>
    <Box style={{ width: 250, height: 250, border: '1px solid orange' }}>
      <InlineSpinner color={color} />
    </Box>
    <Box style={{ width: 250, height: 250, border: '1px solid red' }}></Box>
  </Box>
);

export const Primary = Template.bind({});
export const Secondary = Template.bind({});

export default {
  title: 'Components/InlineSpinner',
  component: InlineSpinner,
} as ComponentMeta<typeof InlineSpinner>;

Primary.args = { color: 'primary' };
Secondary.args = { color: 'secondary' };

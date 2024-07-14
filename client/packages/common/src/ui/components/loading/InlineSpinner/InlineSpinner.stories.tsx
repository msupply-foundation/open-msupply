import React from 'react';
import { StoryFn, Meta } from '@storybook/react';
import { InlineSpinner } from './InlineSpinner';
import { Box } from '@mui/material';

const Template: StoryFn<typeof InlineSpinner> = ({
  color,
  messageKey,
}) => (
  <Box>
    <Box style={{ width: 250, height: 100, border: '1px solid green' }}>
      Showing three boxes, all 100 x 250px, with default flex alignment.
    </Box>
    <Box style={{ width: 250, height: 100, border: '1px solid orange' }}>
      <InlineSpinner color={color} messageKey={messageKey} />
    </Box>
    <Box style={{ width: 250, height: 100, border: '1px solid red' }}>
      Center box has the spinner in it showing how the spinner aligns itself
      within a flex box.
    </Box>
  </Box>
);

export const Primary = Template.bind({});
export const PrimaryWithText = Template.bind({});
export const Secondary = Template.bind({});
export const SecondaryWithText = Template.bind({});

export default {
  title: 'Components/InlineSpinner',
  component: InlineSpinner,
} as Meta<typeof InlineSpinner>;

Primary.args = { color: 'primary' };
PrimaryWithText.args = { color: 'primary', messageKey: 'loading' };
Secondary.args = { color: 'secondary' };
SecondaryWithText.args = { color: 'secondary', messageKey: 'loading' };

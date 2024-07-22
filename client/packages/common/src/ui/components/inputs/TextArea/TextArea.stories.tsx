import React from 'react';
import { StoryFn, Meta } from '@storybook/react';

import { TextArea } from './TextArea';
import { Box, Typography } from '@mui/material';

export default {
  title: 'Inputs/TextArea',
  component: TextArea,
  argTypes: {
    backgroundColor: { control: 'color' },
  },
} as Meta<typeof TextArea>;

const Template: StoryFn<typeof TextArea> = () => (
  <Box>
    <Box
      padding={2}
      display="flex"
      flexDirection="column"
      width={300}
      alignItems="center"
      bgcolor="#cdcdcd"
    >
      <Typography>Basic TextArea</Typography>
      <TextArea />
    </Box>
    <Box
      padding={2}
      display="flex"
      flexDirection="column"
      width={300}
      alignItems="center"
      bgcolor="#cdcdcd"
    >
      <Typography>TextArea with Value</Typography>
      <TextArea value="Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua." />
    </Box>
    <Box
      padding={2}
      display="flex"
      flexDirection="column"
      width={300}
      alignItems="center"
      bgcolor="#cdcdcd"
    >
      <Typography>Disabled TextArea</Typography>
      <TextArea
        value="Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."
        disabled
      />
    </Box>
  </Box>
);

export const Basic = Template.bind({});

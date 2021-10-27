import React from 'react';
import { ComponentStory, ComponentMeta } from '@storybook/react';

import { TextArea } from './TextArea';
import { Box, Typography } from '@mui/material';

export default {
  title: 'Inputs/TextArea',
  component: TextArea,
  argTypes: {
    backgroundColor: { control: 'color' },
  },
} as ComponentMeta<typeof TextArea>;

const Template: ComponentStory<typeof TextArea> = () => (
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
);

export const Primary = Template.bind({});

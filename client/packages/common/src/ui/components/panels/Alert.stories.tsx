import React from 'react';
import { StoryFn, Meta } from '@storybook/react';
import { Alert } from './Alert';
import { Box } from '@mui/material';

export default {
  title: 'Panels/Alert',
  component: Alert,
} as Meta<typeof Alert>;

const Template: StoryFn<typeof Alert> = () => (
  <Box sx={{ width: '80%' }} gap={2}>
    <Box paddingBottom={1} display="flex">
      <Alert severity="success">This is a success message</Alert>
    </Box>
    <Box paddingBottom={1} display="flex">
      <Alert severity="info">This is an info message</Alert>
    </Box>
    <Box paddingBottom={1} display="flex">
      <Alert severity="warning">This is a warning message</Alert>
    </Box>
    <Box paddingBottom={1} display="flex">
      <Alert severity="error">This is an error message</Alert>
    </Box>
  </Box>
);

export const Standard = Template.bind({});

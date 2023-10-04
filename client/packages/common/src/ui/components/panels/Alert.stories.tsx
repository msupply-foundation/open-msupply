import React from 'react';
import { ComponentStory, ComponentMeta } from '@storybook/react';
import { Alert } from './Alert';
import { Box } from '@mui/material';

export default {
  title: 'Panels/Alert',
  component: Alert,
} as ComponentMeta<typeof Alert>;

const Template: ComponentStory<typeof Alert> = () => (
  <Box sx={{ width: '80%' }} gap={2}>
    <Alert severity="success">This is a success message</Alert>
    <Alert severity="info">This is an info message</Alert>
    <Alert severity="warning">This is a warning message</Alert>
    <Alert severity="error">This is an error message</Alert>
  </Box>
);

export const Standard = Template.bind({});

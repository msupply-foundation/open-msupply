import React from 'react';
import { ComponentStory, ComponentMeta } from '@storybook/react';
import { InfoPanel } from './InfoPanel';
import { Box } from '@mui/material';

export default {
  title: 'Panels/InfoPanel',
  component: InfoPanel,
} as ComponentMeta<typeof InfoPanel>;

const Template: ComponentStory<typeof InfoPanel> = () => (
  <Box sx={{ width: '80%' }} gap={2}>
    <InfoPanel message="Some text can be shown here..." />
  </Box>
);

export const Standard = Template.bind({});

import React from 'react';
import { Box } from '@mui/material';
import { ComponentStory, ComponentMeta } from '@storybook/react';
import { TextButton } from './TextButton';

const Template: ComponentStory<typeof TextButton> = () => (
  <Box>
    <TextButton
      labelKey="button.docs"
      onClick={() => console.info('clicked')}
    />
  </Box>
);

export const Primary = Template.bind({});

export default {
  title: 'Buttons/TextButton',
  component: TextButton,
} as ComponentMeta<typeof TextButton>;

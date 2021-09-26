import React from 'react';
import { Box } from '@mui/material';
import { ComponentStory, ComponentMeta } from '@storybook/react';
import { Button } from './Button';
import { Book } from '../../icons';

const Template: ComponentStory<typeof Button> = () => (
  <Box>
    <Button
      shouldShrink
      icon={<Book />}
      labelKey="button.docs"
      onClick={() => alert('clicked')}
    />
  </Box>
);

export const Primary = Template.bind({});

export default {
  title: 'Buttons/Button',
  component: Button,
} as ComponentMeta<typeof Button>;

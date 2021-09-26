import React from 'react';
import { Box } from '@mui/material';
import { ComponentStory, ComponentMeta } from '@storybook/react';
import { IconButton } from './IconButton';
import { Book } from '../../icons';

const Template: ComponentStory<typeof IconButton> = () => (
  <Box>
    <IconButton
      icon={<Book />}
      titleKey="button.docs"
      onClick={() => console.info('clicked')}
    />
  </Box>
);

export const Primary = Template.bind({});

export default {
  title: 'Buttons/IconButton',
  component: IconButton,
} as ComponentMeta<typeof IconButton>;

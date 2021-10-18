import React from 'react';
import { Box } from '@mui/material';
import { ComponentStory, ComponentMeta } from '@storybook/react';
import { FlatButton } from './FlatButton';
import { BookIcon } from '../../icons';

const Template: ComponentStory<typeof FlatButton> = args => (
  <Box>
    <FlatButton
      {...args}
      icon={<BookIcon color={args.color} />}
      labelKey="button.docs"
      onClick={() => console.info('clicked')}
    />
  </Box>
);

export const Primary = Template.bind({});
export const Secondary = Template.bind({});

export default {
  title: 'Buttons/FlatButton',
  component: FlatButton,
} as ComponentMeta<typeof FlatButton>;

Secondary.args = { color: 'secondary' };

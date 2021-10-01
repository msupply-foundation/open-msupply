import React from 'react';
import { Box } from '@mui/material';
import { ComponentStory, ComponentMeta } from '@storybook/react';
import { DialogButton } from './DialogButton';
import { CheckIcon, XCircleIcon } from '../../icons';

const Template: ComponentStory<typeof DialogButton> = ({ color, icon }) => (
  <Box>
    <DialogButton
      color={color}
      icon={icon}
      labelKey="button.docs"
      onClick={() => alert('clicked')}
    />
  </Box>
);

export const Primary = Template.bind({});
export const Secondary = Template.bind({});

Primary.args = { color: 'primary', icon: <CheckIcon /> };
Secondary.args = { color: 'secondary', icon: <XCircleIcon /> };

export default {
  title: 'Buttons/DialogButton',
  component: DialogButton,
} as ComponentMeta<typeof DialogButton>;

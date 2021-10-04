import React from 'react';
import { Box } from '@mui/material';
import { ComponentStory, ComponentMeta } from '@storybook/react';
import { DialogButton } from './DialogButton';

const Template: ComponentStory<typeof DialogButton> = ({ variant }) => (
  <Box>
    <DialogButton variant={variant} onClick={() => alert('clicked')} />
  </Box>
);

export const Cancel = Template.bind({});
export const Ok = Template.bind({});
export const Next = Template.bind({});

Ok.args = { variant: 'ok' };
Cancel.args = { variant: 'cancel' };
Next.args = { variant: 'next' };

export default {
  title: 'Buttons/DialogButton',
  component: DialogButton,
} as ComponentMeta<typeof DialogButton>;

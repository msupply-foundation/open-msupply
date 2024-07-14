import React from 'react';
import { Box } from '@mui/material';
import { StoryFn, Meta } from '@storybook/react';
import { DialogButton } from './DialogButton';

const Template: StoryFn<typeof DialogButton> = ({
  disabled,
  variant,
}) => (
  <Box>
    <DialogButton
      variant={variant}
      onClick={() => alert('clicked')}
      disabled={disabled}
    />
  </Box>
);

export const Cancel = Template.bind({});
export const Ok = Template.bind({});
export const Next = Template.bind({});
export const DisabledOk = Template.bind({});
export const DisabledCancel = Template.bind({});

Ok.args = { variant: 'ok' };
Cancel.args = { variant: 'cancel' };
Next.args = { variant: 'next' };
DisabledOk.args = { variant: 'ok', disabled: true };
DisabledCancel.args = { variant: 'cancel', disabled: true };

export default {
  title: 'Buttons/DialogButton',
  component: DialogButton,
} as Meta<typeof DialogButton>;
